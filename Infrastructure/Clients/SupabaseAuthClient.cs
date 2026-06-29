using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ParkMitra_BE.Infrastructure.Clients;

/// <summary>
/// Handles all communication with Supabase Authentication APIs.
///
/// This class is responsible only for making authenticated HTTP requests.
/// It intentionally contains no business logic. Parsing responses and
/// applying business rules belong to the calling services.
/// </summary>
public class SupabaseAuthClient : ISupabaseAuthClient
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
}