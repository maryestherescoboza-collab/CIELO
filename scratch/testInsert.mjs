import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sgjnactnhmpmbbgexcox.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnam5hY3RuaG1wbWJiZ2V4Y294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDQwNzEsImV4cCI6MjA4OTEyMDA3MX0.CCrYMKKSJe2woS3NZBdzVlcy2CT1-Xwiw9GEaQMBMtk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('posts').insert([{
    autor: 'Docente Test',
    cargo: 'Matemática',
    contenido: 'Este es un test',
    tipo: 'general',
    asignatura: 'Matemática',
    user_id: '5db92bc0-cc40-4e00-ae81-9e13e211a872', // Replace with valid user_id if needed, or leave since we use admin key? Wait, this is ANON key
    fecha_publicacion: new Date().toISOString()
  }]).select('*, profiles:perfiles(nombre_docente, avatar_url, bio)');

  console.log("Error:", error);
  console.log("Data:", data);
}

test();
