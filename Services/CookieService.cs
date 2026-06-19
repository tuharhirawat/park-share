namespace ParkMitra_BE.Services
{
    public class CookieService
    {
        public void SetAuthCookies(
            HttpResponse response,
            string accessToken,
            string refreshToken,
            int expiresIn)
        {
            response.Cookies.Append(
                "access_token",
                accessToken,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,  // TODO: should we true when deployed
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.UtcNow.AddSeconds(expiresIn)
                });

            response.Cookies.Append(
                "refresh_token",
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
            response.Cookies.Delete("access_token");
            response.Cookies.Delete("refresh_token");
        }
    }
}