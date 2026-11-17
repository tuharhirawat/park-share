namespace ParkMitra_BE.DTOs.Booking.Admin;

public class AdminUserBookingDto
{
    public Guid Id { get; set; }
    public Guid SpotId { get; set; }
    public string SpotTitle { get; set; } = string.Empty;
    public string? VehicleNumber { get; set; }
    public DateOnly? BookingDate { get; set; }
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class AdminUserSpotDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public decimal PricePerHour { get; set; }
    public string VerificationStatus { get; set; } = string.Empty;
    public bool IsLive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminBookingsRequestDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }  
    public string? City { get; set; }
    public string? VehicleType { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public string SortBy { get; set; } = "startTime";
    public string SortOrder { get; set; } = "desc";
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 10;
}

public class AdminBookingCountsDto
{
    public int All { get; set; }
    public int Upcoming { get; set; }
    public int Active { get; set; }
    public int Completed { get; set; }
    public int Cancelled { get; set; }
}

public class AdminBookingListItemDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateOnly? BookingDate { get; set; }        
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public int DurationMinutes { get; set; }
    public Guid DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string? DriverMobile { get; set; }
    public string? VehicleNumber { get; set; }
    public string VehicleType { get; set; } = string.Empty;
    public Guid SpaceId { get; set; }
    public string SpaceTitle { get; set; } = string.Empty;
    public string SpaceCity { get; set; } = string.Empty;
    public Guid? OwnerId { get; set; }
    public string? OwnerName { get; set; }
    public string? SlotLabel { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminBookingPaymentDto
{
    public Guid Id { get; set; }
    public string? Type { get; set; }         
    public string Status { get; set; } = string.Empty;
    public decimal? BasePrice { get; set; }
    public decimal? HostCommission { get; set; }
    public decimal? PlatformFee { get; set; }
    public decimal? Gst { get; set; }
    public decimal? HostPayout { get; set; }
    public decimal? TotalPayable { get; set; }
    public decimal? RefundAmount { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

public class AdminBookingDetailDto : AdminBookingListItemDto
{
    public string? DriverEmail { get; set; }
    public string? SpaceAddress { get; set; }
    public string? OwnerMobile { get; set; }
    public string? OwnerEmail { get; set; }
    public List<AdminBookingPaymentDto> Payments { get; set; } = new();
}

public class AdminBookingsPageDto : AdminPagedDto<AdminBookingListItemDto>
{
    public AdminBookingCountsDto Counts { get; set; } = new();
}
