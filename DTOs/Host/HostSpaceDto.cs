using ParkMitra_BE.DTOs.ParkingSpace;

namespace ParkMitra_BE.DTOs.Host
{
    public class HostSpaceDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public decimal PricePerHour { get; set; }
        public decimal? PricePerDay { get; set; }
        public List<string>? VehicleTypes { get; set; }
        public List<string>? Features { get; set; }
        public string? Description { get; set; }
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public bool Available { get; set; }
        public decimal Rating { get; set; }
        public int ReviewCount { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        public string? ListingStatus { get; set; }
        public int TotalBookings { get; set; }
        public decimal Earnings { get; set; }
        public int ActiveNow { get; set; }
        public int UpcomingCount { get; set; }
        public FieldCooldownDto? TitleCooldown { get; set; }
        public FieldCooldownDto? AddressCooldown { get; set; }
        public FieldCooldownDto? FeaturesCooldown { get; set; }
        public FieldCooldownDto? PricePerHourCooldown { get; set; }
        public FieldCooldownDto? PricePerDayCooldown { get; set; }
    }
}