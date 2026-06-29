namespace ParkMitra_BE.Services
{
    public class CookieService
    {
        private const string AccessTokenCookieName = "access_token";
        private const string RefreshTokenCookieName = "refresh_token";

        public void SetAuthCookies(
            HttpResponse response,
            string accessToken,
            string refreshToken,
            int expiresIn)
        {
            response.Cookies.Append(
                AccessTokenCookieName,
                accessToken,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,  // TODO: should we true when deployed
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.UtcNow.AddSeconds(expiresIn)
                });

            response.Cookies.Append(
                RefreshTokenCookieName,
                refreshToken,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,  // TODO: should we true when deployed
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.UtcNow.AddDays(30)
                });
        }

        public void ClearAuthCookies(HttpResponse response)
        {
            response.Cookies.Delete(AccessTokenCookieName);
            response.Cookies.Delete(RefreshTokenCookieName);
        }
    }
}
