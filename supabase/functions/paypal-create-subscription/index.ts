import { createClient } from "npm:@supabase/supabase-js";
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") as string;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") as string;

// Fase Sandbox
const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

// Setup Supabase admin client to insert into suscripciones (since it bypasses RLS if needed, though RLS should allow insert for own user. Using service key ensures we can insert before the webhook comes)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const PLAN_IDS = {
  mensual: "P-0W2195799D194881XNKL3BSA",
  anual: "P-7KE49709A6687770XNKL3BSA"
};

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

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Falta encabezado de autorización' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Usar el cliente autenticado para verificar al usuario
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') as string, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { plan_type } = body;

    if (plan_type !== 'mensual' && plan_type !== 'anual') {
      return new Response(JSON.stringify({ error: 'Plan inválido' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const planId = PLAN_IDS[plan_type];
    const accessToken = await getPayPalAccessToken();

    // Crear suscripción en PayPal
    const createSubRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: user.id, // VITAL: Mapeo de usuario
        application_context: {
          brand_name: "Evaluación CIELO",
          locale: "es-ES",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: "https://evaluacielo.com/suscripcion/paypal/retorno",
          cancel_url: "https://evaluacielo.com/suscripcion/paypal/cancelada"
        }
      })
    });

    if (!createSubRes.ok) {
      const errData = await createSubRes.text();
      console.error("Error creating subscription in PayPal:", errData);
      throw new Error("Error al comunicarse con PayPal");
    }

    const subData = await createSubRes.json();
    const subscriptionId = subData.id;
    
    // Obtener la URL de aprobación
    const approveLink = subData.links?.find((link: any) => link.rel === "approve");
    if (!approveLink) {
      throw new Error("PayPal no devolvió una URL de aprobación válida.");
    }

    // Insertar en la base de datos ANTES de devolver al usuario
    const { error: insertError } = await supabaseAdmin
      .from('suscripciones')
      .insert({
        paypal_subscription_id: subscriptionId,
        user_id: user.id,
        estado: 'pendiente',
        tipo: 'individual'
      });

    if (insertError) {
      // Si la fila ya existe (raro), o falla, fallamos duro para que no avance
      console.error("Error insertando suscripción local:", insertError);
      throw new Error("Error interno al preparar la suscripción");
    }

    return new Response(JSON.stringify({ approval_url: approveLink.href }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
