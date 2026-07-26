namespace ParkMitra_BE.Options
{
    public class PricingOptions
    {
        public string Version { get; set; } = "v1";

        public decimal HostCommissionPercent { get; set; }

        public bool ServiceFeeEnabled { get; set; }

        public decimal ServiceFeePercent { get; set; }

        public bool GstEnabled { get; set; }

        public decimal GstPercent { get; set; }
    }
}