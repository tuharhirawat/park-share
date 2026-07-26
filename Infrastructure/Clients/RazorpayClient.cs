using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ParkMitra_BE.Infrastructure.Clients;

/// <summary>
/// Client responsible for communicating with the Razorpay REST API.
///
/// This class only performs HTTP requests to Razorpay.
/// It does not contain business logic, pricing, or validation —
/// that lives in the calling service.
/// </summary>
public class RazorpayClient : IPaymentGatewayClient
{
    private string BaseUrl =>
        _configuration["Razorpay:BaseUrl"] ?? throw new InvalidOperationException("Razorpay BaseUrl is not configured.");

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public RazorpayClient(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
    }

    public string KeyId => _configuration["Razorpay:KeyId"] ?? string.Empty;

    private void ConfigureHeaders()
    {
        _httpClient.DefaultRequestHeaders.Clear();

        var keyId = _configuration["Razorpay:KeyId"];
        var keySecret = _configuration["Razorpay:KeySecret"];
        var raw = Encoding.UTF8.GetBytes($"{keyId}:{keySecret}");

        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", Convert.ToBase64String(raw));
    }

    public Task<HttpResponseMessage> CreateOrderAsync(int amountInPaise, string currency, string receipt, object? notes = null)
    {
        ConfigureHeaders();

        var payload = new Dictionary<string, object?>
        {
            ["amount"] = amountInPaise,
            ["currency"] = currency,
            ["receipt"] = receipt,
            ["notes"] = notes
        };

        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        return _httpClient.PostAsync($"{BaseUrl}/orders", content);
    }

    public Task<HttpResponseMessage> CreateRefundAsync(string paymentId, int? amountInPaise = null)
    {
        ConfigureHeaders();

        var payload = new Dictionary<string, object?>();
        if (amountInPaise.HasValue)
            payload["amount"] = amountInPaise.Value;

        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        return _httpClient.PostAsync($"{BaseUrl}/payments/{paymentId}/refund", content);
    }

    public bool VerifySignature(string orderId, string paymentId, string signature)
    {
        var keySecret = _configuration["Razorpay:KeySecret"] ?? string.Empty;
        var payload = Encoding.UTF8.GetBytes($"{orderId}|{paymentId}");
        var key = Encoding.UTF8.GetBytes(keySecret);

        using var hmac = new HMACSHA256(key);
        var hash = hmac.ComputeHash(payload);
        var computed = Convert.ToHexString(hash).ToLowerInvariant();

        return computed == signature.ToLowerInvariant();
    }

    public bool VerifyWebhookSignature(string requestBody, string signature)
    {
        var webhookSecret =
            _configuration["Razorpay:WebhookSecret"] ?? string.Empty;

        var payload = Encoding.UTF8.GetBytes(requestBody);
        var key = Encoding.UTF8.GetBytes(webhookSecret);

        using var hmac = new HMACSHA256(key);

        var hash = hmac.ComputeHash(payload);

        var computed = Convert.ToHexString(hash).ToLowerInvariant();

        return computed == signature.ToLowerInvariant();
    }
}