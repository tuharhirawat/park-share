import { PRICING_CONFIG } from "@/config/pricing";

export const calculatePricing = (basePrice: number) => {

  const serviceFee = PRICING_CONFIG.serviceFee.enabled
    ? Math.round(
      basePrice * PRICING_CONFIG.serviceFee.percent
      / 100
    )
    : 0;

  const gst = PRICING_CONFIG.gst.enabled
    ? Math.round(
      serviceFee * PRICING_CONFIG.gst.percent
      / 100
    )
    : 0;

  const hostCommission = Math.round(
    basePrice * PRICING_CONFIG.commission.hostCommissionPercent
    / 100
  );

  const hostPayout = basePrice - hostCommission;

  return {
    basePrice,
    serviceFee,
    gst,
    hostCommission,
    hostPayout,
    totalPayable: basePrice + serviceFee + gst,
    version: PRICING_CONFIG.pricingVersion
  };
};