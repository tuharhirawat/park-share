import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(JSON.stringify({
      success: false,
      error: "UNAUTHORIZED"
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { booking_data, payment_data } = await req.json();

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      user_id: booking_data.user_id,
      space_id: booking_data.space_id,
      space_title: booking_data.space_title,
      space_address: booking_data.space_address,
      space_city: booking_data.space_city,
      booking_date: booking_data.booking_date,
      start_time: booking_data.start_time,
      end_time: booking_data.end_time,
      duration_minutes: booking_data.duration_minutes,
      original_duration_minutes: booking_data.duration_minutes,
      total_price: booking_data.total_price,
      vehicle_type: booking_data.vehicle_type,
      vehicle_id: booking_data.vehicle_id,
      slot_id: booking_data.slot_id,
      status: "pending",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error("Lock error:", error);

    if (error.message.includes("no_overlap_per_vehicle")) {
      return new Response(JSON.stringify({
        success: false,
        error: "VEHICLE_CONFLICT"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: "LOCK_FAILED"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { error: paymentError } = await supabase
    .from("payments")
    .insert({
      booking_id: data.id,
      user_id: booking_data.user_id,
      amount: Number(booking_data.total_price),
      currency: "INR",
      status: "pending",
      payment_type: "booking",
      base_price: payment_data.base_price,
      host_payout: payment_data.host_payout,
      host_commission: payment_data.host_commission,
      platform_fee: payment_data.platform_fee,
      gst_amount: payment_data.gst_amount,
      total_payable: payment_data.total_payable,
      pricing_version: payment_data.pricing_version,
      payment_stage: "booking_created"
    });

  if (paymentError) {

    await supabase
      .from("bookings")
      .delete()
      .eq("id", data.id);

    return new Response(
      JSON.stringify({
        success: false,
        error: "PAYMENT_INIT_FAILED"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  return new Response(JSON.stringify({
    success: true,
    booking_id: data.id
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});