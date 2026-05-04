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

  const { booking_data } = await req.json();

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...booking_data,
      original_duration_minutes: booking_data.duration_minutes,
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

  return new Response(JSON.stringify({
    success: true,
    booking_id: data.id
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});