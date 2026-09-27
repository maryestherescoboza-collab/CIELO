// Dispatcher único entre proveedores de IA (Gemini / OpenAI).
// Implementa sistema de Fallback a DeepSeek cuando el proveedor principal falla por cuota.

import {
    buildGeminiEndpoint,
    getAIAIProvider,
    getAIKey,
    providerDisplayName
} from './aiConfig';
import { callOpenAIJson, OpenAIError } from './aiOpenAI';

export interface CallAIOptions {
    userId: string;
    prompt: string;
    /** Schema que ya usan las funciones con Gemini (formato responseSchema de Gemini). */
    geminiResponseSchema?: Record<string, unknown>;
    systemPrompt?: string;
    temperature?: number;
    signal?: AbortSignal;
    model?: string;
    
    // Opciones específicas de DeepSeek / Edge Function
    hash?: string;
    originalText?: string;
    operation?: string;
}

export type FallbackAware<T> = T & { _fallbackUsed?: boolean };

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

class GeminiError extends Error {
    isQuotaError: boolean;
    constructor(message: string, isQuotaError: boolean) {
        super(message);
        this.name = 'GeminiError';
        this.isQuotaError = isQuotaError;
    }
}

async function callGemini<T>(apiKey: string, options: CallAIOptions): Promise<T> {
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
        
        const lower = String(errText || '').toLowerCase();
        const isQuotaError = lower.includes('resource_exhausted') ||
                             lower.includes('quota') || 
                             lower.includes('insufficient_quota') ||
                             lower.includes('out_of_credit');
                             
        throw new GeminiError(geminiFriendlyError(response.status, errText), isQuotaError);
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

    let parsed: any;
    try {
        parsed = JSON.parse(text);
    } catch {
        try {
            const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (markdownMatch && markdownMatch[1]) {
                parsed = JSON.parse(markdownMatch[1]);
            } else {
                const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
                if (jsonMatch && jsonMatch[1]) {
                    parsed = JSON.parse(jsonMatch[1]);
                } else {
                    throw new Error('No JSON structure found');
                }
            }
        } catch {
            console.error('[IA][Gemini] JSON inválido en la respuesta (nada sensible registrado).');
            throw new Error('No pudimos interpretar la respuesta del servicio de IA. Inténtalo nuevamente.');
        }
    }
    return parsed as T;
}

async function callDeepSeek<T>(options: CallAIOptions): Promise<T> {
    const { supabase } = await import('./supabase');
    
    const res = await supabase.functions.invoke('cielo-ai', {
        body: { 
            text: options.prompt, 
            hash: options.hash,
            textoOriginal: options.originalText,
            operation: options.operation || 'analyze_activities'
        }
    });

    if (res.error) {
        console.error('[IA][DeepSeek Edge Function] Error:', res.error);
        const errMsg = res.error.message || 'Error desconocido';
        if (errMsg.includes('límite mensual')) throw new Error('Has alcanzado el límite mensual de uso de IA (US$0.50).');
        throw new Error('No pudimos procesar este contenido a través de nuestro servicio de IA. Inténtalo nuevamente.');
    }
    
    if (!res.data || !res.data.data) {
        throw new Error('Respuesta inválida desde el servicio de IA.');
    }

    return res.data.data as T;
}

export async function callAI<T>(options: CallAIOptions): Promise<FallbackAware<T>> {
    const provider = getAIAIProvider(options.userId);
    const apiKey = getAIKey(options.userId, provider);

    if (!apiKey) {
        throw new Error(`Configura tu API de ${providerDisplayName(provider)} para utilizar esta función.`);
    }

    try {
        if (provider === 'openai') {
            return (await callOpenAIJson<T>(apiKey, options.prompt, {
                jsonSchema: options.geminiResponseSchema ? geminiSchemaToJsonSchema(options.geminiResponseSchema) : undefined,
                jsonObject: !options.geminiResponseSchema,
                systemPrompt: options.systemPrompt,
                temperature: options.temperature,
                signal: options.signal,
                model: options.model
            })) as FallbackAware<T>;
        } else {
            return (await callGemini<T>(apiKey, options)) as FallbackAware<T>;
        }
    } catch (err: any) {
        // Analizar si es un error de cuota/saldo/créditos
        let isQuotaError = false;
        
        if (err instanceof OpenAIError) {
            isQuotaError = err.kind === 'QUOTA_EXHAUSTED';
        } else if (err instanceof GeminiError) {
            isQuotaError = err.isQuotaError;
        } else if (err?.message?.toLowerCase().includes('quota') || err?.message?.toLowerCase().includes('resource_exhausted')) {
            isQuotaError = true;
        }

        // Si es cuota agotada, usamos DeepSeek como fallback
        if (isQuotaError) {
            console.warn(`[IA] Fallback a DeepSeek activado por error de cuota en ${provider}.`);
            try {
                const fallbackResult = await callDeepSeek<T>(options);
                if (fallbackResult && typeof fallbackResult === 'object') {
                    Object.assign(fallbackResult, { _fallbackUsed: true });
                }
                return fallbackResult as FallbackAware<T>;
            } catch (fallbackErr) {
                // Si DeepSeek también falla, arrojamos su error real
                throw fallbackErr;
            }
        }

        // Si no es un error de cuota (ej. error de auth, de red, etc), se lanza normalmente
        throw err;
    }
}