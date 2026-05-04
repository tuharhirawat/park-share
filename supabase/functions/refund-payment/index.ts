import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.payment_id) {
      return new Response(
        JSON.stringify({ error: "Missing payment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { payment_id } = body;

    const razorpayKey = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    const auth = btoa(`${razorpayKey}:${razorpaySecret}`);

    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${payment_id}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});