import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      price?: { id?: string };
    }>;
  };
};

type StripeCheckoutSession = {
  id: string;
  mode?: string;
  customer?: string;
  subscription?: string;
  client_reference_id?: string;
  metadata?: Record<string, string>;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value];
  }));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return safeEqual(expected, signature);
}

function fromUnix(value?: number | null) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function planFromPrice(priceId: string | null) {
  if (!priceId) return "free";
  if (priceId === Deno.env.get("STRIPE_PRO_PRICE_ID")) return "pro";
  if (priceId === Deno.env.get("STRIPE_STARTER_PRICE_ID")) return "starter";
  return "free";
}

async function stripeGet<T>(path: string, secretKey: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "Stripe request failed.";
    throw new Error(message);
  }
  return data as T;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Use POST for Stripe webhooks." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !webhookSecret) {
    return jsonResponse({ success: false, error: "Stripe webhook is not configured." }, 500);
  }

  const payload = await req.text();
  const isValid = await verifyStripeSignature(payload, req.headers.get("stripe-signature"), webhookSecret);
  if (!isValid) return jsonResponse({ success: false, error: "Invalid Stripe signature." }, 400);

  const event = JSON.parse(payload) as { type: string; data: { object: unknown } };
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  async function upsertSubscription(subscription: StripeSubscription, fallbackUserId?: string | null) {
    const priceId = subscription.items?.data?.[0]?.price?.id || null;
    const userId = subscription.metadata?.user_id || fallbackUserId || null;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

    if (!userId && !customerId) return;

    const row = {
      ...(userId ? { user_id: userId } : {}),
      plan_id: subscription.status === "canceled" ? "free" : planFromPrice(priceId),
      status: subscription.status === "canceled" ? "canceled" : subscription.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      current_period_start: fromUnix(subscription.current_period_start),
      current_period_end: fromUnix(subscription.current_period_end),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      canceled_at: fromUnix(subscription.canceled_at),
      metadata: {
        last_event_type: event.type,
        stripe_subscription_metadata: subscription.metadata || {},
      },
    };

    if (userId) {
      await supabase.from("broker_subscriptions").upsert(row, { onConflict: "user_id" });
      return;
    }

    await supabase.from("broker_subscriptions").update(row).eq("stripe_customer_id", customerId);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as StripeCheckoutSession;
    if (session.mode === "subscription" && session.subscription) {
      const subscription = await stripeGet<StripeSubscription>(`subscriptions/${session.subscription}`, stripeSecretKey);
      await upsertSubscription(subscription, session.client_reference_id || session.metadata?.user_id || null);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await upsertSubscription(event.data.object as StripeSubscription);
  }

  return jsonResponse({ received: true });
});
