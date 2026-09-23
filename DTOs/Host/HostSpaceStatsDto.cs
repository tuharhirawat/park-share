namespace ParkMitra_BE.DTOs.Host
{
    public class HostSpaceStatsDto
    {
        public int TotalBookings { get; set; }
        public decimal Earnings { get; set; }
        public int ActiveNow { get; set; }
        public int UpcomingCount { get; set; }
    }
}