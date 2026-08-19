import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMockResource() {
    // get first sequence
    const { data: seqs, error: e1 } = await supabase.from('secuencias').select('*').limit(1);
    if (e1 || !seqs || seqs.length === 0) {
        console.error("No seqs");
        return;
    }
    const seq = seqs[0];
    const newRecurso = {
        id: "mock_123",
        titulo: "Informativo",
        categoria: "Informativo",
        url: "https://example.com",
        tipo: "web",
        orden: 1
    };
    console.log("Updating sequence:", seq.id);
    const { data, error } = await supabase.from('secuencias').update({ recursos: [newRecurso] }).eq('id', seq.id).select();
    if (error) {
        console.error("Failed to update:", error);
    } else {
        console.log("Updated correctly:", data[0].recursos);
    }
}

addMockResource();
