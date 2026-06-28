using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Profile;
using ParkMitra_BE.Models;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly ProfileService _profileService;
        private readonly CurrentUserService _currentUserService;

        public ProfileController(ProfileService profileService, CurrentUserService currentUserService)
        {
            _profileService = profileService;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfiles()
        {
            var profiles = await _profileService.GetProfilesAsync();

            if (profiles == null)
                return NotFound();

            return Ok(profiles);
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetProfile(Guid userId)
        {
            var profile = await _profileService.GetByUserIdAsync(userId);

            if (profile == null)
                return NotFound();

            return Ok(profile);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] ProfileDto request)
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null) 
                return Unauthorized();

            var success = await _profileService.UpdateProfileAsync(
                currentUser.UserId,
                request.FullName,
                request.MobileNumber
            );

            if (!success)
            {
                return BadRequest(new ApiResponseDto
                {
                    Success = false,
                    Message = "Mobile number already exists."
                });
            }

            return Ok();
        }

        [HttpPut("UpdateEmail")]
        public async Task<IActionResult> UpdateEmail(UpdateEmailDto request)
        {
            var accessToken =
                Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService
                    .GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            if (!currentUser.CanChangeEmail)
            {
                return BadRequest(new ApiResponseDto
                {
                    Success = false,
                    Message = "Email changes are not supported for accounts linked with Google sign-in."
                });
            }

            var result =
                await _profileService.UpdateEmailAsync(
                    currentUser.UserId,
                    accessToken,
                    request.Email);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPut("UpdatePassword")]
        public async Task<IActionResult> UpdatePassword(UpdatePasswordDto request)
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var result = await _profileService.UpdatePasswordAsync(
                    accessToken,
                    request.NewPassword);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }
    }
}