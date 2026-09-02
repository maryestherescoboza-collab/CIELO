import { createClient } from "npm:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") as string;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") as string;
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") as string;

// Fase Sandbox
const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuración centralizada de Planes de PayPal (IDs reales se configurarán en FASE 4)
const PAYPAL_PLANS: Record<string, { planId: string, amount: string, currency: string }> = {
  "docente_mensual": {
    planId: "P-0W2195799D194881XNKL3BSA",
    amount: "6.00",
    currency: "USD"
  },
  "docente_anual_12_cuotas": {
    planId: "PENDING_ANUAL_PLAN_ID",
    amount: "4.50",
    currency: "USD"
  }
};

// Timeout estricto para evitar que la Edge Function quede colgada.
// Total teórico máx por evento: 3 llamadas * 15s = 45s.
// Totalmente seguro comparado con el timeout de reclamación (5 minutos).
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function getPayPalAccessToken(): Promise<string> {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetchWithTimeout(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
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

async function verifyPayPalWebhookSignature(req: Request, rawBody: string, accessToken: string): Promise<boolean> {
  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  const verificationBody = {
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(rawBody)
  };

  const response = await fetchWithTimeout(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(verificationBody)
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.verification_status === "SUCCESS";
}

function extractSubscriptionId(event: any): string | null {
  const eventType = event.event_type;
  if (eventType === "PAYMENT.SALE.COMPLETED") {
    // Para pagos, el ID de suscripción viene en billing_agreement_id
    return event.resource?.billing_agreement_id || null;
  } else if (eventType.startsWith("BILLING.SUBSCRIPTION.")) {
    // Para eventos de suscripción, es el propio id del recurso
    return event.resource?.id || null;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const rawBody = await req.text();
    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.event_type;

    if (!eventId || !eventType) {
      return new Response("Invalid payload", { status: 400 });
    }

    // 1. Obtener Token de PayPal y Verificar Firma Oficial
    const accessToken = await getPayPalAccessToken();
    const isSignatureValid = await verifyPayPalWebhookSignature(req, rawBody, accessToken);

    if (!isSignatureValid) {
      console.error(`Firma de Webhook inválida para evento ${eventId}`);
      return new Response("Invalid signature", { status: 401 });
    }

    const subscriptionId = extractSubscriptionId(event);

    // 2. Control de Idempotencia Seguro y Reclamación Atómica (FENCING TOKEN)
    // Usamos una función RPC (stored procedure) para garantizar exclusión mutua en PostgreSQL
    const { data: claimResult, error: claimError } = await supabase.rpc(
      "claim_paypal_event",
      {
        p_event_id: eventId,
        p_event_type: eventType,
        p_subscription_id: subscriptionId,
        p_timeout_minutes: 5 // 5 min para eventos fallidos
      }
    );

    if (claimError) {
      console.error(`Error al reclamar evento ${eventId}:`, claimError);
      throw claimError;
    }

    // claimResult devuelve un arreglo/objeto según config, asumimos formato { status, token } de la RPC
    const claimStatus = claimResult[0]?.status || claimResult?.status;
    const claimToken = claimResult[0]?.token || claimResult?.token;

    if (claimStatus === "ALREADY_PROCESSED") {
      console.log(`Evento ${eventId} ya fue procesado correctamente. Ignorando.`);
      return new Response("Already processed", { status: 200 });
    }

    if (claimStatus === "PROCESSING") {
      console.log(`Evento ${eventId} está siendo procesado por otra solicitud. Ignorando concurrencia.`);
      // Retornamos 200 para evitar reintentos de PayPal mientras el primer request está activo
      return new Response("Processing in progress", { status: 200 });
    }

    // claimStatus === "CLAIMED": Tenemos exclusión mutua garantizada temporalmente y un claim_token
    console.log(`Evento ${eventId} reclamado exitosamente. Token: ${claimToken}`);

    // 3. Procesamiento del Evento
    let requiresSubscriptionUpdate = false;
    let newEstado: string | null = null;
    let newFechaFin: string | null = null;

    if (subscriptionId) {
      // Obtenemos la suscripción local
      const { data: subData, error: subError } = await supabase
        .from("suscripciones")
        .select("*")
        .eq("paypal_subscription_id", subscriptionId)
        .single();

      if (subError || !subData) {
        throw new Error("Subscription not found locally");
      }

      // Obtener los datos oficiales de la suscripción desde la API de PayPal (con timeout)
      const subResponse = await fetchWithTimeout(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      if (!subResponse.ok) {
        throw new Error("Could not fetch subscription details from PayPal API");
      }

      const paypalSub = await subResponse.json();

      // Validación estricta de custom_id
      const customId = paypalSub.custom_id;
      if (!customId) {
        throw new Error("Security Alert: custom_id is missing from PayPal subscription");
      }
      if (customId !== subData.user_id) {
        throw new Error("Security Alert: custom_id mismatch between PayPal and local DB");
      }

      // Validar Plan ID de PayPal
      const paypalPlanId = paypalSub.plan_id;
      if (!paypalPlanId) {
        throw new Error("Security Alert: plan_id missing from PayPal subscription");
      }

      // Buscamos a qué plan interno corresponde el plan de PayPal
      let matchedPlanKey = null;
      for (const [key, plan] of Object.entries(PAYPAL_PLANS)) {
        if (plan.planId === paypalPlanId) {
          matchedPlanKey = key;
          break;
        }
      }

      if (!matchedPlanKey) {
        throw new Error(`Security Alert: Unrecognized PayPal plan_id: ${paypalPlanId}`);
      }

      const expectedPlan = PAYPAL_PLANS[matchedPlanKey];

      switch (eventType) {
        case "BILLING.SUBSCRIPTION.ACTIVATED":
        case "BILLING.SUBSCRIPTION.UPDATED":
          requiresSubscriptionUpdate = true;
          newEstado = "activa";
          if (!paypalSub.billing_info?.next_billing_time) {
            throw new Error("Missing next_billing_time in ACTIVATED/UPDATED event");
          }
          newFechaFin = paypalSub.billing_info.next_billing_time;
          break;

        case "BILLING.SUBSCRIPTION.CANCELLED":
          requiresSubscriptionUpdate = true;
          newEstado = "cancelada";
          // Conserva la fecha_fin intacta, para que se respete el periodo ya pagado.
          break;

        case "BILLING.SUBSCRIPTION.SUSPENDED":
          requiresSubscriptionUpdate = true;
          newEstado = "suspendida";
          break;

        case "BILLING.SUBSCRIPTION.EXPIRED":
          requiresSubscriptionUpdate = true;
          newEstado = "vencida";
          break;

        case "PAYMENT.SALE.COMPLETED":
          // Validar el pago completado.
          const amount = event.resource?.amount?.total;
          const currency = event.resource?.amount?.currency;

          if (currency !== "USD") {
            throw new Error(`Currency mismatch. Expected USD, got ${currency}`);
          }

          if (amount !== expectedPlan.amount) {
            throw new Error(`Amount mismatch. Expected ${expectedPlan.amount}, got ${amount}`);
          }

          if (!paypalSub.billing_info?.next_billing_time) {
            throw new Error("Missing next_billing_time in PAYMENT.SALE.COMPLETED event");
          }

          requiresSubscriptionUpdate = true;
          newFechaFin = paypalSub.billing_info.next_billing_time;
          newEstado = "activa";
          break;

        case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
          console.warn(`Pago fallido para suscripción: ${subscriptionId}`);
          break;

        case "BILLING.SUBSCRIPTION.CREATED":
          console.log("Suscripción creada en PayPal. A la espera de activación.");
          break;

        default:
          console.log(`Evento ${eventType} ignorado.`);
          break;
      }
    } else {
      console.log(`El evento ${eventId} no contiene un subscription_id válido.`);
    }

    // 4. Finalización atómica mediante Fencing Token
    // Este RPC asegura que nadie nos haya robado el evento (Token-B),
    // verifica que se actualice exactamente 1 fila en suscripciones,
    // y usa el subscription_id almacenado originalmente en la DB.
    const { data: finalizeResult, error: finalizeError } = await supabase.rpc(
      "finalize_paypal_event",
      {
        p_event_id: eventId,
        p_claim_token: claimToken,
        p_new_estado: newEstado,
        p_new_fecha_fin: newFechaFin,
        p_updated_at: new Date().toISOString(),
        p_update_suscripcion: requiresSubscriptionUpdate
      }
    );

    if (finalizeError) throw finalizeError;

    if (finalizeResult === 'LOST_CLAIM') {
      // El Token ya no era válido o el evento fue marcado como procesado.
      // Significa que nos convertimos en un proceso Zombie y perdimos la reclamación.
      throw new Error(`Lost claim authority for event ${eventId}. Updates aborted.`);
    } else if (finalizeResult === 'SUBSCRIPTION_NOT_FOUND') {
      throw new Error(`Zero rows updated. Suscripción original no encontrada en DB. Evento: ${eventId}`);
    } else if (finalizeResult === 'MISSING_SUBSCRIPTION_ID') {
      throw new Error(`Se requirió actualizar pero el evento carece de subscription_id. Evento: ${eventId}`);
    } else if (finalizeResult !== 'SUCCESS') {
      throw new Error(`Error desconocido al finalizar el evento: ${finalizeResult}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("Webhook processing timeout error:", error.message);
    } else {
      console.error("Webhook processing error:", error.message);
    }
    // Retornamos 500 para que PayPal reintente.
    // processed_at permanecerá NULL.
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
