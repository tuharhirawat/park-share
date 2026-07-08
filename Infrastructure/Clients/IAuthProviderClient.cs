namespace ParkMitra_BE.Infrastructure.Clients;

public interface IAuthProviderClient
{
    Task<HttpResponseMessage> GetAuthenticatedUserAsync(string accessToken);

    Task<HttpResponseMessage> RegisterAuthUserAsync(object request);

    Task<HttpResponseMessage> AuthenticatePasswordUserAsync(object request);

    Task<HttpResponseMessage> UpdateAuthenticatedUserAsync(string accessToken, object request);

    Task<HttpResponseMessage> RegisterAuthUserByAdminAsync(object request);

    //Task<HttpResponseMessage> SignInWithIdTokenAsync(object request);

    string BuildAuthorizeUrl(string provider, string codeChallenge, string redirectTo);

    Task<HttpResponseMessage> ExchangeOAuthCodeAsync(string authCode, string codeVerifier);
}