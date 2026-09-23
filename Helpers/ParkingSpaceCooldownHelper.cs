using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.ParkingSpace;

namespace ParkMitra_BE.Helpers
{
    public static class ParkingSpaceCooldownHelper
    {
        public const int CooldownDays = 60;

        public static bool IsCooldownActive(DateTime? lastChangedAt)
        {
            if (!lastChangedAt.HasValue)
                return false;

            return DateTime.UtcNow < lastChangedAt.Value.AddDays(CooldownDays);
        }

        public static int GetRemainingDays(DateTime? lastChangedAt)
        {
            if (!lastChangedAt.HasValue)
                return 0;

            var availableOn = lastChangedAt.Value.AddDays(CooldownDays);
            var remaining = availableOn - DateTime.UtcNow;

            if (remaining <= TimeSpan.Zero)
                return 0;

            return Math.Max(1,(int)Math.Ceiling(remaining.TotalDays));
        }

        public static FieldCooldownDto GetCooldown(DateTime? lastChangedAt)
        {
            var daysRemaining = GetRemainingDays(lastChangedAt);

            return new FieldCooldownDto
            {
                IsActive = daysRemaining > 0,
                DaysRemaining = daysRemaining
            };
        }
    }
}