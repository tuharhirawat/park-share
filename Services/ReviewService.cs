using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Review;

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
    }
}