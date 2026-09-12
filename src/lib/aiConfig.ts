// Capa única de configuración de IA (Gemini) para todas las funciones de CIELO.
// La clave se almacena localmente por usuario (localStorage), nunca se registra
// en logs ni se expone en la UI (solo versión enmascarada).

export const GEMINI_API_VERSION = 'v1beta';
export const GEMINI_MODEL = 'gemini-3.5-flash';

const storageKeyFor = (userId: string) => `gemini_api_key_${userId}`;

export function getGeminiApiKey(userId?: string | null): string | null {
    if (!userId) return null;
    try {
        return localStorage.getItem(storageKeyFor(userId));
    } catch {
        return null;
    }
}

export function saveGeminiApiKey(userId: string, apiKey: string): void {
    localStorage.setItem(storageKeyFor(userId), apiKey.trim());
}

export function removeGeminiApiKey(userId: string): void {
    localStorage.removeItem(storageKeyFor(userId));
}

export function isGeminiConfigured(userId?: string | null): boolean {
    return !!getGeminiApiKey(userId);
}

export function maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '••••';
    return `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`;
}

export function buildGeminiEndpoint(apiKey: string, modelName = GEMINI_MODEL): string {
    return `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

// ===================== OPENAI =====================
// Misma política de seguridad que Gemini: cada usuario guarda su propia clave
// en localStorage (clave `openai_api_key_<userId>`), nunca se registra en logs
// ni se expone en la UI (solo versión enmascarada a través de maskApiKey).

export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
export const OPENAI_MODEL = 'gpt-4o-mini';

const openAIStorageKeyFor = (userId: string) => `openai_api_key_${userId}`;

export function getOpenAIApiKey(userId?: string | null): string | null {
    if (!userId) return null;
    try {
        return localStorage.getItem(openAIStorageKeyFor(userId));
    } catch {
        return null;
    }
}

export function saveOpenAIApiKey(userId: string, apiKey: string): void {
    localStorage.setItem(openAIStorageKeyFor(userId), apiKey.trim());
}

export function removeOpenAIApiKey(userId: string): void {
    localStorage.removeItem(openAIStorageKeyFor(userId));
}

export function isOpenAIConfigured(userId?: string | null): boolean {
    return !!getOpenAIApiKey(userId);
}

// ===================== SELECCIÓN DE PROVEEDOR =====================
// El usuario elige qué proveedor usan las funciones de IA. Se guarda por
// usuario en localStorage (clave `ai_provider_<userId>`).

export type AIProvider = 'gemini' | 'openai';
export const AI_PROVIDERS: AIProvider[] = ['gemini', 'openai'];
export const DEFAULT_AI_PROVIDER: AIProvider = 'gemini';

const providerStorageKeyFor = (userId: string) => `ai_provider_${userId}`;

export function getAIAIProvider(userId?: string | null): AIProvider {
    if (!userId) return DEFAULT_AI_PROVIDER;
    try {
        const saved = localStorage.getItem(providerStorageKeyFor(userId));
        return saved === 'gemini' || saved === 'openai' ? saved : DEFAULT_AI_PROVIDER;
    } catch {
        return DEFAULT_AI_PROVIDER;
    }
}

export function saveAIAIProvider(userId: string, provider: AIProvider): void {
    localStorage.setItem(providerStorageKeyFor(userId), provider);
}

export function providerDisplayName(provider: AIProvider): string {
    return provider === 'openai' ? 'OpenAI' : 'Gemini';
}

export function getAIKey(userId?: string | null, provider: AIProvider = getAIAIProvider(userId)): string | null {
    return provider === 'openai' ? getOpenAIApiKey(userId) : getGeminiApiKey(userId);
}

export function saveAIKey(userId: string, provider: AIProvider, apiKey: string): void {
    if (provider === 'openai') saveOpenAIApiKey(userId, apiKey);
    else saveGeminiApiKey(userId, apiKey);
}

export function isProviderConfigured(userId?: string | null, provider: AIProvider = getAIAIProvider(userId)): boolean {
    return !!getAIKey(userId, provider);
}
