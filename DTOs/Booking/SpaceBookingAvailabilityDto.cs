namespace ParkMitra_BE.DTOs.Booking
{
    public class SpaceBookingAvailabilityDto
    {
        public List<Guid> BookedVehicleIds { get; set; } = new();
        public List<Guid> BookedSlotIds { get; set; } = new();
    }
}
