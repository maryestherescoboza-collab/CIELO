import { createClient } from "npm:@supabase/supabase-js";
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") as string;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") as string;

// Fase Live
const PAYPAL_API_BASE = "https://api-m.paypal.com";

// Setup Supabase admin client to insert into suscripciones (since it bypasses RLS if needed, though RLS should allow insert for own user. Using service key ensures we can insert before the webhook comes)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const PLAN_ID_MENSUAL = "P-4131029904627403DNLCUUHA";
const PLAN_ID_ANUAL = "P-1WC41170AP726083TNLCUWQY";

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
    let errObj;
    try {
      errObj = await response.json();
    } catch {
      errObj = { error_description: await response.text() };
    }
    const safeError = {
      status: response.status,
      name: errObj.error || 'Unknown',
      message: errObj.error_description || 'Unknown error',
      debug_id: errObj.debug_id || 'N/A'
    };
    const errorBody = JSON.stringify({
      error: "PayPal OAuth Error",
      paypal_error: safeError
    });
    throw new Error(`OAUTH_ERROR:${errorBody}`);
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

    // Comprobar si el usuario ya tiene una suscripción activa (Evitar duplicados)
    const { data: existingSubs, error: subsError } = await supabaseAdmin
      .from('suscripciones')
      .select('estado')
      .eq('user_id', user.id)
      .eq('estado', 'activa');

    if (subsError) {
      console.error("Error consultando suscripciones existentes:", subsError);
      throw new Error("Error interno al verificar estado actual.");
    }

    if (existingSubs && existingSubs.length > 0) {
      return new Response(JSON.stringify({ error: 'Ya tienes una suscripción activa. No puedes crear otra.' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let planType = 'mensual';
    try {
      const body = await req.json();
      if (body.planType === 'anual') {
        planType = 'anual';
      }
    } catch {
      // Body vacío o inválido, usamos 'mensual' por defecto
    }

    const PLAN_ID = planType === 'anual' ? PLAN_ID_ANUAL : PLAN_ID_MENSUAL;

    const accessToken = await getPayPalAccessToken();

    // Determinar la URL base dinámica respetando el origen del usuario (evaluacielo.com vs www.evaluacielo.com)
    // para garantizar que al retornar conserve su sesión activa en localStorage.
    const originHeader = req.headers.get("origin") || req.headers.get("referer");
    let baseUrl = "https://evaluacielo.com";
    if (originHeader) {
      try {
        const parsedUrl = new URL(originHeader);
        const host = parsedUrl.hostname.toLowerCase();
        if (
          host === "evaluacielo.com" ||
          host === "www.evaluacielo.com" ||
          host.endsWith(".vercel.app") ||
          host === "localhost" ||
          host === "127.0.0.1"
        ) {
          baseUrl = parsedUrl.origin;
        }
      } catch {
        // Fallback seguro a baseUrl por defecto
      }
    }

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
        plan_id: PLAN_ID,
        custom_id: user.id, // VITAL: Mapeo de usuario
        application_context: {
          brand_name: "Evaluación CIELO",
          locale: "es-ES",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${baseUrl}/suscripcion/paypal/retorno`,
          cancel_url: `${baseUrl}/suscripcion/paypal/cancelada`
        }
      })
    });

    if (!createSubRes.ok) {
      let errObj;
      try {
        errObj = await createSubRes.json();
      } catch {
        errObj = { message: await createSubRes.text() };
      }
      
      const safeError = {
        status: createSubRes.status,
        name: errObj.name,
        message: errObj.message,
        details: errObj.details,
        debug_id: errObj.debug_id
      };

      console.error("PayPal Error:", JSON.stringify(safeError, null, 2));

      return new Response(JSON.stringify({ error: 'PayPal API Error', paypal_error: safeError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const subData = await createSubRes.json();
    const subscriptionId = subData.id;
    
    // Obtener la URL de aprobación
    const approveLink = subData.links?.find((link: { rel?: string; href?: string }) => link.rel === "approve");
    if (!approveLink) {
      throw new Error("PayPal no devolvió una URL de aprobación válida.");
    }

    // Registrar localmente la suscripción ANTES de devolver al usuario.
    // Usamos upsert ignorando duplicados para que, si el webhook llegó primero
    // y concilió la fila, no fallemos ni degrademos su estado.
    const { error: insertError } = await supabaseAdmin
      .from('suscripciones')
      .upsert({
        paypal_subscription_id: subscriptionId,
        user_id: user.id,
        estado: 'pendiente',
        tipo: 'individual',
        provider: 'paypal',
        plan_id: PLAN_ID,
        fecha_inicio: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'paypal_subscription_id', ignoreDuplicates: true });

    if (insertError) {
      console.error("Error registrando suscripción local:", insertError);
      throw new Error("Error interno al preparar la suscripción");
    }

    // Verificar que el vínculo quedó persistido con el mismo identificador.
    const { data: persistedSub, error: persistedError } = await supabaseAdmin
      .from('suscripciones')
      .select('id, user_id, paypal_subscription_id')
      .eq('paypal_subscription_id', subscriptionId)
      .maybeSingle();

    if (persistedError || !persistedSub || persistedSub.user_id !== user.id) {
      console.error("Error verificando suscripción local:", persistedError);
      throw new Error("Error interno al verificar la suscripción");
    }

    // Limpiar solo pendientes antiguos para no borrar suscripciones en vuelo.
    // Nunca tocamos la suscripción recién creada ni filas activas.
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('suscripciones')
      .delete()
      .eq('user_id', user.id)
      .eq('estado', 'pendiente')
      .neq('paypal_subscription_id', subscriptionId)
      .lt('created_at', staleThreshold);

    return new Response(JSON.stringify({ approval_url: approveLink.href, subscriptionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Function error:", error);
    if (message.startsWith('OAUTH_ERROR:')) {
      const jsonStr = message.replace('OAUTH_ERROR:', '');
      return new Response(jsonStr, {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
