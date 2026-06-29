namespace ParkMitra_BE.Infrastructure.Clients;

public interface ISupabaseAuthClient
{
    Task<HttpResponseMessage> GetAuthenticatedUserAsync(string accessToken);

    Task<HttpResponseMessage> RegisterAuthUserAsync(object request);

    Task<HttpResponseMessage> AuthenticatePasswordUserAsync(object request);

    Task<HttpResponseMessage> UpdateAuthenticatedUserAsync(string accessToken, object request);
}