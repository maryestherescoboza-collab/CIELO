// Dispatcher único entre proveedores de IA (Gemini / OpenAI).
// Las funciones de negocio mantienen SUS prompts, su schema de respuesta (formato
// Gemini) y su misma estructura de resultado; aquí SOLO cambia el transporte según
// el proveedor seleccionado por el usuario (aiConfig). Si el proveedor elegido no
// tiene la clave configurada, se lanza el mensaje indicado por el producto.
// Seguridad: la clave de Gemini viaja en el endpoint (requisito de la API) y la de
// OpenAI en la cabecera Authorization; en ambos casos se redacta en cualquier log.

import {
    buildGeminiEndpoint,
    getAIAIProvider,
    getAIKey,
    providerDisplayName
} from './aiConfig';
import { callOpenAIJson } from './aiOpenAI';

export interface CallAIOptions {
    userId: string;
    prompt: string;
    /** Schema que ya usan las funciones con Gemini (formato responseSchema de Gemini). */
    geminiResponseSchema?: Record<string, unknown>;
    systemPrompt?: string;
    temperature?: number;
    signal?: AbortSignal;
    model?: string;
}

// Convierte un responseSchema de Gemini a JSON Schema (usado por Structured Outputs
// de OpenAI). Se conservan type (normalizado a minúsculas), properties, items,
// required, enum y description; normalizeStrictSchema de aiOpenAI agrega
// additionalProperties:false y required completo para el modo estricto.
function geminiSchemaToJsonSchema(schema: Record<string, unknown>, depth = 0): Record<string, unknown> {
    if (depth > 12 || typeof schema !== 'object' || schema === null) return schema;
    const next: Record<string, unknown> = {};
    if (schema.type !== undefined) next.type = String(schema.type).toLowerCase();
    if (schema.enum !== undefined) next.enum = schema.enum;
    if (schema.description !== undefined) next.description = schema.description;
    if (schema.items && typeof schema.items === 'object') {
        next.items = geminiSchemaToJsonSchema(schema.items as Record<string, unknown>, depth + 1);
    }
    if (schema.properties && typeof schema.properties === 'object') {
        const props: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(schema.properties as Record<string, unknown>)) {
            props[key] = value && typeof value === 'object'
                ? geminiSchemaToJsonSchema(value as Record<string, unknown>, depth + 1)
                : value;
        }
        next.properties = props;
    }
    if (schema.required !== undefined) next.required = schema.required;
    return next;
}

function redactKey(text: string, apiKey: string): string {
    if (!text || !apiKey) return text;
    try {
        return text.replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***API_KEY***');
    } catch {
        return text;
    }
}

function geminiFriendlyError(status: number, body: string): string {
    const lower = String(body || '').toLowerCase();
    const quotaRelated =
        status === 429 ||
        lower.includes('resource_exhausted') ||
        /rate[-_ ]?limit/.test(lower) ||
        lower.includes('quota') ||
        lower.includes('too many requests') ||
        lower.includes('request limit') ||
        /(per[- ]minute|tokens? per |rpm limit)/.test(lower) ||
        /(token|quota).*(exhaust|temporar)/.test(lower);
    const sizeRelated = /too (long|large)|prompt too long|request is too large|maximum (input|context|length|token)|input (token )?count|input.*(exceed|too large|long)|(token|character|charact).*(exceed|max)/.test(lower);
    const unavailable = lower.includes('unavailable') || lower.includes('overloaded') || lower.includes('temporar');

    if (quotaRelated) return 'El servicio de IA alcanzó su límite temporal. Inténtalo nuevamente más tarde.';
    if (status === 400 && sizeRelated) return 'El texto es demasiado extenso para analizarlo de una vez. Acorta el contenido e inténtalo nuevamente.';
    if (status === 401 || status === 403) return 'La API de Gemini no pudo autenticarse. Verifica tu API key.';
    if (status === 404) return 'El modelo de IA no está disponible para tu API key. Verifícalo e inténtalo nuevamente.';
    if (status >= 500 || unavailable) return 'El servicio de IA no está disponible en este momento. Inténtalo nuevamente más tarde.';
    return 'No pudimos procesar este contenido. Verifica los datos ingresados e inténtalo nuevamente.';
}

export async function callAI<T>(options: CallAIOptions): Promise<T> {
    const provider = getAIAIProvider(options.userId);
    const apiKey = getAIKey(options.userId, provider);

    if (!apiKey) {
        throw new Error(`Configura tu API de ${providerDisplayName(provider)} para utilizar esta función.`);
    }

    if (provider === 'openai') {
        return callOpenAIJson<T>(apiKey, options.prompt, {
            jsonSchema: options.geminiResponseSchema ? geminiSchemaToJsonSchema(options.geminiResponseSchema) : undefined,
            jsonObject: !options.geminiResponseSchema,
            systemPrompt: options.systemPrompt,
            temperature: options.temperature,
            signal: options.signal,
            model: options.model
        });
    }

    // Gemini: se reproduce el transporte que ya usaban las funciones
    // (generateContent + responseMimeType/responseSchema) para no cambiar el
    // comportamiento actual cuando el usuario usa Gemini.
    const endpointUrl = buildGeminiEndpoint(apiKey, options.model);

    let response: Response;
    try {
        response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: options.signal,
            body: JSON.stringify({
                contents: [{ parts: [{ text: options.prompt }] }],
                generationConfig: {
                    temperature: options.temperature ?? 0.7,
                    ...(options.geminiResponseSchema
                        ? { responseMimeType: 'application/json', responseSchema: options.geminiResponseSchema }
                        : {})
                }
            })
        });
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        throw new Error('No pudimos conectar con el servicio de IA. Revisa tu conexión e inténtalo nuevamente.');
    }

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[IA][Gemini] HTTP ${response.status}:`, redactKey(errText, apiKey));
        throw new Error(geminiFriendlyError(response.status, errText));
    }

    let resJson: any;
    try {
        resJson = await response.json();
    } catch {
        throw new Error('No pudimos interpretar la respuesta del servicio de IA. Inténtalo nuevamente.');
    }

    const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || !text.trim()) {
        console.error('[IA][Gemini] Sin texto en la respuesta (nada sensible registrado).');
        throw new Error('No pudimos interpretar la respuesta del servicio de IA. Inténtalo nuevamente.');
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        console.error('[IA][Gemini] JSON inválido en la respuesta (nada sensible registrado).');
        throw new Error('No pudimos interpretar la respuesta del servicio de IA. Inténtalo nuevamente.');
    }
}