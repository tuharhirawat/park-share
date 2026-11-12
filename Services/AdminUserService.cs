using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Admin;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Helpers;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services;

public class AdminUserService
{
    private readonly ApplicationDbContext _context;

    public AdminUserService(ApplicationDbContext context)
    {
        _context = context;
    }

    // One flat row per user. All filtering and sorting runs in SQL on this.
    internal sealed class UserRow
    {
        public Guid UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool PhoneVerified { get; set; }
        public int ReviewCount { get; set; }
        public decimal RatingSum { get; set; }
        public bool IsHost { get; set; }
        public int Bookings { get; set; }
        public int Spots { get; set; }
    }

    private IQueryable<UserRow> BaseRows() =>
        _context.profiles.AsNoTracking().Select(p => new UserRow
        {
            UserId = p.user_id,
            FullName = p.full_name,
            Email = p.email,
            Mobile = p.mobile_number,
            Status = p.current_status,
            CreatedAt = p.created_at,
            PhoneVerified = p.is_phone_verified,
            ReviewCount = _context.parking_spaces
                .Where(s => s.user_id == p.user_id)
                .Sum(s => (int?)s.review_count) ?? 0,
            RatingSum = _context.parking_spaces
                .Where(s => s.user_id == p.user_id)
                .Sum(s => (decimal?)(s.rating * s.review_count)) ?? 0m,
            IsHost = p.is_host,
            Bookings = _context.bookings.Count(b =>
                b.user_id == p.user_id &&
                (b.status == BookingStatus.Confirmed || b.status == BookingStatus.Cancelled)),
            Spots = _context.parking_spaces.Count(s => s.user_id == p.user_id),
        });

