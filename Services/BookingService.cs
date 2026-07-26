using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Booking;
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

            _context.payments.Add(new payment
            {
                id = Guid.NewGuid(),
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

            var reviewedBookingIds = await _context.reviews
                .Where(r => bookingIds.Contains(r.booking_id))
                .Select(r => r.booking_id)
                .ToListAsync();

            var reviewedSet = reviewedBookingIds.ToHashSet();

            return bookings.Select(b =>
            {
                var displayTitle = b.space_title;
                if (latestTitleBySpace.TryGetValue(b.space_id, out var update))
                {
                    displayTitle = !string.IsNullOrEmpty(update.new_value) && !string.IsNullOrEmpty(update.old_value)
                        && update.new_value != update.old_value
                        ? $"{update.new_value} (previously {update.old_value})"
                        : update.new_value ?? update.old_value ?? b.space_title;
                }

                return new MyBookingsDto
                {
                    Id = b.id,
                    SpaceId = b.space_id,
                    SpaceTitle = displayTitle,
                    SpaceAddress = b.space_address,
                    SpaceCity = b.space_city,
                    SpaceLat = b.space?.lat,
                    SpaceLng = b.space?.lng,
                    DurationMinutes = b.duration_minutes,
                    TotalPrice = b.total_price,
                    Status = b.status,
                    ComputedStatus = ComputeStatus(b),
                    BookingDate = b.booking_date,
                    StartTime = b.start_time,
                    EndTime = b.end_time,
                    CreatedAt = b.created_at,
                    VehicleId = b.vehicle_id,
                    SlotId = b.slot_id,
                    HasUsedFreeExtension = b.has_used_free_extension,
                    FreeExtensionMinutesUsed = b.free_extension_minutes_used,
                    HasReview = reviewedSet.Contains(b.id)
                };
            }).ToList();
        }

        // helpers
        private static ComputedBookingStatus ComputeStatus(booking b)
        {
            if (b.status == BookingStatus.Cancelled)
                return ComputedBookingStatus.Cancelled;

            if (b.booking_date is null)
                return ComputedBookingStatus.Upcoming;

            var now = DateTime.Now; // see note below re: timezone
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