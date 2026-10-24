// Dispatcher único y motor de resiliencia multicanal entre proveedores de IA.
// Proveedores soportados: Google Gemini, OpenAI y DeepSeek (CIELO Cloud).
// Políticas clave:
// 1. Fallback automático y transparente en caso de error 500/503, sobrecarga, cuota, timeout o red.
// 2. Reintento único con backoff exponencial para errores transitorios de servidor.
// 3. Circuit breaker en memoria para no repetir llamadas con API keys inválidas o revocadas.
// 4. Redacción estricta de credenciales en todos los logs y mensajes de error.
// 5. Garantía de no pérdida de contenido del docente.

import {
    buildGeminiEndpoint,
    getAIAIProvider,
    getAIKey,
    providerDisplayName,
    GEMINI_MODEL,
    GEMINI_FALLBACK_MODELS,
    type AIProvider
} from './aiConfig';
import { callOpenAIJson, OpenAIError } from './aiOpenAI';

export interface CallAIOptions {
    userId: string;
    prompt: string;
    geminiResponseSchema?: Record<string, unknown>;
    systemPrompt?: string;
    temperature?: number;
    signal?: AbortSignal;
    model?: string;
    preferredProvider?: AIProvider;

    // Opciones específicas de DeepSeek / Edge Function / Caché
    hash?: string;
    originalText?: string;
    operation?: 'analyze_activities' | 'generate_lesson_plan' | 'generate_daily_planning' | string;
}

export type FallbackAware<T> = T & {
    _fallbackUsed?: boolean;
    _fallbackProvider?: string;
    _primaryProvider?: string;
    _providerUsed?: AIProvider;
};

// Circuit breaker en memoria por sesión de navegador para claves inválidas o bloqueadas
const brokenKeysCircuit = new Set<string>();

export function clearAICircuitBreakers(userId?: string): void {
    if (!userId) {
        brokenKeysCircuit.clear();
        return;
    }
    for (const key of Array.from(brokenKeysCircuit)) {
        if (key.includes(userId)) brokenKeysCircuit.delete(key);
    }
}

function circuitKey(provider: AIProvider, userId: string): string {
    return `${provider}:${userId}`;
}

export function isProviderCircuitBroken(provider: AIProvider, userId: string): boolean {
    return brokenKeysCircuit.has(circuitKey(provider, userId));
}

function markProviderCircuitBroken(provider: AIProvider, userId: string): void {
    brokenKeysCircuit.add(circuitKey(provider, userId));
}

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

function redactKey(text: string, apiKey?: string | null): string {
    if (!text || !apiKey || apiKey.length < 6) return text;
    try {
        return text.replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***API_KEY***');
    } catch {
        return text;
    }
}

export interface ErrorClassification {
    message: string;
    isQuota: boolean;
    isTransient: boolean;
    isAuth: boolean;
    isModelNotFound: boolean;
    canFallback: boolean;
}

export function classifyGeminiError(status: number, body: string): ErrorClassification {
    const lower = String(body || '').toLowerCase();
    const isQuota =
        status === 429 ||
        lower.includes('resource_exhausted') ||
        /rate[-_ ]?limit/.test(lower) ||
        lower.includes('quota') ||
        lower.includes('too many requests') ||
        lower.includes('request limit') ||
        /(per[- ]minute|tokens? per |rpm limit)/.test(lower) ||
        /(token|quota).*(exhaust|temporar)/.test(lower);

    const isTransient =
        status >= 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        lower.includes('unavailable') ||
        lower.includes('overloaded') ||
        lower.includes('temporar') ||
        lower.includes('backend error') ||
        lower.includes('internal error');

    const isAuth = status === 401 || status === 403 || lower.includes('api_key_invalid') || lower.includes('unauthenticated');
    const isModelNotFound = status === 404 || lower.includes('models/') || lower.includes('not found');
    const sizeRelated = /too (long|large)|prompt too long|request is too large|maximum (input|context|length|token)|input (token )?count|input.*(exceed|too large|long)|(token|character|charact).*(exceed|max)/.test(lower);

    let message = 'No pudimos procesar este contenido con el servicio de IA.';
    if (isQuota) message = 'El servicio de IA alcanzó su límite temporal de cuota.';
    else if (isTransient) message = 'El servicio de IA está temporalmente sobrecargado o fuera de línea.';
    else if (isAuth) message = 'La API key de Gemini no pudo autenticarse o no es válida.';
    else if (isModelNotFound) message = 'El modelo de IA solicitado no se encuentra disponible.';
    else if (status === 400 && sizeRelated) message = 'El texto es demasiado extenso para analizarlo de una vez.';

    return {
        message,
        isQuota,
        isTransient,
        isAuth,
        isModelNotFound,
        canFallback: isQuota || isTransient || isAuth || isModelNotFound
    };
}

