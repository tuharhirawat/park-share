import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) throw new Error("Razorpay secret not configured");

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_data,
    } = await req.json();

    if (!booking_data?.space_id) {
      throw new Error("Missing space_id in booking_data");
    }

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formatTime = (t?: string | null) => {
      if (!t) return null;
      return t.length === 5 ? `${t}:00` : t;
    };

    const { data: capacityCheck } = await supabaseAdmin.rpc("check_parking_capacity", {
      p_space_id: booking_data.space_id,
      p_vehicle_type: booking_data.vehicle_type || "car",
      p_booking_date: booking_data.booking_date,
      p_start_time: formatTime(booking_data.start_time),
      p_end_time: formatTime(booking_data.end_time) || "23:59:00",
      p_exclude_booking_id: booking_data.booking_id
        ? booking_data.booking_id
        : null,
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
    
    const startTime = formatTime(booking_data.start_time);
    const endTime = formatTime(booking_data.end_time);
    const bookingDate = booking_data.booking_date;
    const startDateTime = startTime
      ? `${bookingDate} ${startTime}`
      : null;
    const endDateTime = endTime
      ? `${bookingDate} ${endTime}`
      : null;

    if (booking_data.booking_id) {
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({
          space_title: booking_data.space_title,
          space_address: booking_data.space_address,
          space_city: booking_data.space_city,
          hours: booking_data.hours,
          total_price: booking_data.total_price,
          booking_date: bookingDate,
          start_time: startDateTime,
          end_time: endDateTime,
          vehicle_type: booking_data.vehicle_type || "car",
          vehicle_id: booking_data.vehicle_id || null,
          slot_id: booking_data.slot_id || null,
          payment_id: razorpay_payment_id,
          status: "confirmed",
          has_used_free_extension:
            booking_data.has_used_free_extension !== undefined
              ? booking_data.has_used_free_extension
              : false,
        })
        .eq("id", booking_data.booking_id)

      if (updateError) {
        console.error("Booking update error:", updateError);
        return new Response(JSON.stringify({
          error: updateError.message,
          details: updateError,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      let originalDurationMinutes = 0;

      if (startTime && endTime) {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        originalDurationMinutes = (eh * 60 + em) - (sh * 60 + sm);
      }

      const { error: insertError } = await supabaseAdmin.from("bookings").insert({
        user_id: user.id,
        space_id: booking_data.space_id,
        space_title: booking_data.space_title,
        space_address: booking_data.space_address,
        space_city: booking_data.space_city,
        hours: booking_data.hours,
        total_price: booking_data.total_price,
        booking_date: bookingDate,
        start_time: startDateTime,
        end_time: endDateTime,
        vehicle_type: booking_data.vehicle_type || "car",
        vehicle_id: booking_data.vehicle_id || null,
        slot_id: booking_data.slot_id || null,
        payment_id: razorpay_payment_id,
        status: "confirmed",
        original_start_time: startDateTime,
        original_end_time: endDateTime,
        original_duration_minutes: originalDurationMinutes,
        has_used_free_extension: false,
      });

      if (insertError) {
        console.error("Booking insert error:", insertError);
        return new Response(JSON.stringify({
          error: insertError.message,
          details: insertError,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("FULL ERROR:", error);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
