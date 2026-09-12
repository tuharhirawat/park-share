namespace ParkMitra_BE.DTOs.ParkingSpace
{
    public class ParkingSpaceSearchDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Timezone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public decimal PricePerHour { get; set; }
        public decimal? PricePerDay { get; set; }
        public List<string> VehicleTypes { get; set; } = new();
        public List<string> Features { get; set; } = new();
        public decimal Rating { get; set; }
        public int ReviewCount { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public bool Available { get; set; }
    }
}