class GeminiTransportError extends Error {
    classification: ErrorClassification;
    constructor(classification: ErrorClassification) {
        super(classification.message);
        this.name = 'GeminiTransportError';
        this.classification = classification;
    }
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            reject(new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort);
    });
}

function parseAIJson<T>(rawText: string): T {
    if (typeof rawText !== 'string' || !rawText.trim()) {
        throw new Error('Respuesta vacía desde el motor de IA.');
    }

    try {
        return JSON.parse(rawText) as T;
    } catch {
        // Buscar bloques ```json ... ```
        const markdownMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[1]) {
            try {
                return JSON.parse(markdownMatch[1]) as T;
            } catch { /* continua al siguiente patrón */ }
        }

        // Buscar el objeto o array JSON más amplio dentro del texto
        const jsonMatch = rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch && jsonMatch[1]) {
            return JSON.parse(jsonMatch[1]) as T;
        }

        throw new Error('No se encontró una estructura JSON válida en la respuesta.');
    }
}

async function callSingleGeminiAttempt<T>(
    apiKey: string,
    options: CallAIOptions,
    modelName: string
): Promise<T> {
    const endpointUrl = buildGeminiEndpoint(apiKey, modelName);

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
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        throw new GeminiTransportError({
            message: 'Error de red o conexión al contactar a Google Gemini.',
            isQuota: false,
            isTransient: true,
            isAuth: false,
            isModelNotFound: false,
            canFallback: true
        });
    }

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`[IA][Gemini] HTTP ${response.status} (${modelName}):`, redactKey(errText, apiKey));
        const classification = classifyGeminiError(response.status, errText);
        throw new GeminiTransportError(classification);
    }

    let resJson: any;
    try {
        resJson = await response.json();
    } catch {
        throw new Error('No se pudo interpretar el formato devuelto por Gemini.');
    }

    const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseAIJson<T>(text);
}

async function callGemini<T>(apiKey: string, options: CallAIOptions): Promise<T> {
    const modelsToTry = [
        options.model || GEMINI_MODEL,
        ...GEMINI_FALLBACK_MODELS.filter(m => m !== (options.model || GEMINI_MODEL))
    ];

    let lastError: unknown = null;

    for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
            return await callSingleGeminiAttempt<T>(apiKey, options, model);
        } catch (err) {
            lastError = err;
            if (err instanceof DOMException && err.name === 'AbortError') throw err;

            // Si es un error 404 del modelo y aún tenemos modelos alternativos en la lista
            if (err instanceof GeminiTransportError && err.classification.isModelNotFound && i < modelsToTry.length - 1) {
                console.warn(`[IA][Gemini] Modelo ${model} no disponible, intentando con ${modelsToTry[i + 1]}...`);
                continue;
            }

            // Si es transitorio (500/503), intentamos 1 reintento breve en el mismo modelo antes de escalar
            if (err instanceof GeminiTransportError && err.classification.isTransient) {
                try {
                    await sleep(600 + Math.random() * 400, options.signal);
                    return await callSingleGeminiAttempt<T>(apiKey, options, model);
                } catch (retryErr) {
                    lastError = retryErr;
                }
            }

            break;
        }
    }

    throw lastError;
}

