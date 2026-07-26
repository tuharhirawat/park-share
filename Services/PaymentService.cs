using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Payment;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Infrastructure.Clients;
using ParkMitra_BE.Models;
using System.Text.Json;

namespace ParkMitra_BE.Services
{
    public class PaymentService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPaymentGatewayClient _paymentGatewayClient;
        private readonly BookingService _bookingService;

        public PaymentService(
            ApplicationDbContext context,
            IPaymentGatewayClient paymentGatewayClient,
            BookingService bookingService)
        {
            _context = context;
            _paymentGatewayClient = paymentGatewayClient;
            _bookingService = bookingService;
        }

        public async Task<CreatePaymentOrderResultDto> CreatePaymentOrderAsync(Guid userId, Guid bookingId)
        {
            var payment = await _context.payments
                .FirstOrDefaultAsync(p => p.booking_id == bookingId && p.user_id == userId);

            if (payment == null || payment.total_payable == null)
                return new CreatePaymentOrderResultDto { Success = false, Message = "Booking not found." };

            if (payment.status != PaymentStatus.Pending)
                return new CreatePaymentOrderResultDto { Success = false, Message = "This booking is not awaiting payment." };

            var amountInPaise = (int)Math.Round(payment.total_payable.Value * 100, MidpointRounding.AwayFromZero);
            var receipt = $"bk_{bookingId.ToString("N")[..8]}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

            var response = await _paymentGatewayClient.CreateOrderAsync(
                amountInPaise, "INR", receipt, new { booking_id = bookingId, user_id = userId });

            if (!response.IsSuccessStatusCode)
                return new CreatePaymentOrderResultDto { Success = false, Message = "Failed to create payment order." };

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var orderId = doc.RootElement.GetProperty("id").GetString();

            payment.razorpay_order_id = orderId;
            payment.order_created_at = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new CreatePaymentOrderResultDto
            {
                Success = true,
                OrderId = orderId,
                KeyId = _paymentGatewayClient.KeyId,
                AmountInPaise = amountInPaise
            };
        }

        public async Task<ApiResponseDto> VerifyPaymentAsync(Guid userId, VerifyPaymentRequestDto dto)
        {
            var payment = await _context.payments
                .FirstOrDefaultAsync(p => p.booking_id == dto.BookingId && p.user_id == userId);

            if (payment?.status == PaymentStatus.Paid)
            {
                return new ApiResponseDto
                {
                    Success = true,
                    Message = "Booking already confirmed."
                };
            }

            if (payment == null || payment.razorpay_order_id != dto.RazorpayOrderId)
                return new ApiResponseDto { Success = false, Message = "Payment record not found." };

            if (!_paymentGatewayClient.VerifySignature(dto.RazorpayOrderId, dto.RazorpayPaymentId, dto.RazorpaySignature))
            {
                payment.status = PaymentStatus.Failed;
                payment.failure_reason = "signature_mismatch";
                await _context.SaveChangesAsync();
                return new ApiResponseDto { Success = false, Message = "Payment verification failed." };
            }

            var bookingEntity = await _context.bookings.FirstOrDefaultAsync(b => b.id == dto.BookingId);

            if (bookingEntity?.booking_date == null || bookingEntity.start_time == null || bookingEntity.end_time == null)
                return new ApiResponseDto { Success = false, Message = "Booking not found." };

            return await CompletePaymentAsync(
                payment,
                bookingEntity,
                dto.RazorpayPaymentId);
        }

        public async Task SyncPaymentStatusFromGatewayAsync(string requestBody)
        {
            using var document = JsonDocument.Parse(requestBody);

            var root = document.RootElement;

            var eventName = root.GetProperty("event").GetString();

            if (eventName != "payment.captured")
                return;

            var paymentEntity = root
                .GetProperty("payload")
                .GetProperty("payment")
                .GetProperty("entity");

            var razorpayOrderId = paymentEntity
                .GetProperty("order_id")
                .GetString();

            var razorpayPaymentId = paymentEntity
                .GetProperty("id")
                .GetString();

            if (string.IsNullOrWhiteSpace(razorpayOrderId) ||
                string.IsNullOrWhiteSpace(razorpayPaymentId))
            {
                return;
            }

            var payment = await _context.payments
                .FirstOrDefaultAsync(p => p.razorpay_order_id == razorpayOrderId);

            if (payment == null)
                return;

            if (payment.status == PaymentStatus.Paid)
                return;

            var booking = await _context.bookings
                .FirstOrDefaultAsync(b => b.id == payment.booking_id);

            if (booking == null)
                return;

            await CompletePaymentAsync(
                payment,
                booking,
                razorpayPaymentId);
        }

