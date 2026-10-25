using System.ComponentModel.DataAnnotations;

namespace ParkMitra_BE.DTOs.ParkingSpace
{
    public class CreateParkingSpaceDto
    {
        [Required, StringLength(100, MinimumLength = 5)]
        public string Title { get; set; } = string.Empty;

        [Required, StringLength(200, MinimumLength = 5)]
        public string Address { get; set; } = string.Empty;

        [Required]
        public Guid CityId { get; set; }

        [Required, Range(0.01, 10000)]
        public decimal PricePerHour { get; set; }

        [Range(0.01, double.MaxValue)]
        public decimal? PricePerDay { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        [Range(0, 100)]
        public int CarSlots { get; set; }

        [Range(0, 100)]
        public int BikeSlots { get; set; }

        public List<string> Features { get; set; } = new();

        public List<string> ImageUrls { get; set; } = new();

        [Required]
        public double Lat { get; set; }

        [Required]
        public double Lng { get; set; }
    }
}