using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Booking.Admin;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Helpers;

namespace ParkMitra_BE.Services
{
    public class AdminBookingService
    {
        private readonly ApplicationDbContext _context;

        public AdminBookingService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<AdminPagedDto<AdminUserBookingDto>?> GetUserBookingsByIdAsync(Guid userId, int page, int limit)
        {
            if (!await _context.profiles.AnyAsync(p => p.user_id == userId)) return null;

            page = Math.Max(1, page);
            limit = Math.Clamp(limit, 1, 50);

            var query = _context.bookings.AsNoTracking()
                .Where(b => b.user_id == userId &&
                            (b.status == BookingStatus.Confirmed || b.status == BookingStatus.Cancelled));

            var total = await query.CountAsync();

            var items = await query
                .Include(b => b.space)
                .Include(b => b.vehicle)
                .OrderByDescending(b => b.created_at)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            return new AdminPagedDto<AdminUserBookingDto>
            {
                Data = items.Select(b => new AdminUserBookingDto
                {
                    Id = b.id,
                    SpotId = b.space_id,
                    SpotTitle = b.space_title,
                    VehicleNumber = b.vehicle?.registration_number,
                    BookingDate = b.booking_date,
                    StartTime = b.start_time,
                    EndTime = b.end_time,
                    TotalAmount = b.total_price,
                    Status = BookingStatusCalculator.Compute(b, b.space?.timezone).ToString().ToLowerInvariant()
                }).ToList(),
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = Math.Max(1, (int)Math.Ceiling(total / (double)limit))
            };
        }

        public async Task<List<AdminUserSpotDto>?> GetUserSpotsByIdAsync(Guid userId)
        {
            if (!await _context.profiles.AnyAsync(p => p.user_id == userId)) return null;

            return await _context.parking_spaces.AsNoTracking()
                .Where(s => s.user_id == userId)
                .OrderByDescending(s => s.created_at)
                .Select(s => new AdminUserSpotDto
                {
                    Id = s.id,
                    Title = s.title,
                    Address = s.address,
                    City = s.city.name,
                    PricePerHour = s.price_per_hour,
                    VerificationStatus = s.listing_status,
                    IsLive = s.available && s.listing_status == "approved",
                    CreatedAt = s.created_at
                })
                .ToListAsync();
        }
    }
}
