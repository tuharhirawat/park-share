using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Booking;
using ParkMitra_BE.DTOs.Payment;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    public class BookingService
    {
        private readonly ApplicationDbContext _context;
        private readonly string _paymentGateway;
        private readonly PricingService _pricingService;

        public BookingService(
            ApplicationDbContext context,
            IConfiguration configuration,
            PricingService pricingService)
        {
            _context = context;
            _paymentGateway =
                configuration["PaymentGateway:Name"]
                ?? throw new InvalidOperationException("PaymentGateway Name is not configured.");
            _pricingService = pricingService;
        }

        public async Task<SpaceBookingAvailabilityDto> GetSpaceBookingAvailabilityAsync(
            Guid spaceId, DateOnly date, TimeOnly startTime, TimeOnly endTime, Guid? excludeBookingId = null)
        {
            var vehicleQuery = _context.bookings
                .Where(b => b.booking_date == date
                    && (b.status == BookingStatus.Pending || b.status == BookingStatus.Confirmed)
                    && b.start_time < endTime
                    && b.end_time > startTime
                    && b.vehicle_id != null);

            var slotQuery = _context.bookings
                .Where(b => b.space_id == spaceId
                    && b.booking_date == date
                    && (b.status == BookingStatus.Pending || b.status == BookingStatus.Confirmed)
                    && b.start_time < endTime
                    && b.end_time > startTime
                    && b.slot_id != null);

            if (excludeBookingId.HasValue)
            {
                vehicleQuery = vehicleQuery.Where(b => b.id != excludeBookingId.Value);
                slotQuery = slotQuery.Where(b => b.id != excludeBookingId.Value);
            }

            var bookedVehicleIds = await vehicleQuery.Select(b => b.vehicle_id!.Value).Distinct().ToListAsync();
            var bookedSlotIds = await slotQuery.Select(b => b.slot_id!.Value).Distinct().ToListAsync();

            return new SpaceBookingAvailabilityDto
            {
                BookedVehicleIds = bookedVehicleIds,
                BookedSlotIds = bookedSlotIds
            };
        }

        public async Task<CreateBookingResultDto> CreateBookingAsync(Guid userId, CreateBookingRequestDto dto)
        {
            var space = await _context.parking_spaces.FirstOrDefaultAsync(s => s.id == dto.SpaceId);

            var today = IsTodayInTimezone(dto.BookingDate, space.timezone);

            if (space == null || !space.available || space.listing_status != "approved")
            {
                return new CreateBookingResultDto { Success = false, Message = "This space is not available for booking." };
            }

            var vehicle = await _context.vehicles.FirstOrDefaultAsync(v => v.id == dto.VehicleId && v.user_id == userId);

            if (vehicle == null)
            {
                return new CreateBookingResultDto { Success = false, Message = "Selected vehicle not found." };
            }

            if (dto.EndTime <= dto.StartTime)
            {
                return new CreateBookingResultDto { Success = false, Message = "Invalid time range." };
            }

            var durationMinutes = (int)(dto.EndTime.ToTimeSpan() - dto.StartTime.ToTimeSpan()).TotalMinutes;

            var availability = await GetSpaceBookingAvailabilityAsync(dto.SpaceId, dto.BookingDate, dto.StartTime, dto.EndTime);

            if (availability.BookedVehicleIds.Contains(dto.VehicleId))
            {
                return new CreateBookingResultDto { Success = false, ErrorCode = "VEHICLE_CONFLICT", Message = "This vehicle already has a booking in this time range." };
            }

            if (dto.SlotId.HasValue && availability.BookedSlotIds.Contains(dto.SlotId.Value))
            {
                return new CreateBookingResultDto { Success = false, ErrorCode = "SLOT_CONFLICT", Message = "This slot was just booked. Please choose another." };
            }

            decimal basePrice;

            var isToday = IsTodayInTimezone(dto.BookingDate, space.timezone);

            if (dto.IsFullDay && !IsTodayInTimezone(dto.BookingDate, space.timezone))
            {
                basePrice = space.price_per_day ?? Math.Round(space.price_per_hour * 24m, MidpointRounding.AwayFromZero);
            }
            else
            {
                basePrice = Math.Round(space.price_per_hour * durationMinutes / 60m, MidpointRounding.AwayFromZero);
            }

            var pricing = _pricingService.Calculate(basePrice);
            var bookingId = Guid.NewGuid();

            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.bookings.Add(new booking
            {
                id = bookingId,
                user_id = userId,
                space_id = space.id,
                space_title = space.title,
                space_address = space.address,
                space_city = space.city,
                total_price = pricing.TotalPayable,
                status = BookingStatus.Pending,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                booking_date = dto.BookingDate,
                start_time = dto.StartTime,
                end_time = dto.EndTime,
                vehicle_type = dto.VehicleType,
                vehicle_id = dto.VehicleId,
                slot_id = dto.SlotId,
                original_duration_minutes = durationMinutes,
                has_used_free_extension = false,
                free_extension_minutes_used = 0,
                duration_minutes = durationMinutes
            });

            var paymentId = Guid.NewGuid();

            _context.payments.Add(new payment
            {
                id = paymentId,
                booking_id = bookingId,
                user_id = userId,
                amount = pricing.TotalPayable,
                currency = "INR",
                status = PaymentStatus.Pending,
                payment_type = "booking",
                base_price = pricing.BasePrice,
                host_payout = pricing.HostPayout,
                host_commission = pricing.HostCommission,
                platform_fee = pricing.ServiceFee,
                gst_amount = pricing.Gst,
                total_payable = pricing.TotalPayable,
                pricing_version = pricing.Version,
                payment_stage = "initiated",
                gateway_name = _paymentGateway,
                created_at = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new CreateBookingResultDto
            {
                Success = true,
                BookingId = bookingId,
                PaymentId = paymentId,
                TotalPayable = pricing.TotalPayable
            };
        }

        public async Task<List<MyBookingsDto>> GetMyBookingsAsync(Guid userId)
        {
            var bookings = await _context.bookings
                .Where(b => b.user_id == userId)
                .Where(b => b.status == BookingStatus.Confirmed || b.status == BookingStatus.Cancelled)
                .Include(b => b.space)
                .OrderByDescending(b => b.created_at)
                .ToListAsync();

            if (bookings.Count == 0)
                return new List<MyBookingsDto>();

            var bookingIds = bookings.Select(b => b.id).ToList();
            var spaceIds = bookings.Select(b => b.space_id).Distinct().ToList();

            var slotIds = bookings
                .Where(b => b.slot_id.HasValue)
                .Select(b => b.slot_id!.Value)
                .Distinct()
                .ToList();

            var vehicleIds = bookings
                .Where(b => b.vehicle_id.HasValue)
                .Select(b => b.vehicle_id!.Value)
                .Distinct()
                .ToList();

            var slots = await _context.parking_slots
                .Where(s => slotIds.Contains(s.id))
                .ToDictionaryAsync(s => s.id);

            var vehicles = await _context.vehicles
                .Where(v => vehicleIds.Contains(v.id))
                .ToDictionaryAsync(v => v.id);

            // One dictionary for reviews — replaces the old reviewedBookingIds/reviewedSet pair
            var myReviews = await _context.reviews
                .Where(r => bookingIds.Contains(r.booking_id))
                .ToDictionaryAsync(r => r.booking_id);

            // Latest APPROVED/PENDING title update per space
            var titleUpdates = await _context.parking_space_update_requests
                .Where(u => u.field == "title"
                    && spaceIds.Contains(u.space_id)
                    && (u.status == "APPROVED" || u.status == "PENDING"))
                .OrderByDescending(u => u.created_at)
                .ToListAsync();

            var latestTitleBySpace = titleUpdates
                .GroupBy(u => u.space_id)
                .ToDictionary(g => g.Key, g => g.First());

            return bookings.Select(b =>
            {
                var displayTitle = b.space_title;

                if (latestTitleBySpace.TryGetValue(b.space_id, out var update))
                {
                    displayTitle =
                        !string.IsNullOrEmpty(update.new_value) &&
                        !string.IsNullOrEmpty(update.old_value) &&
                        update.new_value != update.old_value
                            ? $"{update.new_value} (previously {update.old_value})"
                            : update.new_value ?? update.old_value ?? b.space_title;
                }

                myReviews.TryGetValue(b.id, out var review);

                return new MyBookingsDto
                {
                    Id = b.id,
                    SpaceId = b.space_id,
                    SpaceTitle = displayTitle,
                    SpaceAddress = b.space_address,
                    SpaceCity = b.space_city,
                    SpaceLat = b.space?.lat,
                    SpaceLng = b.space?.lng,
                    SpaceTimezone = b.space?.timezone ?? "Asia/Kolkata",
                    DurationMinutes = b.duration_minutes,
                    TotalPrice = b.total_price,
                    Status = b.status,
                    ComputedStatus = ComputeStatus(b),
                    BookingDate = b.booking_date,
                    StartTime = b.start_time,
                    EndTime = b.end_time,
                    CreatedAt = b.created_at,
                    VehicleType = b.vehicle_type,
                    VehicleId = b.vehicle_id,
                    VehicleNumber = b.vehicle_id.HasValue &&
                                    vehicles.TryGetValue(b.vehicle_id.Value, out var vehicle)
                                        ? vehicle.registration_number
                                        : null,
                    SlotId = b.slot_id,
                    SlotLabel = b.slot_id.HasValue &&
                                slots.TryGetValue(b.slot_id.Value, out var slot)
                                    ? slot.label
                                    : null,
                    HasUsedFreeExtension = b.has_used_free_extension,
                    FreeExtensionMinutesUsed = b.free_extension_minutes_used,
                    HasReview = review != null,
                    Rating = review?.rating,
                    ReviewText = review?.review_text,
                };
            }).ToList();
        }

        public async Task<RescheduleBookingResultDto> PreviewRescheduleAsync(
            Guid userId,
            RescheduleBookingRequestDto dto)
        {
            try
            {
                var result = await CalculateRescheduleAsync(userId, dto);

                return new RescheduleBookingResultDto
                {
                    Success = true,
                    PaymentRequired = result.Pricing.TotalPayable > 0,
                    ExtraMinutes = result.ExtraMinutes,
                    CurrentBookingPrice = result.CurrentBookingTotal,
                    ParkingExtensionCost = result.ParkingExtensionCost,
                    GraceApplied = result.GraceApplied,
                    GraceDiscount = result.GraceDiscount,
                    ServiceFee = result.Pricing.ServiceFee,
                    Gst = result.Pricing.Gst,
                    TotalPayable = result.Pricing.TotalPayable,
                    NewBookingTotal = result.NewBookingTotal,
                    CanUseFreeExtension = !result.Booking.has_used_free_extension,
                    NextHasUsedFreeExtension = result.Booking.has_used_free_extension,
                    Message = result.Pricing.TotalPayable == 0
                        ? "Booking can be rescheduled."
                        : "Payment required."
                };
            }
            catch (InvalidOperationException ex)
            {
                return new RescheduleBookingResultDto
                {
                    Success = false,
                    Message = ex.Message
                };
            }
        }

        public async Task<RescheduleBookingResultDto> ConfirmRescheduleAsync(Guid userId, RescheduleBookingRequestDto dto)
        {
            try
            {
                var result = await CalculateRescheduleAsync(userId, dto);
                var booking = result.Booking;

                if (result.Pricing.TotalPayable == 0)
                {
                    booking.booking_date = dto.BookingDate;
                    booking.start_time = dto.StartTime;
                    booking.end_time = dto.EndTime;
                    booking.duration_minutes = result.NewDurationMinutes;
                    booking.updated_at = DateTime.UtcNow;

                    if (result.GraceApplied)
                    {
                        booking.has_used_free_extension = true;
                        booking.free_extension_minutes_used = 10;
                    }

                    await _context.SaveChangesAsync();

                    return new RescheduleBookingResultDto
                    {
                        Success = true,
                        Message = "Booking rescheduled successfully.",
                        PaymentRequired = false,
                        ExtraMinutes = result.ExtraMinutes,
                        CurrentBookingPrice = result.CurrentBookingTotal,
                        NewBookingTotal = result.NewBookingTotal,
                    };
                }

                // Paid change — a completed payment must already exist for this exact amount
                var paidPayment = await _context.payments
                    .Where(p => p.booking_id == booking.id
                        && p.user_id == userId
                        && p.payment_type == "reschedule"
                        && p.status == PaymentStatus.Paid
                        && p.payment_stage != "applied"
                        && p.total_payable == result.Pricing.TotalPayable)
                    .OrderByDescending(p => p.verified_at)
                    .FirstOrDefaultAsync();

                if (paidPayment == null)
                {
                    await CreateOrUpdatePendingReschedulePaymentAsync(
                        userId,
                        booking,
                        result.Pricing);

                    var pendingPayment = await _context.payments
                        .FirstAsync(p =>
                            p.booking_id == booking.id &&
                            p.user_id == userId &&
                            p.payment_type == "reschedule" &&
                            p.status == PaymentStatus.Pending);

                    return new RescheduleBookingResultDto
                    {
                        Success = true,
                        PaymentRequired = true,
                        PaymentId = pendingPayment.id,
                        ExtraMinutes = result.ExtraMinutes,
                        CurrentBookingPrice = result.CurrentBookingTotal,
                        ParkingExtensionCost = result.ParkingExtensionCost,
                        GraceApplied = result.GraceApplied,
                        GraceDiscount = result.GraceDiscount,
                        ServiceFee = result.Pricing.ServiceFee,
                        Gst = result.Pricing.Gst,
                        TotalPayable = result.Pricing.TotalPayable,
                        NewBookingTotal = result.NewBookingTotal,
                        Message = "Payment required."
                    };
                }

                booking.booking_date = dto.BookingDate;
                booking.start_time = dto.StartTime;
                booking.end_time = dto.EndTime;
                booking.duration_minutes = result.NewDurationMinutes;
                booking.total_price = result.NewBookingTotal;
                booking.updated_at = DateTime.UtcNow;

                if (result.GraceApplied)
                {
                    booking.has_used_free_extension = true;
                    booking.free_extension_minutes_used = 10;
                }

                paidPayment.payment_stage = "applied"; // prevents replay of the same paid record

                await _context.SaveChangesAsync();

                return new RescheduleBookingResultDto
                {
                    Success = true,
                    Message = "Booking rescheduled successfully.",
                    PaymentRequired = false,
                    ExtraMinutes = result.ExtraMinutes,
                    CurrentBookingPrice = result.CurrentBookingTotal,
                    ParkingExtensionCost = result.ParkingExtensionCost,
                    GraceApplied = result.GraceApplied,
                    GraceDiscount = result.GraceDiscount,
                    ServiceFee = result.Pricing.ServiceFee,
                    Gst = result.Pricing.Gst,
                    TotalPayable = result.Pricing.TotalPayable,
                    NewBookingTotal = result.NewBookingTotal,
                };
            }
            catch (InvalidOperationException ex)
            {
                return new RescheduleBookingResultDto { Success = false, Message = ex.Message };
            }
        }

        public async Task<ApiResponseDto> CancelAsync(Guid userId, Guid bookingId)
        {
            var bookingEntity = await _context.bookings.FirstOrDefaultAsync(b => b.id == bookingId && b.user_id == userId);
            if (bookingEntity == null)
                return new ApiResponseDto { Success = false, Message = "Booking not found." };

            bookingEntity.status = BookingStatus.Cancelled;
            bookingEntity.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            
            return new ApiResponseDto { 
                Success = true, 
                Message = "Booking cancelled" 
            };
        }

        // helpers

        private async Task<(
            booking Booking,
            int NewDurationMinutes,
            int ExtraMinutes,
            decimal ParkingExtensionCost,
            decimal GraceDiscount,
            bool GraceApplied,
            PricingResultDto Pricing,
            decimal CurrentBookingTotal,
            decimal NewBookingTotal
        )>
        CalculateRescheduleAsync(
            Guid userId,
            RescheduleBookingRequestDto dto)
        {
            var booking = await _context.bookings
                .Include(b => b.space)
                .FirstOrDefaultAsync(b =>
                    b.id == dto.BookingId &&
                    b.user_id == userId);

            if (booking == null)
                throw new InvalidOperationException("Booking not found.");

            if (booking.status != BookingStatus.Confirmed)
                throw new InvalidOperationException("Only confirmed bookings can be rescheduled.");

            if (dto.EndTime <= dto.StartTime)
                throw new InvalidOperationException("End time must be after start time.");

            var newDurationMinutes =
                (int)(dto.EndTime.ToTimeSpan() - dto.StartTime.ToTimeSpan()).TotalMinutes;

            if (newDurationMinutes <= 0)
                throw new InvalidOperationException("Invalid booking duration.");

            var tz = TimeZoneInfo.FindSystemTimeZoneById(booking.space.timezone ?? "Asia/Kolkata");

            var nowInSpaceTz = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);

            // Ignore seconds and milliseconds since users select only HH:mm
            nowInSpaceTz = new DateTime(
                nowInSpaceTz.Year,
                nowInSpaceTz.Month,
                nowInSpaceTz.Day,
                nowInSpaceTz.Hour,
                nowInSpaceTz.Minute,
                0);

            var originalBookingStart = booking.booking_date!.Value.ToDateTime(booking.start_time ?? TimeOnly.MinValue);
            var bookingAlreadyStarted = originalBookingStart <= nowInSpaceTz;

            if (bookingAlreadyStarted)
            {
                // Active booking: start is fixed and legitimately in the past.
                // Only the new END time needs to still be in the future.
                var newBookingEnd = dto.BookingDate.ToDateTime(dto.EndTime);

                if (newBookingEnd <= nowInSpaceTz)
                    throw new InvalidOperationException("New end time must be after the current time.");
            }
            else
            {
                // Not started yet: this is a genuine reschedule — new start must be future.
                var bookingStart = dto.BookingDate.ToDateTime(dto.StartTime);

                if (bookingStart < nowInSpaceTz)
                    throw new InvalidOperationException("Cannot reschedule to a past time.");
            }

            var availability =
                await GetSpaceBookingAvailabilityAsync(
                    booking.space_id,
                    dto.BookingDate,
                    dto.StartTime,
                    dto.EndTime,
                    booking.id);

            if (booking.vehicle_id.HasValue &&
                availability.BookedVehicleIds.Contains(booking.vehicle_id.Value))
            {
                throw new InvalidOperationException(
                    "This vehicle already has another booking during the selected time.");
            }

            if (booking.slot_id.HasValue &&
                availability.BookedSlotIds.Contains(booking.slot_id.Value))
            {
                throw new InvalidOperationException(
                    "This parking slot has already been booked.");
            }

            var extraMinutes =
                newDurationMinutes - booking.duration_minutes;

            decimal parkingExtensionCost = 0;

            if (extraMinutes > 0)
            {
                parkingExtensionCost =
                    Math.Round(
                        (extraMinutes / 60m) * booking.space.price_per_hour,
                        MidpointRounding.AwayFromZero);
            }

            decimal payableParkingExtensionCost = parkingExtensionCost;
            decimal graceDiscount = 0;
            bool graceApplied = false;

            if (dto.ApplyGraceExtension &&
                extraMinutes >= 30 &&
                parkingExtensionCost > 0 &&
                !booking.has_used_free_extension)
            {
                graceApplied = true;

                graceDiscount =
                    Math.Round(
                        (10m / 60m) * booking.space.price_per_hour,
                        MidpointRounding.AwayFromZero);

                payableParkingExtensionCost =
                    Math.Max(0, parkingExtensionCost - graceDiscount);
            }

            var pricing = _pricingService.Calculate(payableParkingExtensionCost);

            decimal currentBookingTotal = booking.total_price;

            decimal newBookingTotal = booking.total_price + pricing.TotalPayable;

            return (
                booking,
                newDurationMinutes,
                extraMinutes,
                parkingExtensionCost,
                graceDiscount,
                graceApplied,
                pricing,
                currentBookingTotal,
                newBookingTotal
            );
        }

        private async Task<Guid> CreateOrUpdatePendingReschedulePaymentAsync(
            Guid userId,
            booking booking,
            PricingResultDto pricing)
        {
            var existingPayment = await _context.payments
                .FirstOrDefaultAsync(p =>
                    p.booking_id == booking.id &&
                    p.payment_type == "reschedule" &&
                    p.status == PaymentStatus.Pending);

            if (existingPayment != null)
            {
                existingPayment.amount = pricing.TotalPayable;
                existingPayment.base_price = pricing.BasePrice;
                existingPayment.host_payout = pricing.HostPayout;
                existingPayment.host_commission = pricing.HostCommission;
                existingPayment.platform_fee = pricing.ServiceFee;
                existingPayment.gst_amount = pricing.Gst;
                existingPayment.total_payable = pricing.TotalPayable;
                existingPayment.pricing_version = pricing.Version;

                await _context.SaveChangesAsync();

                return existingPayment.id;
            }

            var paymentId = Guid.NewGuid();

            _context.payments.Add(new payment
            {
                id = paymentId,
                booking_id = booking.id,
                user_id = userId,
                amount = pricing.TotalPayable,
                currency = "INR",
                status = PaymentStatus.Pending,
                payment_type = "reschedule",
                base_price = pricing.BasePrice,
                host_payout = pricing.HostPayout,
                host_commission = pricing.HostCommission,
                platform_fee = pricing.ServiceFee,
                gst_amount = pricing.Gst,
                total_payable = pricing.TotalPayable,
                pricing_version = pricing.Version,
                payment_stage = "initiated",
                gateway_name = _paymentGateway,
                created_at = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return paymentId;
        }

        private static ComputedBookingStatus ComputeStatus(booking b)
        {
             if (b.status == BookingStatus.Cancelled)
                return ComputedBookingStatus.Cancelled;

            if (b.booking_date is null)
                return ComputedBookingStatus.Upcoming;

            var tz = TimeZoneInfo.FindSystemTimeZoneById(b.space?.timezone ?? "Asia/Kolkata");
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            var bookingDate = b.booking_date.Value.ToDateTime(TimeOnly.MinValue);

            var start = bookingDate.Add((b.start_time ?? TimeOnly.MinValue).ToTimeSpan());
            var end = b.end_time is not null
                ? bookingDate.Add(b.end_time.Value.ToTimeSpan())
                : start.AddMinutes(b.duration_minutes);

            if (now < start) return ComputedBookingStatus.Upcoming;
            if (now <= end) return ComputedBookingStatus.Active;
            return ComputedBookingStatus.Completed;
        }

        private static bool IsTodayInTimezone(DateOnly date, string timezoneId)
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
                var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
                return DateOnly.FromDateTime(nowLocal) == date;
            }
            catch
            {
                return date == DateOnly.FromDateTime(DateTime.UtcNow);
            }
        }
    }
}