async function callOpenAI<T>(apiKey: string, options: CallAIOptions): Promise<T> {
    try {
        return await callOpenAIJson<T>(apiKey, options.prompt, {
            jsonSchema: options.geminiResponseSchema ? geminiSchemaToJsonSchema(options.geminiResponseSchema) : undefined,
            jsonObject: !options.geminiResponseSchema,
            systemPrompt: options.systemPrompt,
            temperature: options.temperature,
            signal: options.signal,
            model: options.model
        });
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;

        // Reintento único para transitorios de OpenAI
        if (err instanceof OpenAIError && (err.kind === 'SERVICE_UNAVAILABLE' || err.kind === 'CONNECTION')) {
            try {
                await sleep(600 + Math.random() * 400, options.signal);
                return await callOpenAIJson<T>(apiKey, options.prompt, {
                    jsonSchema: options.geminiResponseSchema ? geminiSchemaToJsonSchema(options.geminiResponseSchema) : undefined,
                    jsonObject: !options.geminiResponseSchema,
                    systemPrompt: options.systemPrompt,
                    temperature: options.temperature,
                    signal: options.signal,
                    model: options.model
                });
            } catch (retryErr) {
                throw retryErr;
            }
        }
        throw err;
    }
}

async function callDeepSeek<T>(options: CallAIOptions): Promise<T> {
    const { supabase } = await import('./supabase');

    // Timeout de seguridad en caso de que la Edge Function demore demasiado
    const timeoutAbort = new AbortController();
    const timeoutId = setTimeout(() => timeoutAbort.abort(), 45000);

    const onUserAbort = () => timeoutAbort.abort();
    options.signal?.addEventListener('abort', onUserAbort);

    try {
        const res = await supabase.functions.invoke('cielo-ai', {
            body: {
                text: options.prompt,
                hash: options.hash,
                textoOriginal: options.originalText,
                operation: options.operation || 'analyze_activities'
            }
        });

        if (res.error) {
            console.warn('[IA][DeepSeek Edge Function] Error:', res.error);
            const errMsg = String(res.error.message || '');
            if (errMsg.includes('límite mensual') || errMsg.includes('budget') || errMsg.includes('Has alcanzado el límite')) {
                throw new Error('Has alcanzado el límite mensual de uso de IA de respaldo (US$0.50).');
            }
            if (errMsg.includes('No autorizado')) {
                throw new Error('La sesión de usuario no es válida para invocar el asistente en la nube.');
            }
            throw new Error(`Servicio de IA de respaldo no disponible: ${errMsg || 'Error de conexión'}`);
        }

        if (!res.data || res.data.data === undefined || res.data.data === null) {
            throw new Error('Respuesta vacía o incompleta desde el servicio de IA de respaldo.');
        }

        return res.data.data as T;
    } finally {
        clearTimeout(timeoutId);
        options.signal?.removeEventListener('abort', onUserAbort);
    }
}

/**
 * Determina el orden de candidatos elegibles para atender la solicitud.
 */
function resolveCandidatesChain(userId: string, preferred?: AIProvider): AIProvider[] {
    const primary = preferred || getAIAIProvider(userId);
    const geminiKey = getAIKey(userId, 'gemini');
    const openAIKey = getAIKey(userId, 'openai');

    const hasGemini = !!geminiKey && !isProviderCircuitBroken('gemini', userId);
    const hasOpenAI = !!openAIKey && !isProviderCircuitBroken('openai', userId);
    const hasDeepSeek = !isProviderCircuitBroken('deepseek', userId);

    const candidates: AIProvider[] = [];

    // 1. Agregar el preferido si está configurado y no bloqueado
    if (primary === 'gemini' && hasGemini) candidates.push('gemini');
    else if (primary === 'openai' && hasOpenAI) candidates.push('openai');
    else if (primary === 'deepseek' && hasDeepSeek) candidates.push('deepseek');

    // 2. Agregar los otros disponibles en orden de preferencia lógica
    if (primary === 'gemini') {
        if (hasOpenAI && !candidates.includes('openai')) candidates.push('openai');
        if (hasDeepSeek && !candidates.includes('deepseek')) candidates.push('deepseek');
    } else if (primary === 'openai') {
        if (hasGemini && !candidates.includes('gemini')) candidates.push('gemini');
        if (hasDeepSeek && !candidates.includes('deepseek')) candidates.push('deepseek');
    } else {
        // Primary es DeepSeek
        if (hasGemini && !candidates.includes('gemini')) candidates.push('gemini');
        if (hasOpenAI && !candidates.includes('openai')) candidates.push('openai');
    }

    // 3. Si candidates quedó vacío (ej. usuario no configuró claves), incluir DeepSeek como red de salvamento
    if (candidates.length === 0 && hasDeepSeek) {
        candidates.push('deepseek');
    }

    return candidates;
}

