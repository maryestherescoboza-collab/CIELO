import { createClient } from "npm:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") as string;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") as string;
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") as string;

// Fase Live
const PAYPAL_API_BASE = "https://api-m.paypal.com";

// Límite de reintentos para fallos transitorios. Al agotarse, el evento se
// marca como procesado con resolución "unreconciled_after_retries" para
// detener los reintentos indefinidos de PayPal sin perder la trazabilidad.
const MAX_PROCESSING_ATTEMPTS = 8;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PAYPAL_PLANS: Record<string, { planId: string, amount: string, currency: string }> = {
  "docente_mensual_definitivo": {
    planId: "P-4131029904627403DNLCUUHA",
    amount: "5.00",
    currency: "USD"
  },
  "docente_anual_definitivo": {
    planId: "P-1WC41170AP726083TNLCUWQY",
    amount: "48.00",
    currency: "USD"
  }
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    subscription_id?: string;
    billing_agreement_id?: string;
    amount?: { total?: string; currency?: string };
    supplementary_data?: { related_ids?: { subscription_id?: string } };
  };
};

type PayPalSubscription = {
  custom_id?: string;
  plan_id?: string;
  status?: string;
  start_time?: string;
  billing_info?: { next_billing_time?: string };
};

class WebhookError extends Error {
  retryable: boolean;
  constructor(message: string, retryable = true) {
    super(message);
    this.name = "WebhookError";
    this.retryable = retryable;
  }
}

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
    console.error("[paypal-webhook] Falta alguno de los encabezados obligatorios de firma de PayPal");
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
    const errText = await response.text();
    console.error(`[paypal-webhook] Error en llamada verify-webhook-signature (${response.status}):`, errText);
    return false;
  }

  const data = await response.json();
  if (data.verification_status !== "SUCCESS") {
    console.warn(`[paypal-webhook] Firma rechazada por PayPal. status=${data.verification_status}. PAYPAL_WEBHOOK_ID=${PAYPAL_WEBHOOK_ID ? "PRESENTE" : "VACIO"}`);
  }
  return data.verification_status === "SUCCESS";
}

function extractSubscriptionId(event: PayPalWebhookEvent): string | null {
  const eventType = event.event_type;
  if (!eventType) return null;
  if (eventType === "PAYMENT.SALE.COMPLETED") {
    // Para pagos, el ID de suscripción viene en billing_agreement_id
    return event.resource?.billing_agreement_id || null;
  } else if (eventType.startsWith("BILLING.SUBSCRIPTION.")) {
    // Para eventos de suscripción, es el propio id del recurso
    return event.resource?.id || null;
  }
  return null;
}

function findPlan(planId: string | undefined) {
  if (!planId) return null;
  for (const [key, plan] of Object.entries(PAYPAL_PLANS)) {
    if (plan.planId === planId) {
      return { key, ...plan };
    }
  }
  return null;
}

/**
 * Registra el resultado de un fallo en paypal_webhook_events sin exponer
 * credenciales. Devuelve "stop" cuando PayPal ya no debe reintentar y
 * "retry" cuando el fallo es transitorio.
 *
 * Si la migración de auditoría aún no está aplicada, el update falla de forma
 * controlada y el webhook mantiene el comportamiento de reintento seguro.
 */