    public async Task<AdminUsersPageDto> GetAllUsersAsync(AdminUsersQueryDto f)
    {
        var page = Math.Max(1, f.Page);
        var limit = Math.Clamp(f.Limit, 1, 50);

        var filtered = ApplyFilters(BaseRows(), f);
        var total = await filtered.CountAsync();

        var rows = await ApplySort(filtered, f)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var counts = await _context.profiles.AsNoTracking()
            .GroupBy(p => p.current_status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return new AdminUsersPageDto
        {
            Data = rows.Select(Map<AdminUserListItemDto>).ToList(),
            Page = page,
            Limit = limit,
            Total = total,
            TotalPages = Math.Max(1, (int)Math.Ceiling(total / (double)limit)),
            Summary = new AdminUsersSummaryDto
            {
                Total = counts.Sum(c => c.Count),
                Active = counts.Where(c => string.Equals(c.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase)).Sum(c => c.Count),
                Blocked = counts.Where(c => string.Equals(c.Status, "BLOCKED", StringComparison.OrdinalIgnoreCase)).Sum(c => c.Count)
            }
        };
    }

    public async Task<AdminUserDetailDto?> GetUserByIdAsync(Guid userId)
    {
        var row = await BaseRows().FirstOrDefaultAsync(x => x.UserId == userId);
        if (row == null) return null;

        var dto = Map<AdminUserDetailDto>(row);

        if (dto.Status == "blocked")
        {
            var history = await _context.user_status_histories.AsNoTracking()
                .Where(h => h.user_id == userId && h.status == "BLOCKED")
                .OrderByDescending(h => h.created_at)
                .FirstOrDefaultAsync();

            if (history != null)
            {
                dto.BlockReason = history.reason;
                dto.BlockedAt = history.created_at;

                if (history.changed_by.HasValue)
                {
                    dto.BlockedBy = await _context.profiles.AsNoTracking()
                        .Where(p => p.user_id == history.changed_by.Value)
                        .Select(p => p.full_name)
                        .FirstOrDefaultAsync();
                }
            }
        }

        return dto;
    }

    private static readonly UserRoles[] AdminRoles =
    {
        UserRoles.Admin, UserRoles.Operations, UserRoles.FieldOfficer,
        UserRoles.Finance, UserRoles.Moderator, UserRoles.Support
    };

    public async Task<(string? Error, string? Message, AdminUserDetailDto? User)> UpdateUserStatusAsync(
        Guid adminUserId, bool callerIsSuperAdmin, Guid userId, string? status, string? reason)
    {
        var target = status?.Trim().ToLowerInvariant();
        reason = reason?.Trim();

        if (target != "active" && target != "blocked")
            return ("INVALID_INPUT", "Status must be 'active' or 'blocked'.", null);

        if (target == "blocked" && string.IsNullOrWhiteSpace(reason))
            return ("INVALID_INPUT", "A reason is required to block a user.", null);

        if (reason is { Length: > 500 })
            return ("INVALID_INPUT", "Reason must be 500 characters or fewer.", null);

        var profile = await _context.profiles.FirstOrDefaultAsync(p => p.user_id == userId);
        if (profile == null)
            return ("USER_NOT_FOUND", "User not found.", null);

        if (target == "blocked" && userId == adminUserId)
            return ("CANNOT_BLOCK_SELF", "You cannot block your own account.", null);

        var targetRoles = await _context.user_roles
            .Where(r => r.user_id == userId)
            .Select(r => r.role)
            .ToListAsync();

        if (target == "blocked" && targetRoles.Contains(UserRoles.SuperAdmin))
            return ("SUPER_ADMIN_PROTECTED", "The Super Admin account cannot be blocked.", null);

        if (!callerIsSuperAdmin && targetRoles.Any(r => AdminRoles.Contains(r)))
            return ("FORBIDDEN_ROLE", "Only the Super Admin can block or unblock admin accounts.", null);

        var newStatus = target == "blocked" ? "BLOCKED" : "ACTIVE";

        if (!string.Equals(profile.current_status, newStatus, StringComparison.OrdinalIgnoreCase))
        {
            var now = DateTime.UtcNow;

            profile.current_status = newStatus;
            profile.status_updated_on = now;
            profile.updated_at = now;

            _context.user_status_histories.Add(new user_status_history
            {
                user_id = userId,
                status = newStatus,
                reason = target == "blocked" ? reason : null,
                changed_by = adminUserId,
                created_at = now
            });

            await _context.SaveChangesAsync();
        }

        return (null, null, await GetUserByIdAsync(userId));
    }

    // ----- Helpers -----

    private static IQueryable<UserRow> ApplyFilters(IQueryable<UserRow> q, AdminUsersQueryDto f)
    {
        if (!string.IsNullOrWhiteSpace(f.Search))
        {
            var term = f.Search.Trim();

            if (Guid.TryParse(term, out var id))
            {
                q = q.Where(x => x.UserId == id);
            }
            else
            {
                var like = $"%{term}%";
                q = q.Where(x =>
                    (x.FullName != null && EF.Functions.ILike(x.FullName, like)) ||
                    (x.Email != null && EF.Functions.ILike(x.Email, like)) ||
                    (x.Mobile != null && EF.Functions.ILike(x.Mobile, like)));
            }
        }

        var roles = Split(f.Roles);
        if (roles.Count > 0)
        {
            var wantUser = roles.Contains("user", StringComparer.OrdinalIgnoreCase);
            var wantHost = roles.Contains("host", StringComparer.OrdinalIgnoreCase);

            q = q.Where(x =>
                (wantUser && !x.IsHost) ||
                (wantHost && x.IsHost));
        }

        var statuses = Split(f.Statuses).Select(s => s.ToUpperInvariant()).ToList();
        if (statuses.Count > 0)
            q = q.Where(x => x.Status != null && statuses.Contains(x.Status));

        if (string.Equals(f.HasSpots, "yes", StringComparison.OrdinalIgnoreCase))
            q = q.Where(x => x.Spots > 0);
        else if (string.Equals(f.HasSpots, "no", StringComparison.OrdinalIgnoreCase))
            q = q.Where(x => x.Spots == 0);

        if (string.Equals(f.PhoneVerified, "yes", StringComparison.OrdinalIgnoreCase))
            q = q.Where(x => x.PhoneVerified);
        else if (string.Equals(f.PhoneVerified, "no", StringComparison.OrdinalIgnoreCase))
            q = q.Where(x => !x.PhoneVerified);

        if (f.JoinedFrom.HasValue)
        {
            var from = DateTime.SpecifyKind(f.JoinedFrom.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            q = q.Where(x => x.CreatedAt >= from);
        }

        if (f.JoinedTo.HasValue)
        {
            var to = DateTime.SpecifyKind(f.JoinedTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            q = q.Where(x => x.CreatedAt < to);
        }

        if (f.MinBookings.HasValue) q = q.Where(x => x.Bookings >= f.MinBookings.Value);
        if (f.MaxBookings.HasValue) q = q.Where(x => x.Bookings <= f.MaxBookings.Value);

        return q;
    }

    private static IOrderedQueryable<UserRow> ApplySort(IQueryable<UserRow> q, AdminUsersQueryDto f)
    {
        var desc = string.Equals(f.SortOrder, "desc", StringComparison.OrdinalIgnoreCase);

        var sorted = (f.SortBy ?? string.Empty).ToLowerInvariant() switch
        {
            "name" => desc ? q.OrderByDescending(x => x.FullName) : q.OrderBy(x => x.FullName),
            "status" => desc ? q.OrderByDescending(x => x.Status) : q.OrderBy(x => x.Status),
            "totalbookings" => desc ? q.OrderByDescending(x => x.Bookings) : q.OrderBy(x => x.Bookings),
            _ => desc ? q.OrderByDescending(x => x.CreatedAt) : q.OrderBy(x => x.CreatedAt) // joinedDate
        };

        return sorted.ThenBy(x => x.UserId); // stable paging
    }

    private static List<string> Split(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? new List<string>()
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static string ToRole(UserRow r) =>
        r.IsHost
            ? UserRoles.Host.ToString().ToLowerInvariant()
            : UserRoles.User.ToString().ToLowerInvariant();

    private static T Map<T>(UserRow r) where T : AdminUserListItemDto, new() => new T
    {
        Id = r.UserId,
        Name = r.FullName ?? string.Empty,
        Email = r.Email ?? string.Empty,
        Mobile = r.Mobile ?? string.Empty,
        Role = ToRole(r),
        PhoneVerified = r.PhoneVerified,
        Rating = r.ReviewCount > 0 ? Math.Round(r.RatingSum / r.ReviewCount, 1) : (decimal?)null,
        Status = (r.Status ?? "active").ToLowerInvariant(),
        JoinedDate = DateOnly.FromDateTime(r.CreatedAt),
        TotalBookings = r.Bookings,
        TotalSpotsOwned = r.Spots
    };
}