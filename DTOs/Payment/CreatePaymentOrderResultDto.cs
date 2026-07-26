namespace ParkMitra_BE.DTOs.Payment
{
    public class CreatePaymentOrderResultDto : ApiResponseDto
    {
        public string? OrderId { get; set; }
        public string? KeyId { get; set; }
        public int? AmountInPaise { get; set; }
    }
}
