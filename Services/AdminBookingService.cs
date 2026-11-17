using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Booking.Admin;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Helpers;
using ParkMitra_BE.Models;
using ParkMitra_BE.Mappers;

namespace ParkMitra_BE.Services
{
    public class AdminBookingService
    {
        private readonly ApplicationDbContext _context;

        public AdminBookingService(ApplicationDbContext context)
        {
            _context = context;
        }

        private sealed record BookingRow(booking B, ComputedBookingStatus Status);

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

        public async Task<AdminBookingsPageDto> GetAllBookingsAsync(AdminBookingsRequestDto f)
        {
            var page = Math.Max(1, f.Page);
            var limit = Math.Clamp(f.Limit, 1, 50);
            var desc = !string.Equals(f.SortOrder, "asc", StringComparison.OrdinalIgnoreCase);

            var baseQuery = _context.bookings.AsNoTracking()
                .Where(b => b.status == BookingStatus.Confirmed || b.status == BookingStatus.Cancelled);

            var entities = await ApplyFilters(baseQuery, f)
                .Include(b => b.space).ThenInclude(s => s.user)
                .Include(b => b.user)
                .Include(b => b.vehicle)
                .Include(b => b.slot)
                .ToListAsync();

            var rows = entities
                .Select(b => new BookingRow(b, BookingStatusCalculator.Compute(b, b.space?.timezone)))
                .ToList();

            var counts = new AdminBookingCountsDto
            {
                All = rows.Count,
                Upcoming = rows.Count(r => r.Status == ComputedBookingStatus.Upcoming),
                Active = rows.Count(r => r.Status == ComputedBookingStatus.Active),
                Completed = rows.Count(r => r.Status == ComputedBookingStatus.Completed),
                Cancelled = rows.Count(r => r.Status == ComputedBookingStatus.Cancelled)
            };

            IEnumerable<BookingRow> filtered = rows;
            if (TryParseStatus(f.Status, out var wanted))
                filtered = rows.Where(r => r.Status == wanted);

            var ordered = Sort(filtered, f.SortBy, desc).ThenBy(r => r.B.id).ToList();
            var total = ordered.Count;

            return new AdminBookingsPageDto
            {
                Data = ordered.Skip((page - 1) * limit).Take(limit)
                    .Select(r => AdminBookingMapper.MapBooking<AdminBookingListItemDto>(r.B, r.Status)).ToList(),
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = Math.Max(1, (int)Math.Ceiling(total / (double)limit)),
                Counts = counts
            };
        }

        public async Task<AdminBookingDetailDto?> GetBookingByIdAsync(Guid id)
        {
            var b = await _context.bookings.AsNoTracking()
                .Include(x => x.space).ThenInclude(s => s.user)
                .Include(x => x.user)
                .Include(x => x.vehicle)
                .Include(x => x.slot)
                .Include(x => x.payments)
                .FirstOrDefaultAsync(x => x.id == id &&
                    (x.status == BookingStatus.Confirmed || x.status == BookingStatus.Cancelled));

            if (b == null) return null;

            var dto = AdminBookingMapper.MapBooking<AdminBookingDetailDto>(b, BookingStatusCalculator.Compute(b, b.space?.timezone));

            dto.DriverEmail = b.user?.email;
            dto.SpaceAddress = b.space_address;
            dto.OwnerMobile = b.space?.user?.mobile_number;
            dto.OwnerEmail = b.space?.user?.email;
            dto.Payments = b.payments
                .OrderBy(p => p.created_at)
                .Select(p => new AdminBookingPaymentDto
                {
                    Id = p.id,
                    Type = p.payment_type,
                    Status = p.status.ToString().ToLowerInvariant(),
                    BasePrice = p.base_price,
                    HostCommission = p.host_commission,
                    PlatformFee = p.platform_fee,
                    Gst = p.gst_amount,
                    HostPayout = p.host_payout,
                    TotalPayable = p.total_payable,
                    RefundAmount = p.refund_amount,
                    CreatedAt = p.created_at,
                    VerifiedAt = p.verified_at
                })
                .ToList();

            return dto;
        }

        public async Task<List<string>> GetBookingCitiesForUserAsync()
        {
            var bookingCities = await _context.bookings.AsNoTracking()
                .Where(b => b.status == BookingStatus.Confirmed || b.status == BookingStatus.Cancelled)
                .Select(b => b.space_city)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            return bookingCities;
        }

