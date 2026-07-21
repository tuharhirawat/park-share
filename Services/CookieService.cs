using Microsoft.AspNetCore.Http;

namespace ParkMitra_BE.Services
{
    public class CookieService
    {
        private const string AccessTokenCookieName = "access_token";
        private const string RefreshTokenCookieName = "refresh_token";

        /// <summary>
        /// Creates a consistent set of cookie options for both authentication
        /// and logout to ensure the browser can correctly overwrite/remove cookies.
        /// </summary>
        private static CookieOptions CreateCookieOptions(
            HttpContext httpContext,
            DateTimeOffset? expires = null)
        {
            var isHttps = httpContext.Request.IsHttps;

            return new CookieOptions
            {
                HttpOnly = true,
                Secure = isHttps,
                SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Path = "/",
                Expires = expires
            };
        }

        public void SetAuthCookies(
            HttpResponse response,
            string accessToken,
            string refreshToken,
            int expiresIn)
        {
            response.Cookies.Append(
                AccessTokenCookieName,
                accessToken,
                CreateCookieOptions(
                    response.HttpContext,
                    DateTimeOffset.UtcNow.AddSeconds(expiresIn)));

            response.Cookies.Append(
                RefreshTokenCookieName,
                refreshToken,
                CreateCookieOptions(
                    response.HttpContext,
                    DateTimeOffset.UtcNow.AddDays(30)));
        }

        public void ClearAuthCookies(HttpResponse response)
        {
            // Expire the cookies using the same options that were used to create
            // them so the browser correctly removes the existing cookies.
            var expired = DateTimeOffset.UnixEpoch;

            response.Cookies.Append(
                AccessTokenCookieName,
                string.Empty,
                CreateCookieOptions(response.HttpContext, expired));

            response.Cookies.Append(
                RefreshTokenCookieName,
                string.Empty,
                CreateCookieOptions(response.HttpContext, expired));
        }
    }
}