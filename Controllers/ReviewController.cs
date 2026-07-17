using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewController : ControllerBase
    {
        private readonly ReviewService _reviewService;

        public ReviewController(ReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet("space/{spaceId}")]
        public async Task<IActionResult> GetSpaceReviews(
            Guid spaceId,
            [FromQuery] int page = 0,
            [FromQuery] int limit = 5)
        {
            var reviews = await _reviewService.GetSpaceReviewsAsync(spaceId, page, limit);
            return Ok(reviews);
        }
    }
}