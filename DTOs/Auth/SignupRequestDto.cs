namespace ParkMitra_BE.DTOs.Auth
{
    public class SignupRequestDto
    {
        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string MobileNumber { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }
}
