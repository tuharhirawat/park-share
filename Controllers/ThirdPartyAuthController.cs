using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/thirdpartyauth")]
    public class ThirdPartyAuthController : ControllerBase
    {
        private readonly ThirdPartyAuthService _thirdPartyAuthService;
        private readonly CookieService _cookieService;
        private readonly IConfiguration _configuration;

        public ThirdPartyAuthController(ThirdPartyAuthService thirdPartyAuthService, CookieService cookieService, IConfiguration configuration)
        {
            _thirdPartyAuthService = thirdPartyAuthService;
            _cookieService = cookieService;
            _configuration = configuration;
        }

        [HttpGet("{provider}/login")]
        public IActionResult Login(string provider)
        {
            var backendBaseUrl = _configuration["Application:BackendBaseUrl"]!;

            var callbackUrl = $"{backendBaseUrl}/api/thirdpartyauth/callback";

            var result = _thirdPartyAuthService.BuildLoginRedirect(provider, callbackUrl);

            if (!result.Success)
                return BadRequest(new { result.Success, result.Message });

            Console.WriteLine(result.RedirectUrl);
            return Redirect(result.RedirectUrl!);
        }

        [HttpGet("callback")]
        public async Task<IActionResult> Callback(string code, string state, string provider)
        {
            var result = await _thirdPartyAuthService.HandleCallbackAsync(code, state, provider);

            if (!result.Success)
                return Unauthorized(new { result.Success, result.Message });

            var frontendBaseUrl = _configuration["Application:FrontendBaseUrl"]!;

            _cookieService.SetAuthCookies(Response, result.AccessToken!, result.RefreshToken!, result.ExpiresIn);

            return Redirect($"{frontendBaseUrl}/auth/callback");
        }
    }
}