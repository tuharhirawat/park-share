using ParkMitra_BE.DTOs.Auth;

namespace ParkMitra_BE.Services
{
    // TODO:
    // Reserved for the future backend-managed Google OAuth flow.
    // Currently not invoked because frontend establishes the
    // backend session using Auth/EstablishSession.
    public class GoogleAuthService
    {
        private readonly CurrentUserService _currentUserService;

        public GoogleAuthService(CurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        public async Task<MeResponseDto?> GetGoogleUserAsync(string accessToken)
        {
            return await _currentUserService.GetCurrentUserAsync(accessToken);
        }
    }
}