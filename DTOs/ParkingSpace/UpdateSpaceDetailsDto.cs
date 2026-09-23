using ParkMitra_BE.DTOs.Host;

namespace ParkMitra_BE.DTOs.ParkingSpace
{
    public class UpdateSpaceDetailsRequestDto
    {
        public string Title { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public decimal PricePerHour { get; set; }
        public decimal? PricePerDay { get; set; }
        public string? Description { get; set; }
        public List<string>? Features { get; set; }
    }

    public class UpdateSpaceDetailsResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public Dictionary<string, string> FieldErrors { get; set; } = new();
        public HostSpaceDto? Space { get; set; }
    }
}