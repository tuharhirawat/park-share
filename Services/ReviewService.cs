using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Review;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    public class ReviewService
    {
        private readonly ApplicationDbContext _context;
        private const int MaxLimit = 20;

        public ReviewService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<SpaceReviewDto>> GetSpaceReviewsAsync(Guid spaceId, int page, int limit)
        {
            if (limit <= 0) limit = 5;
            if (limit > MaxLimit) limit = MaxLimit;
            if (page < 0) page = 0;

            var skip = page * limit;

            return await _context.space_latest_reviews
                .Where(r => r.space_id == spaceId)
                .OrderByDescending(r => r.updated_at)
                .Skip(skip)
                .Take(limit)
                .Select(r => new SpaceReviewDto
                {
                    Id = r.id,
                    BookingId = r.booking_id,
                    UserId = r.user_id,
                    SpaceId = r.space_id,
                    Rating = r.rating,
                    ReviewText = r.review_text,
                    CreatedAt = r.created_at,
                    UpdatedAt = r.updated_at,
                    FullName = r.full_name,
                    TotalReviewsByUser = r.total_reviews_by_user
                })
                .ToListAsync();
        }

        public async Task<SubmitReviewResultDto> SubmitReviewAsync(Guid userId, SubmitReviewRequestDto dto)
        {
            if (dto.Rating < 1 || dto.Rating > 5)
            {
                return new SubmitReviewResultDto
                {
                    Success = false,
                    Message = "Please select a rating between 1 and 5."
                };
            }

            var booking = await _context.bookings
                .Include(b => b.space)
                .FirstOrDefaultAsync(b => b.id == dto.BookingId && b.user_id == userId);

            if (booking == null)
            {
                return new SubmitReviewResultDto
                {
                    Success = false,
                    Message = "Booking not found."
                };
            }

            if (booking.status != Enums.BookingStatus.Confirmed ||
                booking.end_time is null ||
                booking.booking_date is null)
            {
                return new SubmitReviewResultDto
                {
                    Success = false,
                    Message = "This booking can't be reviewed yet."
                };
            }

            var tz = TimeZoneInfo.FindSystemTimeZoneById(booking.space?.timezone ?? "Asia/Kolkata");
            var nowInSpaceTz = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            var bookingEnd = booking.booking_date.Value.ToDateTime(booking.end_time.Value);

            if (bookingEnd > nowInSpaceTz)
            {
                return new SubmitReviewResultDto
                {
                    Success = false,
                    Message = "This booking hasn't completed yet."
                };
            }

            var existing = await _context.reviews
                .FirstOrDefaultAsync(r => r.space_id == booking.space_id && r.user_id == userId);

            if (existing != null)
            {
                existing.rating = dto.Rating;
                existing.review_text = dto.ReviewText;
                existing.booking_id = dto.BookingId;
                existing.updated_at = DateTime.UtcNow;
            }
            else
            {
                _context.reviews.Add(new review
                {
                    id = Guid.NewGuid(),
                    user_id = userId,
                    booking_id = dto.BookingId,
                    space_id = booking.space_id,
                    rating = dto.Rating,
                    review_text = dto.ReviewText,
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow
                });
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return new SubmitReviewResultDto
                {
                    Success = false,
                    ErrorCode = "REVIEW_CONFLICT",
                    Message = "Your review could not be saved. Please refresh and try again."
                };
            }

            return new SubmitReviewResultDto
            {
                Success = true,
                Message = existing != null ? "Review updated!" : "Review submitted!"
            };
        }

        public async Task<HostSpaceReviewSummaryDto?> GetHostSpaceReviewSummaryBySpaceIdAsync(
            Guid userId, 
            Guid spaceId)
        {
            var ownsSpace = await _context.parking_spaces.AnyAsync(s => s.id == spaceId && s.user_id == userId);

            if (!ownsSpace)
                return null;

            return await _context.host_space_review_summaries
                .Where(s => s.space_id == spaceId && s.host_id == userId)
                .Select(s => new HostSpaceReviewSummaryDto
                {
                    SpaceId = s.space_id,
                    Title = s.title,
                    ReviewCount = s.review_count,
                    AvgRating = s.avg_rating,
                    FiveStar = s.five_star,
                    FourStar = s.four_star,
                    ThreeStar = s.three_star,
                    TwoStar = s.two_star,
                    OneStar = s.one_star,
                    LatestReviewAt = s.latest_review_at
                })
                .FirstOrDefaultAsync();
        }

        public async Task<List<SpaceReviewerDto>?> GetSpaceReviewersAsync(Guid userId, Guid spaceId)
        {
            var ownsSpace = await _context.parking_spaces.AnyAsync(s => s.id == spaceId && s.user_id == userId);
            if (!ownsSpace) return null;

            return await _context.space_reviewers_summary
                .Where(r => r.space_id == spaceId)
                .OrderByDescending(r => r.latest_review_date)
                .Select(r => new SpaceReviewerDto
                {
                    UserId = r.user_id,
                    FullName = r.full_name,
                    ReviewsByUser = r.reviews_by_user,
                    LatestRating = r.latest_rating,
                    LatestReview = r.latest_review,
                    LatestReviewDate = r.latest_review_date
                })
                .ToListAsync();
        }

        public async Task<List<MySpaceReviewDto>> GetMySpaceReviewsAsync(
            Guid userId,
            IEnumerable<Guid> spaceIds)
        {
            var ids = spaceIds.Distinct().ToList();

            if (ids.Count == 0)
                return new List<MySpaceReviewDto>();

            return await _context.reviews
                .Where(r =>
                    r.user_id == userId &&
                    ids.Contains(r.space_id))
                .Select(r => new MySpaceReviewDto
                {
                    Id = r.id,
                    SpaceId = r.space_id,
                    Rating = r.rating,
                    ReviewText = r.review_text,
                    CreatedAt = r.created_at,
                    UpdatedAt = r.updated_at
                })
                .ToListAsync();
        }

        private static bool IsUniqueViolation(DbUpdateException ex)
        {
            // Npgsql wraps the Postgres error; SqlState 23505 = unique_violation
            return ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "23505";
        }
    }
}