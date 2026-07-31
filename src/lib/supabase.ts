import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase URL or Anon Key is missing. The application will not function correctly. Please check your .env file.');
}

// Wrapper de fetch personalizado para registrar auditoría de red y fallos de tipo "Failed to fetch"
const customFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err: any) {
    console.error(`[Supabase API Client Network Error] Fallo al consultar: ${url}. Mensaje: ${err?.message || err}. ¿Conexión a Internet caída o bloqueo CORS?`);
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
});