async function recordEventFailure(params: {
  eventId: string;
  subscriptionId: string | null;
  reason: string;
  retryable: boolean;
}): Promise<"retry" | "stop"> {
  const { eventId, subscriptionId, reason, retryable } = params;
  const safeReason = reason.slice(0, 500);

  console.error(
    `[paypal-webhook] event_id=${eventId} subscription_id=${subscriptionId ?? "null"} retryable=${retryable} reason=${safeReason}`
  );

  try {
    const { data: row, error: readError } = await supabase
      .from("paypal_webhook_events")
      .select("attempts")
      .eq("event_id", eventId)
      .maybeSingle();

    if (readError) {
      console.warn(`[paypal-webhook] No se pudo leer attempts del evento ${eventId}: ${readError.message}`);
    }

    const currentAttempts = typeof row?.attempts === "number" ? row.attempts : null;
    const attempts = currentAttempts === null ? null : currentAttempts + 1;
    const exhausted = attempts !== null && attempts >= MAX_PROCESSING_ATTEMPTS;
    const shouldStop = !retryable || exhausted;

    const patch: Record<string, unknown> = {
      last_error: safeReason,
      last_attempt_at: new Date().toISOString(),
    };
    if (attempts !== null) patch.attempts = attempts;
    if (shouldStop) {
      patch.processed_at = new Date().toISOString();
      patch.resolution = retryable ? "unreconciled_after_retries" : "not_reconcilable";
    }

    const { error: updateError } = await supabase
      .from("paypal_webhook_events")
      .update(patch)
      .eq("event_id", eventId);

    if (updateError) {
      console.warn(`[paypal-webhook] No se pudo actualizar auditoría del evento ${eventId}: ${updateError.message}`);
    }

    return shouldStop ? "stop" : "retry";
  } catch (auditError) {
    console.warn(`[paypal-webhook] No se pudo registrar auditoría del evento ${eventId}:`, auditError);
    return retryable ? "retry" : "stop";
  }
}

/**
 * Conciliación segura: crea la fila local únicamente cuando PayPal confirma
 * un custom_id que corresponde a un usuario real y un plan oficial de CIELO.
 *
 * La fila se crea siempre en estado "pendiente". La activación la aplica
 * finalize_paypal_event después de validar monto, moneda y estado real de
 * PayPal. Así nunca se marca activa una suscripción antes de verificarla.
 */
