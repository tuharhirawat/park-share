import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) throw new Error("Razorpay secret not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_data,
    } = await req.json();

    // Verify signature using HMAC SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Double-check capacity using service role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: capacityCheck } = await supabaseAdmin.rpc("check_parking_capacity", {
      p_space_id: booking_data.space_id,
      p_vehicle_type: booking_data.vehicle_type || "car",
      p_booking_date: booking_data.booking_date,
      p_start_time: booking_data.start_time,
      p_end_time: booking_data.end_time || "23:59",
    });

    if (capacityCheck && !capacityCheck.available) {
      return new Response(JSON.stringify({
        error: capacityCheck.error || "No slots available",
        success: false,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert booking with confirmed status
    const { error: insertError } = await supabase.from("bookings").insert({
      user_id: user.id,
      space_id: booking_data.space_id,
      space_title: booking_data.space_title,
      space_address: booking_data.space_address,
      space_city: booking_data.space_city,
      hours: booking_data.hours,
      total_price: booking_data.total_price,
      booking_date: booking_data.booking_date,
      start_time: booking_data.start_time,
      end_time: booking_data.end_time || null,
      vehicle_type: booking_data.vehicle_type || "car",
      vehicle_id: booking_data.vehicle_id || null,
      slot_id: booking_data.slot_id || null,
      payment_id: razorpay_payment_id,
      status: "confirmed",
    });

    if (insertError) {
      console.error("Booking insert error:", insertError);
      throw new Error("Failed to save booking");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
