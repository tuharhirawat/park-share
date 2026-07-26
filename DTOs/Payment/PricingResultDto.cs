namespace ParkMitra_BE.DTOs.Payment
{
    public class PricingResultDto
    {
        public decimal BasePrice { get; set; }
        public decimal ServiceFee { get; set; }
        public decimal Gst { get; set; }
        public decimal HostCommission { get; set; }
        public decimal HostPayout { get; set; }
        public decimal TotalPayable { get; set; }
        public string Version { get; set; } = string.Empty;
    }
}
