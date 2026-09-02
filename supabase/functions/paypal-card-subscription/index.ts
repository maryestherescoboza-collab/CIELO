import { createClient } from "npm:@supabase/supabase-js";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") as string;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") as string;
const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

const PAYPAL_PLANS: Record<string, string> = {
  "mensual": "P-0W2195799D194881XNKL3BSA",
  "anual": "P-7KE49709A6687770XNKL3BSA"
};

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getPayPalAccessToken(): Promise<string> {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el token de PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Falta encabezado de autorización");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error("No autorizado");
    }

    const { setup_token, plan_type } = await req.json();

    if (!setup_token) {
      throw new Error("setup_token es requerido");
    }

    const planId = PAYPAL_PLANS[plan_type];
    if (!planId) {
      throw new Error("Plan no válido");
    }

    const accessToken = await getPayPalAccessToken();

    // 1. Create Payment Token from Setup Token
    const vaultRes = await fetch(`${PAYPAL_API_BASE}/v3/vault/payment-tokens`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        payment_source: {
          token: {
            id: setup_token,
            type: "SETUP_TOKEN"
          }
        }
      })
    });

    if (!vaultRes.ok) {
      const err = await vaultRes.text();
      console.error("Error creating payment token:", err);
      throw new Error("No se pudo validar la tarjeta con PayPal");
    }

    const vaultData = await vaultRes.json();
    const paymentTokenId = vaultData.id;

    // 2. Create Subscription using the Payment Token
    const subRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: user.id, // VITAL para la vinculación
        payment_source: {
          token: {
            id: paymentTokenId,
            type: "PAYMENT_METHOD_TOKEN"
          }
        }
      })
    });

    if (!subRes.ok) {
      const err = await subRes.text();
      console.error("Error creating subscription:", err);
      throw new Error("No se pudo crear la suscripción en PayPal");
    }

    const subData = await subRes.json();
    const subscriptionId = subData.id;
    const status = subData.status; // e.g. ACTIVE or APPROVAL_PENDING

    // 3. Registrar localmente la suscripción
    const estadoLocal = status === "ACTIVE" ? "activa" : "pendiente";
    
    const { error: insertError } = await supabase
      .from('suscripciones')
      .upsert({ // Upsert por seguridad si el webhook llega antes
        user_id: user.id,
        paypal_subscription_id: subscriptionId,
        tipo: 'individual',
        estado: estadoLocal,
        fecha_inicio: new Date().toISOString()
      }, { onConflict: 'paypal_subscription_id' });

    if (insertError) {
      console.error("Error insertando suscripción local:", insertError);
      throw new Error("No se pudo registrar la suscripción localmente");
    }

    return new Response(JSON.stringify({ subscription_id: subscriptionId, status: estadoLocal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
