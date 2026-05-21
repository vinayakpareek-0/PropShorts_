import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlanId = "starter" | "pro";

const planPriceEnv: Record<PlanId, string> = {
  starter: "STRIPE_STARTER_PRICE_ID",
  pro: "STRIPE_PRO_PRICE_ID",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formBody(values: Record<string, string | number | boolean | null | undefined>) {
  const body = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined) body.set(key, String(value));
  });
  return body;
}

async function stripeRequest<T>(path: string, secretKey: string, values: Record<string, string | number | boolean | null | undefined>) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody(values),
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
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Use POST to create a checkout session." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || req.headers.get("origin") || "https://propshorts.netlify.app";
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !stripeSecretKey) {
    return jsonResponse({ success: false, error: "Billing is not configured yet." }, 500);
  }
  if (!authorization) return jsonResponse({ success: false, error: "You must be signed in." }, 401);

  const body = await req.json().catch(() => ({}));
  const planId = body?.plan_id === "pro" ? "pro" : body?.plan_id === "starter" ? "starter" : null;
  if (!planId) return jsonResponse({ success: false, error: "Choose a valid paid plan." }, 400);

  const priceId = Deno.env.get(planPriceEnv[planId]);
  if (!priceId) return jsonResponse({ success: false, error: "The selected plan is not configured." }, 500);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;
  if (authError || !user) return jsonResponse({ success: false, error: "Your session could not be verified." }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: subscription } = await serviceSupabase
    .from("broker_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = subscription?.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripeRequest<{ id: string }>("customers", stripeSecretKey, {
      email: (profile?.email as string | null) || user.email || null,
      name: (profile?.full_name as string | null) || null,
      "metadata[user_id]": user.id,
      "metadata[app]": "propshorts",
    });
    customerId = customer.id;

    await serviceSupabase.from("broker_subscriptions").upsert(
      {
        user_id: user.id,
        plan_id: "free",
        status: "free",
        stripe_customer_id: customerId,
      },
      { onConflict: "user_id" },
    );
  }

  const session = await stripeRequest<{ id: string; url: string | null }>("checkout/sessions", stripeSecretKey, {
    mode: "subscription",
    customer: customerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": 1,
    success_url: `${appBaseUrl}/account/subscription?checkout=success`,
    cancel_url: `${appBaseUrl}/account/subscription?checkout=cancelled`,
    client_reference_id: user.id,
    allow_promotion_codes: true,
    "metadata[user_id]": user.id,
    "metadata[plan_id]": planId,
    "subscription_data[metadata][user_id]": user.id,
    "subscription_data[metadata][plan_id]": planId,
  });

  return jsonResponse({ success: true, checkout_url: session.url, session_id: session.id });
});
