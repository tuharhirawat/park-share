namespace ParkMitra_BE.DTOs
{
    public class ApiResponseDto
    {
        public bool Success { get; set; }
        public string ErrorCode { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