        // ----- helpers -----

        private static IQueryable<booking> ApplyFilters(IQueryable<booking> q, AdminBookingsRequestDto f)
        {
            if (!string.IsNullOrWhiteSpace(f.Search))
            {
                var term = f.Search.Trim();
                var like = $"%{term}%";
                var idPrefix = (term.StartsWith("BK-", StringComparison.OrdinalIgnoreCase) ? term[3..] : term)
                    .ToLowerInvariant() + "%";

                q = q.Where(b =>
                    EF.Functions.ILike(b.id.ToString(), idPrefix) ||
                    EF.Functions.ILike(b.space_title, like) ||
                    EF.Functions.ILike(b.space_city, like) ||
                    (b.user.full_name != null && EF.Functions.ILike(b.user.full_name, like)) ||
                    (b.user.mobile_number != null && EF.Functions.ILike(b.user.mobile_number, like)) ||
                    (b.user.email != null && EF.Functions.ILike(b.user.email, like)) ||
                    (b.vehicle != null && b.vehicle.registration_number != null &&
                        EF.Functions.ILike(b.vehicle.registration_number, like)) ||
                    (b.space.user.full_name != null && EF.Functions.ILike(b.space.user.full_name, like)));
            }

            if (!string.IsNullOrWhiteSpace(f.City))
            {
                var city = f.City.Trim().ToLower();
                q = q.Where(b => b.space_city.ToLower() == city);
            }

            if (Enum.TryParse<VehicleType>(f.VehicleType, true, out var vehicleType))
                q = q.Where(b => b.vehicle_type == vehicleType);

            if (f.DateFrom.HasValue) q = q.Where(b => b.booking_date >= f.DateFrom.Value);
            if (f.DateTo.HasValue) q = q.Where(b => b.booking_date <= f.DateTo.Value);

            return q;
        }

        private static bool TryParseStatus(string? value, out ComputedBookingStatus status)
        {
            status = default;
            return !string.IsNullOrWhiteSpace(value)
                && !value.Equals("all", StringComparison.OrdinalIgnoreCase)
                && Enum.TryParse(value, true, out status)
                && Enum.IsDefined(status);
        }

        private static IOrderedEnumerable<BookingRow> By<TKey>(
            IEnumerable<BookingRow> src, Func<BookingRow, TKey> key, bool desc, IComparer<TKey>? cmp = null) =>
            desc ? src.OrderByDescending(key, cmp) : src.OrderBy(key, cmp);

        private static IOrderedEnumerable<BookingRow> Sort(IEnumerable<BookingRow> rows, string? sortBy, bool desc)
        {
            var text = StringComparer.OrdinalIgnoreCase;

            return (sortBy ?? string.Empty).ToLowerInvariant() switch
            {
                "createdat" => By(rows, r => r.B.created_at, desc),
                "driver" => By(rows, r => r.B.user?.full_name ?? string.Empty, desc, text),
                "vehicle" => By(rows, r => r.B.vehicle?.registration_number ?? string.Empty, desc, text),
                "space" => By(rows, r => r.B.space_title, desc, text),
                "owner" => By(rows, r => r.B.space?.user?.full_name ?? string.Empty, desc, text),
                "city" => By(rows, r => r.B.space_city, desc, text),
                "slot" => By(rows, r => SlotKey(r.B.slot?.label), desc),
                "amount" => By(rows, r => r.B.total_price, desc),
                "status" => By(rows, r => StatusRank(r.Status), desc),
                _ => By(rows, r => StartInstant(r.B), desc)
            };
        }

        private static DateTime StartInstant(booking b) =>
            b.booking_date?.ToDateTime(b.start_time ?? TimeOnly.MinValue) ?? DateTime.MinValue;

        private static int StatusRank(ComputedBookingStatus s) => s switch
        {
            ComputedBookingStatus.Active => 0,
            ComputedBookingStatus.Upcoming => 1,
            ComputedBookingStatus.Completed => 2,
            _ => 3
        };

        private static (string Prefix, int Number) SlotKey(string? label)
        {
            if (string.IsNullOrEmpty(label)) return (string.Empty, 0);
            var i = label.Length;
            while (i > 0 && char.IsDigit(label[i - 1])) i--;
            return (label[..i].ToUpperInvariant(), int.TryParse(label[i..], out var n) ? n : 0);
        }
    }
}
