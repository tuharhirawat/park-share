using System.ComponentModel.DataAnnotations;

namespace ParkMitra_BE.DTOs.Profile
{
    public class UpdatePasswordDto
    {
        [Required]
        [MinLength(8)]
        [MaxLength(72)]
        public string NewPassword { get; set; } = string.Empty;
    }
}