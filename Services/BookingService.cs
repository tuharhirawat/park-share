using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Booking;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    public class BookingService
    {
        private readonly ApplicationDbContext _context;

        public BookingService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<SpaceBookingAvailabilityDto> GetSpaceBookingAvailabilityAsync(Guid spaceId, DateOnly date, TimeOnly startTime, TimeOnly endTime)
        {
            var bookedVehicleIds = await _context.bookings
                .Where(b => b.booking_date == date
                    && (b.status == "pending" || b.status == "confirmed")
                    && b.start_time < endTime
                    && b.end_time > startTime
                    && b.vehicle_id != null)
                .Select(b => b.vehicle_id!.Value)
                .Distinct()
                .ToListAsync();

            var bookedSlotIds = await _context.bookings
                .Where(b => b.space_id == spaceId
                    && b.booking_date == date
                    && (b.status == "pending" || b.status == "confirmed")
                    && b.start_time < endTime
                    && b.end_time > startTime
                    && b.slot_id != null)
                .Select(b => b.slot_id!.Value)
                .Distinct()
                .ToListAsync();

            return new SpaceBookingAvailabilityDto
            {
                BookedVehicleIds = bookedVehicleIds,
                BookedSlotIds = bookedSlotIds
            };
        }
    }
}