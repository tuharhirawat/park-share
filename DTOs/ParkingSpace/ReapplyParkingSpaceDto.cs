namespace ParkMitra_BE.DTOs.ParkingSpace
{
    public class ReapplyParkingSpaceDto
    {
        public Guid Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public string StateName { get; set; } = string.Empty;

        public string CityName { get; set; } = string.Empty;

        public decimal PricePerHour { get; set; }

        public decimal? PricePerDay { get; set; }

        public int CarSlots { get; set; }

        public int BikeSlots { get; set; }

        public List<string> Features { get; set; } = new();

        public string? Description { get; set; }

        public List<string> ImageUrls { get; set; } = new();

        public double? Lat { get; set; }

        public double? Lng { get; set; }
    }
}
