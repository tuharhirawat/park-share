using ParkMitra_BE.DTOs.Host;
using ParkMitra_BE.Helpers;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Mappers
{
    public static class HostMapper
    {
        public static HostSpaceDto MapSpace(parking_space s, HostSpaceStatsDto stats) => new()
        {
            Id = s.id,
            Title = s.title,
            Address = s.address,
            City = s.city,
            PricePerHour = s.price_per_hour,
            PricePerDay = s.price_per_day,
            VehicleTypes = s.vehicle_types,
            Features = s.features,
            Description = s.description,
            Lat = s.lat,
            Lng = s.lng,
            Available = s.available,
            Rating = s.rating,
            ReviewCount = s.review_count,
            ImageUrls = s.image_urls ?? new List<string>(),
            ListingStatus = s.listing_status,
            TotalBookings = stats.TotalBookings,
            Earnings = stats.Earnings,
            ActiveNow = stats.ActiveNow,
            UpcomingCount = stats.UpcomingCount
        };

        public static HostBookingDto MapBooking(booking b, Dictionary<Guid, string> slotLabelById, string? timezoneId) => new()
        {
            Id = b.id,
            TotalPrice = b.total_price,
            ComputedStatus = BookingStatusCalculator.Compute(b, timezoneId),
            BookingDate = b.booking_date,
            StartTime = b.start_time,
            EndTime = b.end_time,
            CreatedAt = b.created_at,
            VehicleType = b.vehicle_type,
            SlotLabel = b.slot_id.HasValue && slotLabelById.TryGetValue(b.slot_id.Value, out var label)
        ? label
        : null
        };

        public static HostSlotDto MapSlot(parking_slot s) => new()
        {
            Id = s.id,
            SpaceId = s.space_id,
            Label = s.label,
            VehicleType = s.vehicle_type,
            IsActive = s.is_active
        };
    }
}
