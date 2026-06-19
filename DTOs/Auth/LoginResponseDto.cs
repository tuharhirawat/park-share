namespace ParkMitra_BE.DTOs.Auth
{
    public class LoginResponseDto : ApiResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public int ExpiresIn { get; set; }
    }
}