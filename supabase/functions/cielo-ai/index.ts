import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Precios de DeepSeek (aprox. por 1M tokens)
const DEEPSEEK_PRICING = {
  inputCacheHit: 0.014 / 1000000,
  inputCacheMiss: 0.14 / 1000000,
  output: 0.28 / 1000000
};

// Presupuesto mensual por usuario (con margen de seguridad)
const BUDGET_LIMIT = 0.45; // Máximo real 0.50, margen de 0.05

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('No autorizado');

    const { text, operation = 'analyze_activities', hash, textoOriginal = '' } = await req.json()
    if (!text) throw new Error('Texto es requerido');

    // 1. Verificar presupuesto del mes actual
    const d = new Date();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    
    // Consulta directa (fallback)
    const { data: logs } = await supabaseClient
      .from('ai_usage_logs')
      .select('cost')
      .eq('user_id', user.id)
      .gte('created_at', firstDay);
      
    const currentCost = logs?.reduce((acc, curr) => acc + (curr.cost || 0), 0) || 0;

    if (currentCost >= BUDGET_LIMIT) {
      return new Response(JSON.stringify({ error: 'Has alcanzado el límite mensual de uso de IA.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Verificar caché en ai_biblioteca (si nos pasaron un hash)
    if (hash) {
      const { data: cached } = await supabaseClient
        .from('ai_biblioteca')
        .select('json_actividades')
        .eq('user_id', user.id)
        .eq('hash_texto', hash)
        .single();
        
      if (cached && cached.json_actividades) {
        // Actualizar contador de uso de forma síncrona/segura si es posible
        // Como no hicimos el RPC increment_ai_biblioteca_usage, lo hacemos crudo o ignoramos
        return new Response(JSON.stringify({ data: cached.json_actividades, cached: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 3. Llamar a DeepSeek
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY no configurada en el servidor.');

    const prompt = `Analiza todo el contenido proporcionado, pero devuelve únicamente el JSON solicitado. No repitas el texto original. No expliques tus decisiones. No agregues información que no esté solicitada.
Reglas:
- Conserva exactamente el nombre, título o numeración (ej. Actividad 1.1) cuando exista.
- Identifica actividades aunque se llamen "Ejercicio", "Tarea", "Parte I" o sean solo instrucciones.
- Infiere descripcion, indicador_logro, producto, y competencias.
- La "descripcion" debe ser breve y explicar claramente en qué consiste la actividad o qué acción principal realizará el estudiante.
- Utiliza ÚNICAMENTE estas competencias: "Comunicativa", "Pensamiento Lógico, Creativo y Crítico; y Resolución de Problemas", "Científica y Tecnológica; y Ambiental y de la Salud", "Ética y Ciudadana; y Desarrollo Personal y Espiritual".

Estructura obligatoria:
{
  "actividades": [
    {
      "nombre": "string",
      "descripcion": "string",
      "indicador_logro": "string",
      "competencias": ["string"],
      "producto": "string"
    }
  ]
}`;

    const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3
      })
    });

    if (!dsResponse.ok) {
      const err = await dsResponse.text();
      throw new Error(`Error de DeepSeek: ${dsResponse.status}`);
    }

    const dsData = await dsResponse.json();
    const usage = dsData.usage || {};
    
    // Calcular costo
    const inputHit = usage.prompt_cache_hit_tokens || 0;
    const inputMiss = (usage.prompt_tokens || 0) - inputHit;
    const outputTokens = usage.completion_tokens || 0;
    const cost = (inputHit * DEEPSEEK_PRICING.inputCacheHit) + 
                 (inputMiss * DEEPSEEK_PRICING.inputCacheMiss) + 
                 (outputTokens * DEEPSEEK_PRICING.output);

    const jsonText = dsData.choices?.[0]?.message?.content || '{}';
    let parsedJson = null;
    try {
        parsedJson = JSON.parse(jsonText);
    } catch {
        const match = jsonText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (match) parsedJson = JSON.parse(match[1]);
    }

    // 4. Guardar Log de Uso
    await supabaseClient.from('ai_usage_logs').insert({
      user_id: user.id,
      provider: 'deepseek',
      model: 'deepseek-chat',
      operation: operation,
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: outputTokens,
      total_tokens: usage.total_tokens || 0,
      cache_hit_tokens: inputHit,
      cache_miss_tokens: inputMiss,
      cost: cost
    });

    // 5. Guardar en Biblioteca si tenemos hash y json
    if (hash && parsedJson) {
      await supabaseClient.from('ai_biblioteca').insert({
        user_id: user.id,
        texto_original: textoOriginal || text,
        texto_normalizado: text,
        hash_texto: hash,
        json_actividades: parsedJson
      }).catch(console.error); // Ignoramos conflicto
    }

    return new Response(JSON.stringify({ data: parsedJson, cost: cost }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