async function reconcileLocalSubscription(params: {
  subscriptionId: string;
  paypalSub: PayPalSubscription;
  customId: string;
  planId: string;
}) {
  const { subscriptionId, paypalSub, customId, planId } = params;

  const { data: activeSubs, error: conflictError } = await supabase
    .from("suscripciones")
    .select("id, paypal_subscription_id")
    .eq("user_id", customId)
    .eq("estado", "activa")
    .limit(5);

  if (conflictError) {
    throw new WebhookError(`DB error checking active subscription: ${conflictError.message}`, true);
  }

  // Nunca asignar una suscripción si el usuario ya tiene otra activa distinta.
  const conflict = (activeSubs ?? []).find(
    (sub) => sub.paypal_subscription_id !== subscriptionId
  );
  if (conflict) {
    throw new WebhookError(
      "Active subscription already exists for this user with a different PayPal subscription_id",
      false
    );
  }

  const { error: insertError } = await supabase
    .from("suscripciones")
    .upsert(
      {
        paypal_subscription_id: subscriptionId,
        user_id: customId,
        estado: "pendiente",
        tipo: "individual",
        provider: "paypal",
        plan_id: planId,
        fecha_inicio: paypalSub.start_time || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paypal_subscription_id", ignoreDuplicates: true }
    );

  if (insertError) {
    throw new WebhookError(`Could not reconcile local subscription: ${insertError.message}`, true);
  }

  const { data: reconciled, error: readError } = await supabase
    .from("suscripciones")
    .select("id, user_id, estado, paypal_subscription_id")
    .eq("paypal_subscription_id", subscriptionId)
    .maybeSingle();

  if (readError || !reconciled) {
    throw new WebhookError(
      `Could not read reconciled subscription: ${readError?.message ?? "not found"}`,
      true
    );
  }

  if (reconciled.user_id !== customId) {
    throw new WebhookError(
      "Security Alert: reconciled subscription belongs to a different user",
      false
    );
  }

  console.log(
    `[paypal-webhook] Conciliación segura aplicada: subscription_id=${subscriptionId} user_id=${customId} estado=${reconciled.estado}`
  );

  return reconciled;
}

Deno.serve(async (req: Request) => {
  let eventId: string | undefined;
  let subscriptionId: string | null = null;

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const rawBody = await req.text();
    let event: PayPalWebhookEvent;
    try {
      event = JSON.parse(rawBody) as PayPalWebhookEvent;
    } catch {
      return new Response("Invalid payload", { status: 400 });
    }

    eventId = event?.id;
    const eventType = event?.event_type;

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

    subscriptionId = extractSubscriptionId(event);

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
      // Obtener SIEMPRE los datos oficiales de la suscripción desde PayPal primero.
      // PayPal es la fuente de verdad para vincular por custom_id.
      const subResponse = await fetchWithTimeout(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      if (!subResponse.ok) {
        throw new WebhookError(
          `Could not fetch subscription details from PayPal API (status ${subResponse.status})`,
          true
        );
      }

      const paypalSub = await subResponse.json() as PayPalSubscription;

      // Validación estricta de custom_id: debe existir, tener formato UUID
      // y corresponder a un usuario real de CIELO.
      const customId = paypalSub.custom_id;
      if (!customId) {
        throw new WebhookError("Security Alert: custom_id is missing from PayPal subscription", false);
      }
      if (typeof customId !== "string" || !UUID_RE.test(customId)) {
        throw new WebhookError("Security Alert: custom_id has an invalid format", false);
      }

      const { data: userLookup, error: userLookupError } = await supabase.auth.admin.getUserById(customId);
      if (userLookupError) {
        // Un 404 significa que el usuario no existe (no reintentable).
        // Cualquier otro fallo del servicio de Auth es transitorio.
        const lookupStatus = (userLookupError as { status?: number }).status;
        throw new WebhookError(
          `Could not validate custom_id user: ${userLookupError.message}`,
          lookupStatus !== 404
        );
      }
      if (!userLookup?.user) {
        throw new WebhookError("Security Alert: custom_id does not match an existing user", false);
      }

      // Validar Plan ID de PayPal contra el catálogo oficial de CIELO.
      const matchedPlan = findPlan(paypalSub.plan_id);
      if (!matchedPlan) {
        throw new WebhookError(`Security Alert: Unrecognized PayPal plan_id: ${paypalSub.plan_id}`, false);
      }

      // Buscar la suscripción local usando el MISMO campo con el que se guardó.
      const { data: localSub, error: subError } = await supabase
        .from("suscripciones")
        .select("id, user_id, estado, paypal_subscription_id")
        .eq("paypal_subscription_id", subscriptionId)
        .maybeSingle();

      if (subError) {
        throw new WebhookError(`DB error reading local subscription: ${subError.message}`, true);
      }

      let effectiveSub = localSub;

      if (!effectiveSub) {
        // Conciliación segura para webhooks que llegan antes del registro local.
        console.warn(`[paypal-webhook] Suscripción ${subscriptionId} no encontrada localmente. Intentando conciliación verificable por custom_id.`);
        effectiveSub = await reconcileLocalSubscription({
          subscriptionId,
          paypalSub,
          customId,
          planId: matchedPlan.planId
        });
      }

      // Validación estricta de custom_id contra la fila local.
      if (effectiveSub.user_id !== customId) {
        throw new WebhookError("Security Alert: custom_id mismatch between PayPal and local DB", false);
      }

      const expectedPlan = matchedPlan;

      switch (eventType) {
        case "BILLING.SUBSCRIPTION.ACTIVATED":
        case "BILLING.SUBSCRIPTION.UPDATED":
          requiresSubscriptionUpdate = true;
          // Si el estado en vivo en PayPal ya es CANCELLED o SUSPENDED, no reactivar por un evento desfasado
          if (paypalSub.status === "CANCELLED") {
            newEstado = "cancelada";
          } else if (paypalSub.status === "SUSPENDED") {
            newEstado = "cancelada";
          } else {
            newEstado = "activa";
            if (!paypalSub.billing_info?.next_billing_time) {
              throw new WebhookError("Missing next_billing_time in ACTIVATED/UPDATED event", true);
            }
            newFechaFin = paypalSub.billing_info?.next_billing_time ?? null;
          }
          break;

        case "BILLING.SUBSCRIPTION.CANCELLED":
          requiresSubscriptionUpdate = true;
          newEstado = "cancelada";
          // Conserva la fecha_fin intacta, para que se respete el periodo ya pagado.
          break;

        case "BILLING.SUBSCRIPTION.SUSPENDED":
          requiresSubscriptionUpdate = true;
          // Si el constraint de base de datos aún no tiene 'suspendida', usamos 'cancelada' como estado compatible seguro.
          newEstado = "cancelada";
          break;

        case "BILLING.SUBSCRIPTION.EXPIRED":
          requiresSubscriptionUpdate = true;
          newEstado = "vencida";
          break;

        case "PAYMENT.SALE.COMPLETED": {
          // Validar el pago completado.
          const amount = event.resource?.amount?.total;
          const currency = event.resource?.amount?.currency;

          if (currency !== "USD") {
            throw new WebhookError(`Currency mismatch. Expected USD, got ${currency}`, false);
          }

          if (amount !== expectedPlan.amount) {
            throw new WebhookError(`Amount mismatch. Expected ${expectedPlan.amount}, got ${amount}`, false);
          }

          if (!paypalSub.billing_info?.next_billing_time) {
            throw new WebhookError("Missing next_billing_time in PAYMENT.SALE.COMPLETED event", true);
          }

          requiresSubscriptionUpdate = true;
          newFechaFin = paypalSub.billing_info?.next_billing_time ?? null;

          // Protección contra eventos desordenados o desfasados
          if (paypalSub.status === "CANCELLED") {
            console.warn(`[paypal-webhook] PAYMENT.SALE.COMPLETED recibido pero la suscripción ${subscriptionId} está cancelada en PayPal.`);
            newEstado = "cancelada";
          } else if (paypalSub.status === "SUSPENDED") {
            console.warn(`[paypal-webhook] PAYMENT.SALE.COMPLETED recibido pero la suscripción ${subscriptionId} está suspendida en PayPal.`);
            newEstado = "cancelada";
          } else {
            newEstado = "activa";
          }
          break;
        }

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

      // Idempotencia de negocio: nunca dejar dos suscripciones activas para
      // el mismo usuario. Si ya existe otra activa, esta no se activa.
      if (requiresSubscriptionUpdate && newEstado === "activa") {
        const { data: otherActive, error: otherActiveError } = await supabase
          .from("suscripciones")
          .select("id, paypal_subscription_id")
          .eq("user_id", effectiveSub.user_id)
          .eq("estado", "activa")
          .limit(5);

        if (otherActiveError) {
          throw new WebhookError(`DB error checking active subscriptions: ${otherActiveError.message}`, true);
        }

        const duplicateActive = (otherActive ?? []).find(
          (sub) => sub.paypal_subscription_id !== subscriptionId
        );
        if (duplicateActive) {
          throw new WebhookError(
            `Activation blocked: user already has an active subscription (${duplicateActive.paypal_subscription_id})`,
            false
          );
        }
      }
    } else {
      console.log(`El evento ${eventId} no contiene un subscription_id válido.`);
    }

    // 4. Finalización atómica mediante Fencing Token
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
      throw new Error(`Lost claim authority for event ${eventId}. Updates aborted.`);
    } else if (finalizeResult === 'SUBSCRIPTION_NOT_FOUND') {
      throw new WebhookError(`Zero rows updated. Suscripción original no encontrada en DB. Evento: ${eventId}`, true);
    } else if (finalizeResult === 'MISSING_SUBSCRIPTION_ID') {
      throw new WebhookError(`Se requirió actualizar pero el evento carece de subscription_id. Evento: ${eventId}`, false);
    } else if (finalizeResult !== 'SUCCESS') {
      throw new WebhookError(`Error desconocido al finalizar el evento: ${finalizeResult}`, true);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("Webhook processing timeout error:", message);
    } else {
      console.error("Webhook processing error:", message);
    }

    if (eventId) {
      const outcome = await recordEventFailure({
        eventId,
        subscriptionId,
        reason: message,
        retryable: error instanceof WebhookError ? error.retryable : true,
      });

      if (outcome === "stop") {
        // No es reintentable (o se agotaron los intentos): confirmamos a PayPal
        // para detener reintentos, pero el evento queda auditado como no conciliado.
        return new Response(JSON.stringify({ received: true, ignored: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Fallo transitorio: 500 para que PayPal reintente.
    // processed_at permanecerá NULL.
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
