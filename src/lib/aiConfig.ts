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
