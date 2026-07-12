using System.Net.Http.Headers;

namespace ParkMitra_BE.Infrastructure.Clients;

/// <summary>
/// Client responsible for communicating with Supabase Storage APIs.
///
/// This class only performs HTTP requests to Supabase Storage.
/// It does not contain validation or business logic — that lives in the calling service.
/// </summary>
public class SupabaseStorageClient : IStorageClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public SupabaseStorageClient(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
    }

    private void ConfigureHeaders(string contentType)
    {
        _httpClient.DefaultRequestHeaders.Clear();

        var serviceRoleKey = _configuration["Supabase:ServiceRoleKey"];

        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", serviceRoleKey);

        _httpClient.DefaultRequestHeaders.Add("apikey", serviceRoleKey);
        _httpClient.DefaultRequestHeaders.Add("x-upsert", "false");
    }

    private string BuildStorageUrl(string endpoint)
    {
        return $"{_configuration["Supabase:Url"]}{endpoint}";
    }

    public Task<HttpResponseMessage> UploadFileAsync(string bucket, string path, byte[] fileBytes, string contentType)
    {
        ConfigureHeaders(contentType);

        var content = new ByteArrayContent(fileBytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        return _httpClient.PostAsync(
            BuildStorageUrl($"/storage/v1/object/{bucket}/{path}"),
            content);
    }

    public string GetPublicUrl(string bucket, string path)
    {
        return BuildStorageUrl($"/storage/v1/object/public/{bucket}/{path}");
    }
}