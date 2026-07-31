import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(url, anonKey);

async function inspect() {
  console.log('--- Checking recuperaciones ---');
  try {
    const { data: recs, error: recsError } = await supabase.from('recuperaciones').select('*').limit(20);
    if (recsError) {
      console.error('Error fetching recuperaciones:', recsError);
    } else {
      console.log('Recuperaciones rows (up to 20):', recs);
    }
  } catch (err) {
    console.error('Error in recuperaciones query:', err);
  }

  console.log('--- Checking calificaciones ---');
  try {
    const { data: califs, error: califsError } = await supabase.from('calificaciones').select('*').limit(5);
    if (califsError) {
      console.error('Error fetching calificaciones:', califsError);
    } else {
      console.log('Calificaciones rows (up to 5):', califs);
    }
  } catch (err) {
    console.error('Error in calificaciones query:', err);
  }
}

inspect();
