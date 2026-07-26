namespace ParkMitra_BE.Infrastructure.Clients;

public interface IPaymentGatewayClient
{
    Task<HttpResponseMessage> CreateOrderAsync(int amountInPaise, string currency, string receipt, object? notes = null);
    Task<HttpResponseMessage> CreateRefundAsync(string paymentId, int? amountInPaise = null);
    bool VerifySignature(string orderId, string paymentId, string signature);
    bool VerifyWebhookSignature(string requestBody, string signature);
    string KeyId { get; }
}