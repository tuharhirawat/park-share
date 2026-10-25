namespace ParkMitra_BE.DTOs.ParkingSpace
{
    public class ParkingSpaceDashboardDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public decimal PricePerHour { get; set; }
        public List<string> VehicleTypes { get; set; } = new();
        public decimal Rating { get; set; }
        public int ReviewCount { get; set; }
        public string? ImageUrl { get; set; }
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public bool HasCctv { get; set; }
    }
}
