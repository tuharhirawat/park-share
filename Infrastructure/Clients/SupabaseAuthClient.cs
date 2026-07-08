using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ParkMitra_BE.Infrastructure.Clients;

/// <summary>
/// Client responsible for communicating with Supabase Authentication APIs.
///
/// This class only performs HTTP requests to Supabase Auth.
/// It does not contain authentication, validation, or business logic.
///
/// Responsibilities:
/// - Configure authentication headers
/// - Build Supabase Auth URLs
/// - Send requests to Supabase Authentication endpoints
///
/// Response parsing and business decisions are handled by the calling services.
/// </summary>
public class SupabaseAuthClient : IAuthProviderClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public SupabaseAuthClient(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
    }

    private void ConfigureHeaders(string? accessToken = null, bool useServiceRole = false)
    {
        _httpClient.DefaultRequestHeaders.Clear();

        if (useServiceRole)
        {
            var serviceRoleKey = _configuration["Supabase:ServiceRoleKey"];

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", serviceRoleKey);

            _httpClient.DefaultRequestHeaders.Add("apikey", serviceRoleKey);

            return;
        }

        var anonKey = _configuration["Supabase:AnonKey"];

        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);
        }

        _httpClient.DefaultRequestHeaders.Add("apikey", anonKey);
    }

    private string BuildAuthUrl(string endpoint)
    {
        return $"{_configuration["Supabase:Url"]}{endpoint}";
    }

    public Task<HttpResponseMessage> GetAuthenticatedUserAsync(string accessToken)
    {
        ConfigureHeaders(accessToken);

        return _httpClient.GetAsync(BuildAuthUrl("/auth/v1/user"));
    }

    public Task<HttpResponseMessage> RegisterAuthUserAsync(object request)
    {
        ConfigureHeaders(useServiceRole: true);

        var content = new StringContent(
            JsonSerializer.Serialize(request),
            Encoding.UTF8,
            "application/json");

        return _httpClient.PostAsync(
            BuildAuthUrl("/auth/v1/signup"),
            content);
    }

    public Task<HttpResponseMessage> AuthenticatePasswordUserAsync(object request)
    {
        ConfigureHeaders();

        var content = new StringContent(
            JsonSerializer.Serialize(request),
            Encoding.UTF8,
            "application/json");

        return _httpClient.PostAsync(
            BuildAuthUrl("/auth/v1/token?grant_type=password"),
            content);
    }

    public Task<HttpResponseMessage> UpdateAuthenticatedUserAsync(
        string accessToken,
        object request)
    {
        ConfigureHeaders(accessToken);

        var content = new StringContent(
            JsonSerializer.Serialize(request),
            Encoding.UTF8,
            "application/json");

        return _httpClient.PutAsync(
            BuildAuthUrl("/auth/v1/user"),
            content);
    }

    public Task<HttpResponseMessage> RegisterAuthUserByAdminAsync(object request)
    {
        ConfigureHeaders(useServiceRole: true);

        var content = new StringContent(
            JsonSerializer.Serialize(request),
            Encoding.UTF8,
            "application/json");

        return _httpClient.PostAsync(
            BuildAuthUrl("/auth/v1/admin/users"),
            content);
    }

    //public Task<HttpResponseMessage> SignInWithIdTokenAsync(object request)
    //{
    //    ConfigureHeaders();

    //    var content = new StringContent(
    //        JsonSerializer.Serialize(request),
    //        Encoding.UTF8,
    //        "application/json");

    //    return _httpClient.PostAsync(
    //        BuildAuthUrl("/auth/v1/token?grant_type=id_token"),
    //        content);
    //}

    public string BuildAuthorizeUrl(string provider, string codeChallenge, string redirectTo)
    {
        return BuildAuthUrl(
            $"/auth/v1/authorize?provider={provider}" +
            $"&code_challenge={codeChallenge}&code_challenge_method=s256" +
            $"&redirect_to={Uri.EscapeDataString(redirectTo)}");
    }

    public Task<HttpResponseMessage> ExchangeOAuthCodeAsync(string authCode, string codeVerifier)
    {
        ConfigureHeaders();

        var content = new StringContent(
            JsonSerializer.Serialize(new { auth_code = authCode, code_verifier = codeVerifier }),
            Encoding.UTF8,
            "application/json");

        return _httpClient.PostAsync(
            BuildAuthUrl("/auth/v1/token?grant_type=pkce"),
            content);
    }
}