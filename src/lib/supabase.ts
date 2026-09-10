import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase URL or Anon Key is missing. The application will not function correctly. Please check your .env file.');
}

const pendingRequests = new Set<string>();

// Wrapper de fetch personalizado para registrar auditoría de red y fallos de tipo "Failed to fetch"
const customFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();
  const isPostgrest = urlStr.includes('/rest/v1/');
  
  if (!isPostgrest) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      console.error(`[Supabase API Client Network Error] Fallo al consultar: ${url}. Mensaje: ${err?.message || err}.`);
      throw err;
    }
  }

  const method = options?.method || 'GET';
  const tableMatch = urlStr.match(/\/rest\/v1\/([^?]+)/);
  const table = tableMatch ? tableMatch[1] : 'unknown';
  
  // Create a unique key for deduplication detection
  const reqKey = `${method}:${urlStr}`;
  const isConcurrent = pendingRequests.has(reqKey);
  if (!isConcurrent) {
    pendingRequests.add(reqKey);
  }

  const start = performance.now();
  const timestamp = new Date().toISOString();

  try {
    const res = await fetch(url, options);
    const end = performance.now();
    const duration = Math.round(end - start);
    
    // Size and rows
    const resClone = res.clone();
    let size = res.headers.get('content-length') || 'unknown';
    let rowCount: number | 'unknown' = 'unknown';
    
    try {
      const text = await resClone.text();
      if (size === 'unknown') {
        size = text.length.toString();
      }
      if (text.startsWith('[')) {
        const json = JSON.parse(text);
        rowCount = Array.isArray(json) ? json.length : 'unknown';
      } else if (text.startsWith('{')) {
        rowCount = 1;
      }
    } catch (e) {
      // Ignore
    }

    console.log(`[MEDICION_1.8] ${JSON.stringify({
      timestamp,
      duration,
      method,
      url: urlStr,
      table,
      status: res.status,
      size,
      rowCount,
      concurrent: isConcurrent
    })}`);

    return res;
  } catch (err: any) {
    console.error(`[Supabase API Client Network Error] Fallo al consultar: ${url}. Mensaje: ${err?.message || err}. ¿Conexión a Internet caída o bloqueo CORS?`);
    throw err;
  } finally {
    pendingRequests.delete(reqKey);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
});
