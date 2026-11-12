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

const PLAN_ID_MENSUAL = "P-4131029904627403DNLCUUHA";
const PLAN_ID_ANUAL = "P-1WC41170AP726083TNLCUWQY";
const VALID_PLAN_IDS = [PLAN_ID_MENSUAL, PLAN_ID_ANUAL];

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    const errText = await response.text();
    console.error("PayPal OAuth Error:", errText);
    throw new Error("No se pudo autenticar con la API de PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
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
    const subscriptionId = body.subscriptionId;

    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: 'subscriptionId es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Buscar la suscripción local por el mismo identificador con el que se guardó.
    const { data: localSub, error: localSubError } = await supabaseAdmin
      .from('suscripciones')
      .select('id, user_id, estado, paypal_subscription_id')
      .eq('paypal_subscription_id', subscriptionId)
      .maybeSingle();

    if (localSubError) {
      console.error("Error consultando suscripción local:", localSubError);
      return new Response(JSON.stringify({ error: 'Error interno al consultar la suscripción' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Si existe pero pertenece a otro usuario, denegar.
    if (localSub && localSub.user_id !== user.id) {
      console.error(`Security Alert: suscripción ${subscriptionId} pertenece a otro usuario.`);
      return new Response(JSON.stringify({ error: 'Suscripción no encontrada para este usuario' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Si ya está activa, devolvemos éxito inmediato
    if (localSub?.estado === 'activa') {
      return new Response(JSON.stringify({ estado: 'activa', active: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Consultar autenticidad directamente con la API de PayPal
    const accessToken = await getPayPalAccessToken();
    const paypalRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!paypalRes.ok) {
      const errText = await paypalRes.text();
      console.error(`Error consultando suscripción ${subscriptionId} en PayPal:`, errText);
      return new Response(JSON.stringify({ error: 'No se pudo verificar con PayPal', details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const paypalSub = await paypalRes.json();

    // Verificación de seguridad: custom_id debe coincidir con el user_id
    if (!paypalSub.custom_id || paypalSub.custom_id !== user.id) {
      console.error(`Security Alert: custom_id mismatch en verificación directa. DB: ${user.id}, PayPal: ${paypalSub.custom_id}`);
      return new Response(JSON.stringify({ error: 'Discrepancia de seguridad en la suscripción' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verificación de seguridad: plan_id debe ser un plan oficial de CIELO
    if (!paypalSub.plan_id || !VALID_PLAN_IDS.includes(paypalSub.plan_id)) {
      console.error(`Security Alert: plan_id no reconocido. PayPal: ${paypalSub.plan_id}`);
      return new Response(JSON.stringify({ error: 'Plan de suscripción no autorizado por CIELO' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Si la fila local no existe (webhook retrasado o registro local perdido),
    // conciliar de forma segura usando la identidad ya autenticada y el
    // custom_id verificado de PayPal. Nunca se activa en este paso.
    if (!localSub) {
      const { data: activeSubs, error: conflictError } = await supabaseAdmin
        .from('suscripciones')
        .select('id, paypal_subscription_id')
        .eq('user_id', user.id)
        .eq('estado', 'activa')
        .limit(5);

      if (conflictError) {
        console.error("Error comprobando suscripciones activas:", conflictError);
        return new Response(JSON.stringify({ error: 'Error interno al verificar la suscripción' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const conflict = (activeSubs ?? []).find(
        (sub) => sub.paypal_subscription_id !== subscriptionId
      );
      if (conflict) {
        return new Response(JSON.stringify({ error: 'Ya existe una suscripción activa diferente para este usuario' }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { error: insertError } = await supabaseAdmin
        .from('suscripciones')
        .upsert({
          paypal_subscription_id: subscriptionId,
          user_id: user.id,
          estado: 'pendiente',
          tipo: 'individual',
          provider: 'paypal',
          plan_id: paypalSub.plan_id,
          fecha_inicio: paypalSub.start_time || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'paypal_subscription_id', ignoreDuplicates: true });

      if (insertError) {
        console.error("Error conciliando suscripción local:", insertError);
        return new Response(JSON.stringify({ error: 'Error interno al registrar la suscripción' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: reconciled, error: reconciledError } = await supabaseAdmin
        .from('suscripciones')
        .select('id, user_id, estado, paypal_subscription_id')
        .eq('paypal_subscription_id', subscriptionId)
        .maybeSingle();

      if (reconciledError || !reconciled || reconciled.user_id !== user.id) {
        console.error("Error verificando la suscripción conciliada:", reconciledError);
        return new Response(JSON.stringify({ error: 'Error interno al verificar la suscripción' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`[paypal-verify-subscription] Conciliación segura aplicada para ${subscriptionId} y usuario ${user.id}`);
    }

    const status = paypalSub.status; // 'ACTIVE', 'APPROVED', 'SUSPENDED', 'CANCELLED', etc.

    // GESTIÓN ESTRICTA: Solo 'ACTIVE' otorga acceso Premium.
    // 'APPROVED' significa que el usuario aceptó en PayPal pero el primer cobro/ciclo aún no se activa.
    if (status === 'ACTIVE') {
      // Nunca activar una segunda suscripción si el usuario ya tiene otra activa.
      const { data: otherActive, error: otherActiveError } = await supabaseAdmin
        .from('suscripciones')
        .select('id, paypal_subscription_id')
        .eq('user_id', user.id)
        .eq('estado', 'activa')
        .limit(5);

      if (otherActiveError) {
        console.error("Error comprobando suscripciones activas:", otherActiveError);
        return new Response(JSON.stringify({ error: 'Error interno al verificar la suscripción' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const duplicateActive = (otherActive ?? []).find(
        (sub) => sub.paypal_subscription_id !== subscriptionId
      );
      if (duplicateActive) {
        return new Response(JSON.stringify({ error: 'Ya existe una suscripción activa diferente para este usuario' }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const nextBillingTime = paypalSub.billing_info?.next_billing_time || null;
      
      const { error: updateError } = await supabaseAdmin
        .from('suscripciones')
        .update({
          estado: 'activa',
          fecha_fin: nextBillingTime,
          updated_at: new Date().toISOString()
        })
        .eq('paypal_subscription_id', subscriptionId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error actualizando suscripción a activa:", updateError);
        throw updateError;
      }

      console.log(`[paypal-verify-subscription] Suscripción ${subscriptionId} verificada y activada exitosamente para usuario ${user.id}`);
      return new Response(JSON.stringify({ estado: 'activa', active: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (status === 'APPROVED') {
      console.log(`[paypal-verify-subscription] Suscripción ${subscriptionId} en estado APPROVED. Pendiente de activación por PayPal.`);
      return new Response(JSON.stringify({ 
        estado: 'approved', 
        active: false, 
        message: 'Suscripción aprobada por el usuario, pendiente de consolidación por PayPal.' 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ estado: status ? status.toLowerCase() : 'desconocido', active: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error en paypal-verify-subscription:", err);
    return new Response(JSON.stringify({ error: message || 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