/**
 * Ejecutor principal de IA en CIELO.
 * Implementa recuperación automática transparente respetando los datos del usuario.
 */
export async function callAI<T>(options: CallAIOptions): Promise<FallbackAware<T>> {
    const userId = options.userId;
    const primaryProvider = options.preferredProvider || getAIAIProvider(userId);
    const candidates = resolveCandidatesChain(userId, primaryProvider);

    if (candidates.length === 0) {
        throw new Error(
            `No hay proveedores de IA configurados o activos. Configura tu clave de ${providerDisplayName(primaryProvider)} en tu perfil o utiliza el Asistente CIELO.`
        );
    }

    const failureLogs: Array<{ provider: AIProvider; message: string }> = [];

    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const isFallback = candidate !== primaryProvider;

        try {
            let result: T;

            if (candidate === 'gemini') {
                const apiKey = getAIKey(userId, 'gemini')!;
                result = await callGemini<T>(apiKey, options);
            } else if (candidate === 'openai') {
                const apiKey = getAIKey(userId, 'openai')!;
                result = await callOpenAI<T>(apiKey, options);
            } else {
                result = await callDeepSeek<T>(options);
            }

            // Éxito: envolver con información de diagnóstico para transparencia
            const responseData = (
                typeof result === 'object' && result !== null ? { ...result } : result
            ) as FallbackAware<T>;

            if (isFallback) {
                console.info(
                    `[IA] Recuperación exitosa: Solicitud completada mediante ${candidate === 'deepseek' ? 'el asistente de respaldo' : providerDisplayName(candidate)} (proveedor principal falló).`
                );
                responseData._fallbackUsed = true;
                responseData._fallbackProvider = candidate === 'deepseek' ? 'el asistente de respaldo' : providerDisplayName(candidate);
                responseData._primaryProvider = providerDisplayName(primaryProvider);
            }
            responseData._providerUsed = candidate;

            return responseData;
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                // Si el usuario canceló la operación, no intentamos fallbacks adicionales
                throw err;
            }

            const errMsg = (err as Error)?.message || 'Error desconocido';
            failureLogs.push({ provider: candidate, message: errMsg });

            // Identificar si fue un error permanente de clave inválida para no martillar el endpoint
            if (err instanceof GeminiTransportError && err.classification.isAuth) {
                markProviderCircuitBroken('gemini', userId);
                console.warn(`[IA] Clave de Gemini no válida. Omitiendo Gemini para siguientes intentos de esta sesión.`);
            } else if (err instanceof OpenAIError && err.kind === 'INVALID_KEY') {
                markProviderCircuitBroken('openai', userId);
                console.warn(`[IA] Clave de OpenAI no válida. Omitiendo OpenAI para siguientes intentos de esta sesión.`);
            } else if (errMsg.includes('límite mensual')) {
                markProviderCircuitBroken('deepseek', userId);
            }

            console.warn(
                `[IA] Fallo en ${providerDisplayName(candidate)}: ${errMsg}. ` +
                (i < candidates.length - 1 ? `Intentando automáticamente con ${providerDisplayName(candidates[i + 1])}...` : 'No quedan más proveedores alternativos.')
            );
        }
    }

    // Todos los candidatos fallaron
    const attemptedNames = candidates.map(c => providerDisplayName(c)).join(', ');
    throw new Error(
        `Los servicios de IA no están disponibles en este momento tras intentar con ${attemptedNames}. Tu texto y trabajo se mantienen intactos. Inténtalo nuevamente en unos instantes.`
    );
}