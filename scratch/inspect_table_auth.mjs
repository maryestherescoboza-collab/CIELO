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

async function run() {
  const email = `test_inspector_${Date.now()}@example.com`;
  const password = `Password123!_${Date.now()}`;
  
  console.log('Signing up a temporary inspector user...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpError) {
    console.error('Sign up failed:', signUpError);
    return;
  }

  const session = signUpData.session;
  if (!session) {
    console.log('Sign up successful, but confirmation email may be required. Trying to sign in anyway...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      console.error('Sign in failed:', signInError);
      return;
    }
  }

  console.log('Successfully authenticated! Querying "recuperaciones" columns via postgrest if possible...');
  
  // Let's try to query recuperaciones table
  const { data: recs, error: recsError } = await supabase.from('recuperaciones').select('*').limit(5);
  if (recsError) {
    console.error('Failed to query recuperaciones:', recsError);
  } else {
    console.log('Successfully queried recuperaciones data:', recs);
  }

  // Let's query information_schema if we can, or just inspect database schema
  const { data: columnsData, error: columnsError } = await supabase
    .from('recuperaciones')
    .select('estudiante_id, curso_id, bc, puntaje, periodo, asignatura, user_id')
    .limit(1);

  if (columnsError) {
    console.error('Error querying specific columns:', columnsError);
  } else {
    console.log('Columns match expected definitions:', columnsData);
  }
}

run();
