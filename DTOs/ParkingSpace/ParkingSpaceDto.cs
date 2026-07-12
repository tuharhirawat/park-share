namespace ParkMitra_BE.DTOs.ParkingSpace
{
    public class ParkingSpaceDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public decimal PricePerHour { get; set; }
        public decimal? PricePerDay { get; set; }
        public List<string> VehicleTypes { get; set; } = new();
        public List<string> Features { get; set; } = new();
        public string? Description { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        public decimal Rating { get; set; }
        public int ReviewCount { get; set; }
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public string Timezone { get; set; } = string.Empty;
        public bool Available { get; set; }
        public string ListingStatus { get; set; } = string.Empty;
        public string? RejectionReason { get; set; }
        public int ReapplyCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CarSlots { get; set; }
        public int BikeSlots { get; set; }
    }
}