using ParkMitra_BE.DTOs.Booking.Admin;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Mappers
{
    public class AdminBookingMapper
    {
        public static T MapBooking<T>(booking b, ComputedBookingStatus status) where T : AdminBookingListItemDto, new() => new T
        {
            Id = b.id,
            Reference = "BK-" + b.id.ToString("N")[..8].ToUpperInvariant(),
            Status = status.ToString().ToLowerInvariant(),
            BookingDate = b.booking_date,
            StartTime = b.start_time,
            EndTime = b.end_time,
            DurationMinutes = b.duration_minutes,
            DriverId = b.user_id,
            DriverName = b.user?.full_name ?? string.Empty,
            DriverMobile = b.user?.mobile_number,
            VehicleNumber = b.vehicle?.registration_number,
            VehicleType = b.vehicle_type.ToString().ToLowerInvariant(),
            SpaceId = b.space_id,
            SpaceTitle = b.space_title,
            SpaceCity = b.space_city,
            OwnerId = b.space?.user_id,
            OwnerName = b.space?.user?.full_name,
            SlotLabel = b.slot?.label,
            TotalAmount = b.total_price,
            CreatedAt = b.created_at
        };
    }
}
