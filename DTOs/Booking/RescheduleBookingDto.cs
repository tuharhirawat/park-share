namespace ParkMitra_BE.DTOs.Booking
{
    public class RescheduleBookingRequestDto
    {
        public Guid BookingId { get; set; }

        public DateOnly BookingDate { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public bool ApplyGraceExtension { get; set; }
    }

    public class RescheduleBookingResultDto : ApiResponseDto
    {
        public bool PaymentRequired { get; set; }

        public Guid? PaymentId { get; set; }

        public int ExtraMinutes { get; set; }

        public decimal CurrentBookingPrice { get; set; }

        public decimal ParkingExtensionCost { get; set; }

        public decimal GraceDiscount { get; set; }

        public bool GraceApplied { get; set; }

        public decimal ServiceFee { get; set; }

        public decimal Gst { get; set; }

        public decimal TotalPayable { get; set; }

        public decimal NewBookingTotal { get; set; }

        public bool CanUseFreeExtension { get; set; }

        public bool NextHasUsedFreeExtension { get; set; }
    }
}