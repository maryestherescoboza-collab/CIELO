/**
 * Utilidad ligera para renderizar la primera página de un PDF como miniatura
 * utilizando PDF.js cargado de forma dinámica y diferida (lazy loading).
 *
 * Cumple con AGUA:
 * - No agrega paquetes pesados al bundle inicial de Vite.
 * - Cachea en memoria las miniaturas renderizadas (Map URL -> dataUrl).
 * - Carga solo la primera página del documento PDF.
 */

let pdfjsLoadingPromise: Promise<any> | null = null;
const thumbnailCache = new Map<string, string>();

function obtenerPdfJs(): Promise<any> {
    if (typeof window === 'undefined') return Promise.reject(new Error('Entorno no-DOM'));
    if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);
    if (pdfjsLoadingPromise) return pdfjsLoadingPromise;

    pdfjsLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        script.onload = () => {
            const lib = (window as any).pdfjsLib;
            if (lib) {
                lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(lib);
            } else {
                reject(new Error('PDF.js no está disponible tras cargar el script'));
            }
        };
        script.onerror = () => {
            pdfjsLoadingPromise = null;
            reject(new Error('Error de red al cargar PDF.js'));
        };
        document.head.appendChild(script);
    });

    return pdfjsLoadingPromise;
}

/**
 * Renderiza la primera página de un PDF y devuelve una miniatura en base64 (WebP o JPEG).
 * Si falla o está desconectado, devuelve null para usar el icono de respaldo.
 */
export async function renderizarMiniaturaPdf(pdfUrl: string): Promise<string | null> {
    if (!pdfUrl) return null;
    if (thumbnailCache.has(pdfUrl)) {
        return thumbnailCache.get(pdfUrl)!;
    }

    try {
        const pdfjs = await obtenerPdfJs();
        const doc = await pdfjs.getDocument({
            url: pdfUrl,
            disableAutoFetch: true,
            disableStream: true,
        }).promise;

        const pagina = await doc.getPage(1);
        const unscaledViewport = pagina.getViewport({ scale: 1 });
        const targetWidth = 240;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = pagina.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        await pagina.render({
            canvasContext: ctx,
            viewport,
        }).promise;

        const dataUrl = canvas.toDataURL('image/webp', 0.8) || canvas.toDataURL('image/jpeg', 0.8);
        thumbnailCache.set(pdfUrl, dataUrl);
        return dataUrl;
    } catch (e) {
        // En caso de CORS estricto, error de red o formato corrupto, silenciar y dejar icono de respaldo
        return null;
    }
}

