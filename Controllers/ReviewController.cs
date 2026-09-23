using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Review;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewController : ControllerBase
    {
        private readonly ReviewService _reviewService;
        private readonly CurrentUserService _currentUserService;

        public ReviewController(ReviewService reviewService, CurrentUserService currentUserService)
        {
            _reviewService = reviewService;
            _currentUserService = currentUserService;
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

        [HttpPost("Submit")]
        public async Task<IActionResult> SubmitReview([FromBody] SubmitReviewRequestDto dto)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _reviewService.SubmitReviewAsync(currentUser.UserId, dto);

            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("host/space/{spaceId}/summary")]
        public async Task<IActionResult> GetHostSpaceReviewSummary(Guid spaceId)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();

            var summary = await _reviewService.GetHostSpaceReviewSummaryBySpaceIdAsync(
                currentUser.UserId,
                spaceId);

            if (summary == null)
                return NotFound();

            return Ok(summary);
        }

        [HttpGet("host/space/{spaceId}/reviewers")]
        public async Task<IActionResult> GetSpaceReviewers(Guid spaceId)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var reviewers = await _reviewService.GetSpaceReviewersAsync(currentUser.UserId, spaceId);
            if (reviewers == null) return NotFound();

            return Ok(reviewers);
        }

        [HttpGet("user/spacebooking/reviews")]
        public async Task<IActionResult> GetMySpaceReviews([FromQuery] Guid[] spaceIds)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();

            var reviews = await _reviewService.GetMySpaceReviewsAsync(
                currentUser.UserId,
                spaceIds);

            return Ok(reviews);
        }
    }
}