export const PRICING_CONFIG = {

  pricingVersion: "v1",

  commission: {
    enabled: true,
    hostCommissionPercent: 20
  },

  serviceFee: {
    enabled: false,
    percent: 0
  },

  gst: {
    enabled: false,
    percent: 18
  }

} as const;