using ParkMitra_BE.Enums;
using System.ComponentModel.DataAnnotations;

namespace ParkMitra_BE.DTOs.Vehicle
{
    public class VehicleDto
    {
        public Guid? Id { get; set; }

        [Required]
        public VehicleType VehicleType { get; set; }

        [Required]
        [StringLength(100)]
        public string BrandModel { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string RegistrationNumber { get; set; } = string.Empty;

        public DateTime? CreatedAt { get; set; }
    }
}