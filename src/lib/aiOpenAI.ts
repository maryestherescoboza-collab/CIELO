// Capa única de integración con OpenAI (Chat Completions) para las funciones de IA de CIELO.
// Sigue la misma política de seguridad que Gemini: la clave viaja SOLO en la cabecera
// Authorization (Bearer), nunca en la URL, nunca se registra en logs y solo se muestra
// enmascarada. Cada proveedor tiene su propia implementación independiente.
// Esta capa NO reemplaza a Gemini: queda preparada para que en el futuro una función
// decida qué proveedor utilizar.

import { OPENAI_API_URL, OPENAI_MODEL } from './aiConfig';

export const OPENAI_DEFAULT_MODEL = OPENAI_MODEL;

export interface OpenAIJsonOptions {
    model?: string;
    temperature?: number;
    signal?: AbortSignal;
    /** Esquema JSON para Structured Outputs (response_format json_schema). */
    jsonSchema?: Record<string, unknown>;
    schemaName?: string;
    /** Usar response_format json_object cuando no se provea jsonSchema (por defecto true). */
    jsonObject?: boolean;
    systemPrompt?: string;
}

export type OpenAIErrorKind =
    | 'NO_KEY'
    | 'INVALID_KEY'
    | 'QUOTA_EXHAUSTED'
    | 'RATE_LIMIT'
    | 'CONNECTION'
    | 'SERVICE_UNAVAILABLE'
    | 'INVALID_RESPONSE'
    | 'SERVER_REJECTED'
    | 'UNKNOWN';

export class OpenAIError extends Error {
    kind: OpenAIErrorKind;
    constructor(kind: OpenAIErrorKind, message: string) {
        super(message);
        this.name = 'OpenAIError';
        this.kind = kind;
    }
}

export const OPENAI_ERROR_MESSAGES: Record<OpenAIErrorKind, string> = {
    NO_KEY: 'Configura tu API de OpenAI para utilizar esta función.',
    INVALID_KEY: 'La API de OpenAI no pudo autenticarse. Verifica tu API key.',
    QUOTA_EXHAUSTED: 'El servicio de IA alcanzó su límite temporal. Inténtalo nuevamente más tarde.',
    RATE_LIMIT: 'El servicio de IA alcanzó su límite temporal. Inténtalo nuevamente más tarde.',
    CONNECTION: 'No pudimos conectar con el servicio de IA. Revisa tu conexión e inténtalo nuevamente.',
    SERVICE_UNAVAILABLE: 'El servicio de IA no está disponible en este momento. Inténtalo nuevamente más tarde.',
    INVALID_RESPONSE: 'No pudimos interpretar la respuesta del servicio de IA. Inténtalo nuevamente.',
    SERVER_REJECTED: 'La solicitud al servicio de IA fue rechazada. Verifica los datos ingresados e inténtalo nuevamente.',
    UNKNOWN: 'Ocurrió un error inesperado al usar el servicio de IA. Inténtalo nuevamente.'
};

function redactApiKey(text: string, apiKey: string): string {
    if (!text || !apiKey) return text;
    try {
        return text.replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***API_KEY***');
    } catch {
        return text;
    }
}

export function classifyOpenAIError(status: number | null, body: string): OpenAIErrorKind {
    const lower = body.toLowerCase();
    if (status === 401 || lower.includes('invalid_api_key')) return 'INVALID_KEY';
    if (lower.includes('insufficient_quota') || lower.includes('quota exceeded')) return 'QUOTA_EXHAUSTED';
    if (status === 429 || lower.includes('rate_limit') || lower.includes('rate limit') || lower.includes('too many requests')) return 'RATE_LIMIT';
    if (status !== null && status >= 500) return 'SERVICE_UNAVAILABLE';
    return 'SERVER_REJECTED';
}

// Normaliza un esquema JSON para que sea compatible con Structured Outputs estrictos
// de OpenAI (additionalProperties: false y required completo en cada objeto).
function normalizeStrictSchema(schema: Record<string, unknown>): Record<string, unknown> {
    if (typeof schema === 'object' && schema !== null && schema.type === 'object' && schema.properties && typeof schema.properties === 'object') {
        const props = schema.properties as Record<string, unknown>;
        const next: Record<string, unknown> = { ...schema, additionalProperties: false };
        if (!Array.isArray(next.required)) next.required = Object.keys(props);
        const nextProps: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(props)) {
            nextProps[k] = v && typeof v === 'object' ? normalizeStrictSchema(v as Record<string, unknown>) : v;
        }
        next.properties = nextProps;
        return next;
    }
    if (typeof schema === 'object' && schema !== null && schema.type === 'array' && schema.items && typeof schema.items === 'object') {
        return { ...schema, items: normalizeStrictSchema(schema.items as Record<string, unknown>) };
    }
    return schema;
}

export async function callOpenAIJson<T>(
    apiKey: string,
    prompt: string,
    options: OpenAIJsonOptions = {}
): Promise<T> {
    if (!apiKey) throw new OpenAIError('NO_KEY', OPENAI_ERROR_MESSAGES.NO_KEY);

    const hasSchema = !!options.jsonSchema && typeof options.jsonSchema === 'object' && Object.keys(options.jsonSchema).length > 0;
    const jsonSchema = hasSchema ? options.jsonSchema : undefined;

    const body: Record<string, unknown> = {
        model: options.model ?? OPENAI_DEFAULT_MODEL,
        messages: [
            { role: 'system', content: options.systemPrompt ?? 'Eres el asistente pedagógico de CIELO. Responde exactamente con el formato solicitado.' },
            { role: 'user', content: prompt }
        ],
        temperature: options.temperature ?? 0.7
    };

    if (hasSchema) {
        body.response_format = {
            type: 'json_schema',
            json_schema: {
                name: options.schemaName ?? 'respuesta_estructurada',
                strict: true,
                schema: normalizeStrictSchema(jsonSchema as Record<string, unknown>)
            }
        };
    } else if (options.jsonObject !== false) {
        body.response_format = { type: 'json_object' };
    }

    let response: Response;
    try {
        response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
            signal: options.signal
        });
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        console.error('[OpenAI] Error de conexión (clave no expuesta):', err);
        throw new OpenAIError('CONNECTION', OPENAI_ERROR_MESSAGES.CONNECTION);
    }

    if (!response.ok) {
        let errBody = '';
        try { errBody = await response.text(); } catch { /* cuerpo no legible */ }
        console.error(`[OpenAI API] HTTP ${response.status}:`, redactApiKey(errBody, apiKey));
        const kind = classifyOpenAIError(response.status, errBody);
        throw new OpenAIError(kind, OPENAI_ERROR_MESSAGES[kind]);
    }

    let resJson: any;
    try {
        resJson = await response.json();
    } catch {
        throw new OpenAIError('INVALID_RESPONSE', OPENAI_ERROR_MESSAGES.INVALID_RESPONSE);
    }

    const content = resJson?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
        console.error('[OpenAI] Respuesta sin contenido (detalle no registrado para evitar exponer claves).');
        throw new OpenAIError('INVALID_RESPONSE', OPENAI_ERROR_MESSAGES.INVALID_RESPONSE);
    }

    try {
        return JSON.parse(content) as T;
    } catch {
        console.error('[OpenAI] JSON inválido en la respuesta (contenido no registrado).');
        throw new OpenAIError('INVALID_RESPONSE', OPENAI_ERROR_MESSAGES.INVALID_RESPONSE);
    }
}