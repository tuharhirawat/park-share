using ParkMitra_BE.Enums;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Helpers
{
    public static class BookingStatusCalculator
    {
        public static ComputedBookingStatus Compute(booking b, string? timezoneId)
        {
            if (b.status == BookingStatus.Cancelled)
                return ComputedBookingStatus.Cancelled;

            if (b.booking_date is null)
                return ComputedBookingStatus.Upcoming;

            var tz = TimeZoneInfo.FindSystemTimeZoneById(timezoneId ?? "Asia/Kolkata");
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            var bookingDate = b.booking_date.Value.ToDateTime(TimeOnly.MinValue);

            var start = bookingDate.Add((b.start_time ?? TimeOnly.MinValue).ToTimeSpan());
            var end = b.end_time is not null
                ? bookingDate.Add(b.end_time.Value.ToTimeSpan())
                : start.AddMinutes(b.duration_minutes);

            if (now < start) return ComputedBookingStatus.Upcoming;
            if (now <= end) return ComputedBookingStatus.Active;
            return ComputedBookingStatus.Completed;
        }
    }
}