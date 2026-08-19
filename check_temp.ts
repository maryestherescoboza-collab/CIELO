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

async function check() {
    const { data, error } = await supabase.from('secuencias').select('id, titulo, recursos').not('recursos', 'is', null);
    if (error) {
        console.error(error);
    } else {
        const withRecursos = data.filter(s => {
            if (!s.recursos) return false;
            if (Array.isArray(s.recursos)) return s.recursos.length > 0;
            if (typeof s.recursos === 'string') {
                if (s.recursos === '[]') return false;
                try {
                    const parsed = JSON.parse(s.recursos);
                    return Array.isArray(parsed) && parsed.length > 0;
                } catch(e) { return false; }
            }
            return false;
        });
        console.log("Secuencias with recursos:");
        console.log(JSON.stringify(withRecursos, null, 2));
    }
}

check();
