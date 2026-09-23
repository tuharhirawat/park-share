using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Host;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Helpers;
using ParkMitra_BE.Models;
using ParkMitra_BE.Mappers;

namespace ParkMitra_BE.Services
{
    public class HostService
    {
        private readonly ApplicationDbContext _context;

        public HostService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponseDto> BecomeHostAsync(Guid userId)
        {
            var profile = await _context.profiles
                .FirstOrDefaultAsync(p => p.user_id == userId);

            if (profile == null)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Profile not found."
                };
            }

            if (string.IsNullOrWhiteSpace(profile.mobile_number))
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Please add your mobile number before becoming a host."
                };
            }

            if (!profile.is_phone_verified)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Please verify your mobile number before becoming a host."
                };
            }

            var existingHost = await _context.hosts
                .FirstOrDefaultAsync(h => h.user_id == userId);

            if (existingHost != null)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "You are already a host."
                };
            }

            profile.is_host = true;

            _context.hosts.Add(new host
            {
                id = Guid.NewGuid(),
                user_id = userId,
                joined_at = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return new ApiResponseDto
            {
                Success = true,
                Message = "Welcome aboard! You're now a host."
            };
        }

        public async Task<HostDashboardDto> GetDashboardSummaryAsync(
            Guid userId,
            int page = 1,
            int pageSize = 10)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            var spacesQuery = _context.parking_spaces.Where(s => s.user_id == userId && s.listing_status == "approved");

            var totalSpaces = await spacesQuery.CountAsync();

            var approvedSpaceIds = await spacesQuery
                .Select(s => s.id)
                .ToListAsync();

            var totalBookings = 0;
            decimal totalEarnings = 0;

            if (approvedSpaceIds.Count > 0)
            {
                var allSpaces = await spacesQuery.ToListAsync();
                var timezoneBySpaceId = allSpaces.ToDictionary(s => s.id, s => s.timezone);

                var allBookings = await _context.bookings
                    .Where(b => approvedSpaceIds.Contains(b.space_id))
                    .ToListAsync();
                totalBookings = allBookings.Count;

                foreach (var booking in allBookings)
                {
                    var computedStatus = BookingStatusCalculator.Compute(
                        booking, timezoneBySpaceId.GetValueOrDefault(booking.space_id));

                    if (computedStatus != ComputedBookingStatus.Cancelled)
                    {
                        totalEarnings += booking.total_price;
                    }
                }
            }

            var averageRating = approvedSpaceIds.Count == 0
                ? 0
                : await _context.reviews
                    .Where(r => approvedSpaceIds.Contains(r.space_id))
                    .AverageAsync(r => (decimal?)r.rating) ?? 0;

            var spaces = await spacesQuery
                .OrderByDescending(s => s.created_at)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var statsBySpace = new Dictionary<Guid, HostSpaceStatsDto>();

            if (spaces.Count > 0)
            {
                var spaceIds = spaces
                    .Select(s => s.id)
                    .ToList();

                var spaceTimezoneById = spaces.ToDictionary(s => s.id, s => s.timezone);

                var bookingRows = await _context.bookings
                    .Where(b => spaceIds.Contains(b.space_id))
                    .ToListAsync();

                statsBySpace = spaceIds.ToDictionary(id => id, id => new HostSpaceStatsDto());

                foreach (var b in bookingRows)
                {
                    var computed = BookingStatusCalculator.Compute(
                        b, spaceTimezoneById.GetValueOrDefault(b.space_id));

                    var stats = statsBySpace[b.space_id];

                    stats.TotalBookings++;

                    if (computed != ComputedBookingStatus.Cancelled)
                        stats.Earnings += b.total_price;

                    if (computed == ComputedBookingStatus.Active)
                        stats.ActiveNow++;

                    if (computed == ComputedBookingStatus.Upcoming)
                        stats.UpcomingCount++;
                }
            }

            var items = spaces.Select(s =>
            {
                var dto = HostMapper.MapSpace(s, statsBySpace[s.id]);

                dto.TitleCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_title_change_at);
                dto.CityCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_city_change_at);
                dto.AddressCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_address_change_at);
                dto.FeaturesCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_feature_change_at);
                dto.PricePerHourCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_price_per_hour_change_at);
                dto.PricePerDayCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_price_per_day_change_at);

                return dto;
            }).ToList();


            return new HostDashboardDto
            {
                TotalSpaces = totalSpaces,
                TotalBookings = totalBookings,
                TotalEarnings = totalEarnings,
                AverageRating = averageRating,
                Spaces = new PagedResultDto<HostSpaceDto>
                {
                    Items = items,
                    TotalCount = totalSpaces,
                    Page = page,
                    PageSize = pageSize
                }
            };
        }

        public async Task<AddSlotResultDto> AddSlotAsync(Guid userId, AddSlotRequestDto dto)
        {
            var ownsSpace = await _context.parking_spaces
                .AnyAsync(s => s.id == dto.SpaceId && s.user_id == userId);

            if (!ownsSpace)
                return new AddSlotResultDto { Success = false, Message = "Listing not found." };

            var existingLabels = await _context.parking_slots
                .Where(s => s.space_id == dto.SpaceId && s.vehicle_type == dto.VehicleType)
                .Select(s => s.label)
                .ToListAsync();

            var nextNumber = existingLabels
                .Select(label =>
                {
                    var parts = label.Split('-');
                    return parts.Length > 1 && int.TryParse(parts[1], out var n) ? n : 0;
                })
                .DefaultIfEmpty(0)
                .Max() + 1;

            var prefix = dto.VehicleType == VehicleType.Car ? "C" : "B";
            var newLabel = $"{prefix}-{nextNumber}";

            var slot = new parking_slot
            {
                id = Guid.NewGuid(),
                space_id = dto.SpaceId,
                label = newLabel,
                vehicle_type = dto.VehicleType,
                is_active = true,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            _context.parking_slots.Add(slot);
            await _context.SaveChangesAsync();

            return new AddSlotResultDto
            {
                Success = true,
                Message = $"Slot {newLabel} added",
                Slot = HostMapper.MapSlot(slot)
            };
        }

        /// <summary> ///
        /// not in use ///
        /// </summary> ///
        //public async Task<ApiResponseDto> DeleteSlotAsync(Guid userId, Guid slotId)
        //{
        //    var slot = await _context.parking_slots.FirstOrDefaultAsync(s => s.id == slotId);
        //    if (slot == null)
        //        return new ApiResponseDto { Success = false, Message = "Slot not found." };

        //    var ownsSpace = await _context.parking_spaces
        //        .AnyAsync(s => s.id == slot.space_id && s.user_id == userId);

        //    if (!ownsSpace)
        //        return new ApiResponseDto { Success = false, Message = "Slot not found." };

        //    _context.parking_slots.Remove(slot);
        //    await _context.SaveChangesAsync();

        //    return new ApiResponseDto { Success = true, Message = "Slot removed" };
        //}

        public async Task<ApiResponseDto> ToggleSlotAvailabilityAsync(Guid userId, Guid slotId)
        {
            var slot = await _context.parking_slots.FirstOrDefaultAsync(s => s.id == slotId);
            if (slot == null)
                return new ApiResponseDto { Success = false, Message = "Slot not found." };

            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s => s.id == slot.space_id && s.user_id == userId);

            if (space == null)
                return new ApiResponseDto { Success = false, Message = "Slot not found." };

            if (slot.is_active)
            {
                var slotVehicleType = slot.vehicle_type;

                var candidateBookings = await _context.bookings
                    .Where(b => b.space_id == slot.space_id && b.status != BookingStatus.Cancelled)
                    .ToListAsync();

                var inUse = candidateBookings.Any(b =>
                    b.vehicle_type == slotVehicleType &&
                    IsBookingActiveNow(b, space.timezone));

                if (inUse)
                    return new ApiResponseDto { Success = false, Message = $"Slot {slot.label} is currently in use" };
            }

            slot.is_active = !slot.is_active;
            slot.updated_at = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new ApiResponseDto { Success = true, Message = "Slot updated" };
        }

        public async Task<ApiResponseDto> ToggleAvailabilityAsync(Guid userId, Guid spaceId, bool available)
        {
            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s => s.id == spaceId && s.user_id == userId);

            if (space == null)
                return new ApiResponseDto { Success = false, Message = "Listing not found." };

            space.available = available;
            space.updated_at = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new ApiResponseDto { Success = true, Message = available ? "Space enabled" : "Space disabled" };
        }

        public async Task<List<EarningsTrendPointDto>> GetSpaceEarningsTrendAsync(Guid userId, Guid spaceId)
        {
            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s => s.id == spaceId && s.user_id == userId);
            if (space == null) return new List<EarningsTrendPointDto>();

            var sixMonthsAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6));
            var bookings = await _context.bookings
                .Where(b => b.space_id == spaceId && b.booking_date >= sixMonthsAgo)
                .ToListAsync();

            var points = new List<EarningsTrendPointDto>();
            for (int i = 5; i >= 0; i--)
            {
                var month = DateTime.UtcNow.AddMonths(-i);
                var key = month.ToString("yyyy-MM");
                var sum = bookings
                    .Where(b => b.booking_date.HasValue
                        && b.booking_date.Value.ToString("yyyy-MM") == key
                        && BookingStatusCalculator.Compute(b, space.timezone) != ComputedBookingStatus.Cancelled)
                    .Sum(b => b.total_price);

                points.Add(new EarningsTrendPointDto { Month = month.ToString("MMM"), Earnings = sum });
            }
            return points;
        }

        public async Task<List<PeakHourDto>> GetSpacePeakHoursAsync(Guid userId, Guid spaceId)
        {
            var ownsSpace = await _context.parking_spaces
                .AnyAsync(s => s.id == spaceId && s.user_id == userId);
            if (!ownsSpace) return new List<PeakHourDto>();

            var bookings = await _context.bookings
                .Where(b => b.space_id == spaceId && b.status != BookingStatus.Cancelled && b.start_time != null)
                .ToListAsync();

            var counts = bookings
                .GroupBy(b => b.start_time!.Value.Hour)
                .ToDictionary(g => g.Key, g => g.Count());

            return Enumerable.Range(0, 24)
                .Select(h => new PeakHourDto { Hour = h.ToString("D2"), Bookings = counts.GetValueOrDefault(h) })
                .ToList();
        }

        // helpers

        private static bool IsBookingActiveNow(booking b, string? timezoneId)
        {
            if (b.booking_date is null || b.start_time is null) return false;

            var tz = TimeZoneInfo.FindSystemTimeZoneById(timezoneId ?? "Asia/Kolkata");
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);

            var bookingDate = b.booking_date.Value.ToDateTime(TimeOnly.MinValue);
            var start = bookingDate.Add(b.start_time.Value.ToTimeSpan());
            var end = b.end_time is not null
                ? bookingDate.Add(b.end_time.Value.ToTimeSpan())
                : start.AddMinutes(b.duration_minutes);

            return now >= start && now <= end;
        }
    }
}