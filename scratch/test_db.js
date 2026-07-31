const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgjnactnhmpmbbgexcox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnam5hY3RuaG1wbWJiZ2V4Y294Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU0NDA3MSwiZXhwIjoyMDg5MTIwMDcxfQ.5q55wA-xhX9ILrR_PQZ5XYF2piQbdv-3WuNbsoRQ68U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("--- CURSO DETALLE SAMPLE ---");
    const { data, error } = await supabase.from('curso_detalle').select('*').limit(1);
    if (error) {
        console.error("Error fetching curso_detalle:", error);
    } else {
        console.log(data);
    }
}

test();
