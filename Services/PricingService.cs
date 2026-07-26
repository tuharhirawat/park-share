using Microsoft.Extensions.Options;
using ParkMitra_BE.DTOs.Payment;
using ParkMitra_BE.Options;

namespace ParkMitra_BE.Services
{
    public class PricingService
    {
        private readonly PricingOptions _pricing;

        public PricingService(IOptions<PricingOptions> options)
        {
            _pricing = options.Value;
        }

        public PricingResultDto Calculate(decimal basePrice)
        {
            var serviceFee = _pricing.ServiceFeeEnabled
                ? Math.Round(basePrice * _pricing.ServiceFeePercent / 100m, MidpointRounding.AwayFromZero)
                : 0m;

            var gst = _pricing.GstEnabled
                ? Math.Round(serviceFee * _pricing.GstPercent / 100m, MidpointRounding.AwayFromZero)
                : 0m;

            var hostCommission = Math.Round(basePrice * _pricing.HostCommissionPercent / 100m, MidpointRounding.AwayFromZero);

            return new PricingResultDto
            {
                BasePrice = basePrice,
                ServiceFee = serviceFee,
                Gst = gst,
                HostCommission = hostCommission,
                HostPayout = basePrice - hostCommission,
                TotalPayable = basePrice + serviceFee + gst,
                Version = _pricing.Version
            };
        }
    }
}
