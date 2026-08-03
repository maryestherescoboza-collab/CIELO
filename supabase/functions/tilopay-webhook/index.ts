import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as crypto from "https://deno.land/std@0.177.0/node/crypto.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const tilopaySecret = Deno.env.get("TILOPAY_WEBHOOK_SECRET") as string; // Secret for verifying Tilopay signature

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Verify signature if Tilopay provides one
    const signature = req.headers.get("x-tilopay-signature");
    const rawBody = await req.text();
    
    if (tilopaySecret && signature) {
      const hmac = crypto.createHmac('sha256', tilopaySecret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest('hex');
      if (signature !== expectedSignature) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    
    console.log("Tilopay webhook received:", payload);

    // Parse payload (this structure depends on Tilopay's actual payload format)
    const { 
      event_type, 
      subscription_id, 
      customer_id, 
      status, 
      next_billing_date 
    } = payload;

    if (!subscription_id) {
      return new Response("Missing subscription_id", { status: 400 });
    }

    let newEstado = 'pendiente';
    if (event_type === 'payment.success' || status === 'active') {
      newEstado = 'activa';
    } else if (event_type === 'payment.failed' || status === 'past_due') {
      newEstado = 'vencida';
    } else if (event_type === 'subscription.canceled' || status === 'canceled') {
      newEstado = 'cancelada';
    }

    // Update the suscripciones table
    const updateData: any = { 
      estado: newEstado,
      updated_at: new Date().toISOString()
    };
    
    if (next_billing_date) {
      updateData.fecha_fin = new Date(next_billing_date).toISOString();
    }

    const { data, error } = await supabase
      .from('suscripciones')
      .update(updateData)
      .eq('tilopay_subscription_id', subscription_id)
      .select();

    if (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }
    
    // Si la suscripción era institucional y fue cancelada/vencida, opcionalmente actualizar el estado del centro
    if ((newEstado === 'vencida' || newEstado === 'cancelada') && data && data.length > 0) {
      const sub = data[0];
      if (sub.tipo === 'institucional' && sub.centro_id) {
        await supabase
          .from('centros')
          .update({ estado: 'suspendido' })
          .eq('id', sub.centro_id);
      }
    } else if (newEstado === 'activa' && data && data.length > 0) {
      const sub = data[0];
      if (sub.tipo === 'institucional' && sub.centro_id) {
        await supabase
          .from('centros')
          .update({ estado: 'activo', afiliado: true })
          .eq('id', sub.centro_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