        private async Task<ApiResponseDto> CompletePaymentAsync(
            payment payment,
            booking bookingEntity,
            string razorpayPaymentId)
        {
            // safe check - if the payment s already completed
            if (payment.status == PaymentStatus.Paid)
            {
                return new ApiResponseDto
                {
                    Success = true,
                    Message = "Payment already processed."
                };
            }

            // Re-check capacity — the slot/vehicle may have been taken by someone else
            // while this payment was in progress. Exclude this booking's own pending row.
            var availability = await _bookingService.GetSpaceBookingAvailabilityAsync(
                bookingEntity.space_id,
                bookingEntity.booking_date!.Value,
                bookingEntity.start_time!.Value,
                bookingEntity.end_time!.Value,
                excludeBookingId: bookingEntity.id);

            var vehicleConflict = bookingEntity.vehicle_id.HasValue
                && availability.BookedVehicleIds.Contains(bookingEntity.vehicle_id.Value);

            var slotConflict = bookingEntity.slot_id.HasValue
                && availability.BookedSlotIds.Contains(bookingEntity.slot_id.Value);

            if (vehicleConflict || slotConflict)
            {
                await _paymentGatewayClient.CreateRefundAsync(razorpayPaymentId);

                payment.status = PaymentStatus.Refunded;
                payment.razorpay_payment_id = razorpayPaymentId;
                payment.refund_amount = payment.total_payable;
                payment.failure_reason = vehicleConflict
                    ? "vehicle_conflict"
                    : "slot_conflict";
                payment.verified_at = DateTime.UtcNow;

                bookingEntity.status = BookingStatus.Cancelled;
                bookingEntity.updated_at = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return new ApiResponseDto
                {
                    Success = false,
                    ErrorCode = vehicleConflict
                        ? "VEHICLE_CONFLICT"
                        : "SLOT_CONFLICT",
                    Message = "This was booked by someone else. Refund initiated."
                };
            }

            payment.status = PaymentStatus.Paid;
            payment.razorpay_payment_id = razorpayPaymentId;
            payment.payment_stage = "completed";
            payment.failure_reason = null;
            payment.verified_at = DateTime.UtcNow;

            bookingEntity.status = BookingStatus.Confirmed;
            bookingEntity.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new ApiResponseDto
            {
                Success = true,
                Message = "Booking confirmed!"
            };
        }

        public async Task MarkPaymentAbandonedAsync(Guid userId, Guid bookingId)
        {
            var payment = await _context.payments
                .FirstOrDefaultAsync(p => p.booking_id == bookingId && p.user_id == userId && p.status == PaymentStatus.Pending);

            if (payment == null) return;

            payment.status = PaymentStatus.Abandoned;
            payment.failure_reason = "user_closed_payment_modal";

            var bookingEntity = await _context.bookings
                .FirstOrDefaultAsync(b => b.id == bookingId && b.status == BookingStatus.Pending);

            if (bookingEntity != null)
            {
                bookingEntity.status = BookingStatus.PaymentAbandoned;
                bookingEntity.updated_at = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }

        public async Task MarkPaymentFailedAsync(Guid userId, Guid bookingId)
        {
            var payment = await _context.payments
                .FirstOrDefaultAsync(p => p.booking_id == bookingId && p.user_id == userId && p.status == PaymentStatus.Pending);

            if (payment == null) return;

            payment.status = PaymentStatus.Failed;
            payment.failure_reason = "gateway_failure";

            var bookingEntity = await _context.bookings
                .FirstOrDefaultAsync(b => b.id == bookingId && b.status == BookingStatus.Pending);

            if (bookingEntity != null)
            {
                bookingEntity.status = BookingStatus.PaymentFailed;
                bookingEntity.updated_at = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }
    }
}