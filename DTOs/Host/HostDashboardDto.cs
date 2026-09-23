using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Host;

public class HostDashboardDto
{
    public int TotalSpaces { get; set; }
    public int TotalBookings { get; set; }
    public decimal TotalEarnings { get; set; }
    public decimal AverageRating { get; set; }
    public PagedResultDto<HostSpaceDto> Spaces { get; set; } = new();
}