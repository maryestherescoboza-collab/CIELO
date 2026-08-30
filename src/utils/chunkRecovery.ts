const RECOVERY_STORAGE_KEY = 'cielo_chunk_recovery_attempted';
const RECOVERY_QUERY_PARAM = '_cielo';

// Patrones de error producidos cuando un chunk dinámico queda obsoleto tras un
// despliegue (el navegador sigue pidiendo un hash que ya no existe).
const STALE_CHUNK_PATTERNS: RegExp[] = [
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
    /error loading dynamically imported module/i,
    /error loading chunk/i,
    /ChunkLoadError/i,
    /Unable to import module/i,
    /Importing module script/i,
];

// Guardas para impedir recargas infinitas: una en memoria (evita duplicados en
// el mismo ciclo de carga) y otra persistente en sessionStorage (único intento
// automático por sesión; si tras recargar el error persiste, se muestra el
// Error Boundary normal).
let recoveryInFlight = false;
let listenersRegistered = false;

function normalizeError(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) {
        return `${error.message} ${error.stack ?? ''}`.slice(0, 600);
    }
    try {
        return JSON.stringify(error) ?? '';
    } catch {
        return '';
    }
}

export function isChunkLoadError(error: unknown): boolean {
    return STALE_CHUNK_PATTERNS.some(pattern => pattern.test(normalizeError(error)));
}

function loadAttemptedFlag(): boolean {
    try {
        return sessionStorage.getItem(RECOVERY_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function markRecoveryAttempted(): void {
    try {
        sessionStorage.setItem(RECOVERY_STORAGE_KEY, '1');
    } catch {
        // Almacenamiento no disponible: la guarda en memoria sigue siendo válida.
    }
}

// Recarga con cache-busting para forzar una petición nueva de index.html y que
// el navegador no reutilice un HTML (ni una lista de chunks) de un build previo.
function reloadToLatestVersion(): void {
    const url = new URL(window.location.href);
    url.searchParams.set(RECOVERY_QUERY_PARAM, String(Date.now()));
    window.location.replace(url.toString());
}

// Una vez recuperada la versión actual, se elimina el parámetro de cache-busting
// para no dejar la URL "sucia" en el historial del navegador.
function cleanupRecoveryParam(): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has(RECOVERY_QUERY_PARAM)) {
        url.searchParams.delete(RECOVERY_QUERY_PARAM);
        window.history.replaceState(window.history.state, '', url.toString());
    }
}

/**
 * Intento automático de recuperación ante chunks obsoletos.
 * Devuelve true si el error es de carga de chunk y puede/procede recuperarse
 * (se programa la recarga controlada); false en cualquier otro caso.
 */
export function attemptChunkRecovery(error: unknown): boolean {
    if (!isChunkLoadError(error)) return false;
    if (recoveryInFlight) return true;
    if (loadAttemptedFlag()) return false;

    recoveryInFlight = true;
    markRecoveryAttempted();
    reloadToLatestVersion();
    return true;
}

/**
 * Registra los listener globales de ventana. Debe invocarse una sola vez antes
 * de renderizar la aplicación. Detecta la caída de CUALQUIER import dinámico,
 * actual o futuro, sin necesidad de lógica por módulo.
 */
export function setupChunkRecovery(): void {
    if (typeof window === 'undefined' || listenersRegistered) return;
    listenersRegistered = true;

    cleanupRecoveryParam();

    const handleWindowError = (event: ErrorEvent): void => {
        attemptChunkRecovery(event.error ?? event.message);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
        attemptChunkRecovery(event.reason);
    };

    window.addEventListener('error', handleWindowError, { capture: true });
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
}