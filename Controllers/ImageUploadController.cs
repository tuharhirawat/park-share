using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.Services;
using ParkMitra_BE.DTOs.ImageUpload;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageUploadController : ControllerBase
    {
        private readonly ImageUploadService _imageUploadService;
        private readonly CurrentUserService _currentUserService;

        private readonly string[] _allowedTypes;

        public ImageUploadController(
            ImageUploadService imageUploadService,
            CurrentUserService currentUserService,
            IConfiguration configuration)
        {
            _imageUploadService = imageUploadService;
            _currentUserService = currentUserService;
            _allowedTypes = configuration
                .GetSection("ImageUpload:AllowedContentTypes")
                .Get<string[]>() ?? Array.Empty<string>();
        }

        [HttpPost("UploadListingImage")]
        [RequestSizeLimit(5 * 1024 * 1024)]
        public async Task<IActionResult> UploadListingImage(
            IFormFile file, [FromForm] Guid? spaceId)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            if (file == null || file.Length == 0)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "No file provided."
                });
            }

            if (!_allowedTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Only JPEG, JPG, PNG, or WEBP images are supported."
                });
            }

            try
            {
                var url = await _imageUploadService.UploadAsync(currentUser.UserId, file, spaceId);

                return Ok(new
                {
                    Success = true,
                    Url = url
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("RemoveListingImage")]
        public async Task<IActionResult> RemoveListingImage([FromBody] RemoveListingImageRequestDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();

            if (request.SpaceId == Guid.Empty || string.IsNullOrWhiteSpace(request.ImageUrl))
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "SpaceId and ImageUrl are required."
                });
            }

            try
            {
                await _imageUploadService.RemoveAsync(
                    currentUser.UserId, request.SpaceId, request.ImageUrl);

                return Ok(new
                {
                    Success = true,
                    Message = "Image removed successfully."
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }
    }
}