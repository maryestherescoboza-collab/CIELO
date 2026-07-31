const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgjnactnhmpmbbgexcox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnam5hY3RuaG1wbWJiZ2V4Y294Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU0NDA3MSwiZXhwIjoyMDg5MTIwMDcxfQ.5q55wA-xhX9ILrR_PQZ5XYF2piQbdv-3WuNbsoRQ68U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const res1 = await supabase.from('perfiles').select('*, centros!perfiles_centro_id_fkey(*)');
    console.log("Returned keys in p:", Object.keys(res1.data[0]));
    console.log("centros value:", res1.data[0].centros);
}

test();
