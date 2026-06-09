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
      payment_id,
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
      p_start_time: `${formatTime(booking_data.start_time)}`,
      p_end_time: `${formatTime(booking_data.end_time)}`,
      p_exclude_booking_id: booking_data.booking_id
        ? booking_data.booking_id
        : null,
    });

    if (capacityCheck && !capacityCheck.available) {
      return new Response(JSON.stringify({
        error: capacityCheck.error || "No slots available",
        success: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!booking_data.start_time || !booking_data.end_time) {
      throw new Error("Start time and end time are required");
    }

    // const startTime = formatTime(booking_data.start_time)!;
    // const endTime = formatTime(booking_data.end_time)!;
    // const bookingDate = booking_data.booking_date;

    // 🔐 Fetch correct price per hour
    // const { data: space } = await supabaseAdmin
    //   .from("parking_spaces")
    //   .select("price_per_hour")
    //   .eq("id", booking_data.space_id)
    //   .single();

    // if (!space) {
    //   throw new Error("Failed to fetch price_per_hour");
    // }

    // const durationMinutes = booking_data.duration_minutes || 0;
    // const safeTotalPrice = booking_data.total_price;

    if (!booking_data.booking_id) {
      return new Response(JSON.stringify({
        success: false,
        error: "MISSING_LOCK"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        booking_date: booking_data.booking_date,
        start_time: formatTime(booking_data.start_time),
        end_time: formatTime(booking_data.end_time),
        duration_minutes: booking_data.duration_minutes,
        total_price: booking_data.total_price,
        space_title: booking_data.space_title,
        space_address: booking_data.space_address,
        space_city: booking_data.space_city,
        vehicle_type: booking_data.vehicle_type || "car",
        vehicle_id: booking_data.vehicle_id || null,
        slot_id: booking_data.slot_id || null,
        has_used_free_extension: booking_data.has_used_free_extension ?? false,
        free_extension_minutes_used: booking_data.free_extension_minutes_used ?? 0,
        status: "confirmed",
        expires_at: null
      })
      .eq("id", booking_data.booking_id);

    if (updateError) {
      console.error("Booking update error:", updateError);

      return new Response(JSON.stringify({
        success: false,
        error: "BOOKING_UPDATE_FAILED",
        message: updateError.message
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("payments")
      .update({
        razorpay_payment_id: razorpay_payment_id,
        status: "success",
        payment_stage: "payment_verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", payment_id)
      .eq("status", "pending");

    // if (booking_data.booking_id) {
    //   const { error: updateError } = await supabaseAdmin
    //     .from("bookings")
    //     .update({
    //       space_title: booking_data.space_title,
    //       space_address: booking_data.space_address,
    //       space_city: booking_data.space_city,
    //       duration_minutes: durationMinutes,
    //       total_price: safeTotalPrice,
    //       booking_date: bookingDate,
    //       start_time: startTime,
    //       end_time: endTime,
    //       vehicle_type: booking_data.vehicle_type || "car",
    //       vehicle_id: booking_data.vehicle_id || null,
    //       slot_id: booking_data.slot_id || null,
    //       payment_id: razorpay_payment_id,
    //       status: "confirmed",
    //       has_used_free_extension:
    //         booking_data.has_used_free_extension !== undefined
    //           ? booking_data.has_used_free_extension
    //           : false,
    //       free_extension_minutes_used:
    //         booking_data.free_extension_minutes_used !== undefined
    //           ? booking_data.free_extension_minutes_used
    //           : 0,
    //     })
    //     .eq("id", booking_data.booking_id)

    //   if (updateError) {
    //     console.error("Booking update error:", updateError);
    //     return new Response(JSON.stringify({
    //       error: updateError.message,
    //       details: updateError,
    //     }), {
    //       status: 500,
    //       headers: { ...corsHeaders, "Content-Type": "application/json" },
    //     });
    //   }
    // } 

    // else {

    //   const startDateTime = `${booking_data.booking_date} ${startTime}`;
    //   const endDateTime = `${booking_data.booking_date} ${endTime}`;

    //   const { error: insertError } = await supabaseAdmin.from("bookings").insert({
    //     user_id: user.id,
    //     space_id: booking_data.space_id,
    //     space_title: booking_data.space_title,
    //     space_address: booking_data.space_address,
    //     space_city: booking_data.space_city,
    //     duration_minutes: durationMinutes,
    //     total_price: safeTotalPrice,
    //     booking_date: bookingDate,
    //     start_time: startTime,
    //     end_time: endTime,
    //     vehicle_type: booking_data.vehicle_type || "car",
    //     vehicle_id: booking_data.vehicle_id || null,
    //     slot_id: booking_data.slot_id || null,
    //     payment_id: razorpay_payment_id,
    //     status: "confirmed",
    //     original_start_time: startDateTime,
    //     original_end_time: endDateTime,
    //     original_duration_minutes: durationMinutes,
    //     has_used_free_extension: false,
    //     free_extension_minutes_used: 0,
    //   });

    //   if (insertError) {
    //     console.error("Booking insert error:", insertError);

    //     if (insertError.message.includes("no_overlap_per_vehicle")) {
    //       return new Response(JSON.stringify({
    //         success: false,
    //         error: "VEHICLE_CONFLICT"
    //       }), {
    //         status: 200,
    //         headers: { ...corsHeaders, "Content-Type": "application/json" },
    //       });
    //     }

    //     return new Response(JSON.stringify({
    //       success: false,
    //       error: insertError.message
    //     }), {
    //       status: 200,
    //       headers: { ...corsHeaders, "Content-Type": "application/json" },
    //     });
    //   }
    // }

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
