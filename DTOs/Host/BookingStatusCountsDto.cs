namespace ParkMitra_BE.DTOs.Host
{
    public class BookingStatusCountsDto
    {
        public int Upcoming { get; set; }
        public int Active { get; set; }
        public int Completed { get; set; }
        public int Cancelled { get; set; }
    }
}
