import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno manualmente desde el archivo .env del root
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const url = env.VITE_SUPABASE_URL || '';
const anonKey = env.VITE_SUPABASE_ANON_KEY || '';

console.log('Testing connection with:');
console.log('URL:', url);
console.log('ANON Key prefix:', anonKey.substring(0, 15) + '...');

if (!url || !anonKey) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function runTest() {
  console.log('Sending select query to "perfiles" table...');
  try {
    const { data, error, status } = await supabase.from('perfiles').select('*').limit(1);
    if (error) {
      console.error('Supabase query returned error:', error);
    } else {
      console.log('SUCCESS! Query status:', status);
      console.log('Data retrieved:', data);
    }
  } catch (err) {
    console.error('Network or fetch exception:', err);
  }
}

runTest();
