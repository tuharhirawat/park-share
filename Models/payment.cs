using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class payment
{
    public Guid id { get; set; }

    public Guid? booking_id { get; set; }

    public Guid? user_id { get; set; }

    public string? razorpay_order_id { get; set; }

    public string? razorpay_payment_id { get; set; }

    public decimal amount { get; set; }

    public string? currency { get; set; }

    public string status { get; set; } = null!;

    public string payment_type { get; set; } = null!;

    public string? coupon_code { get; set; }

    public decimal? discount_amount { get; set; }

    public decimal? refund_amount { get; set; }

    public DateTime? created_at { get; set; }

    public decimal? base_price { get; set; }

    public decimal? host_payout { get; set; }

    public decimal? host_commission { get; set; }

    public decimal? platform_fee { get; set; }

    public decimal? gst_amount { get; set; }

    public decimal? total_payable { get; set; }

    public string? pricing_version { get; set; }

    public string? payment_stage { get; set; }

    public string? failure_reason { get; set; }

    public DateTime? verified_at { get; set; }

    public DateTime? order_created_at { get; set; }

    public string gateway_name { get; set; } = null!;

    public virtual booking? booking { get; set; }
}
