const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://sgjnactnhmpmbbgexcox.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnam5hY3RuaG1wbWJiZ2V4Y294Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU0NDA3MSwiZXhwIjoyMDg5MTIwMDcxfQ.5q55wA-xhX9ILrR_PQZ5XYF2piQbdv-3WuNbsoRQ68U";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const parseObservaciones = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
            } catch (e) {
                // Fallback
            }
        }
        return trimmed ? [trimmed] : [];
    }
    return [];
};

async function runTestFlow() {
  const estId = 184;
  const actId = 178;
  const originalRowId = 305;
  
  console.log("--- 1. Fetching current db row ---");
  const { data: fetch1, error: err1 } = await supabase.from('curso_detalle').select('*').eq('id', originalRowId);
  if (err1) {
    console.error("Error fetching:", err1);
    return;
  }
  const rowBefore = fetch1[0];
  console.log("Raw observations in DB:", JSON.stringify(rowBefore.observaciones));
  const parsedBefore = parseObservaciones(rowBefore.observaciones);
  console.log("Parsed observations in state:", parsedBefore);
  
  console.log("\n--- 2. Simulating User Input and Save ---");
  const userInputText = "El estudiante argumenta correctamente sus respuestas.\nPresentó dificultades al resolver el segundo ejercicio.\nMostró una participación activa durante la actividad.";
  const observationsArray = userInputText.split('\n').map(s => s.trim()).filter(Boolean);
  
  const updatePayload = {
    id: originalRowId,
    user_id: rowBefore.user_id,
    curso_id: rowBefore.curso_id,
    actividad_id: actId,
    estudiante_id: estId,
    rubrica_data: rowBefore.rubrica_data,
    cotejo_data: rowBefore.cotejo_data,
    puntaje_total: rowBefore.puntaje_total,
    observaciones: observationsArray, // saving as array!
    plantilla_id: rowBefore.plantilla_id,
    shared_course_id: rowBefore.shared_course_id
  };
  
  const { data: upsertData, error: err2 } = await supabase.from('curso_detalle').upsert([updatePayload], { onConflict: 'estudiante_id,actividad_id' }).select();
  if (err2) {
    console.error("Error saving:", err2);
    return;
  }
  console.log("Upserted successfully! DB observations returned in select:", JSON.stringify(upsertData[0].observaciones));
  
  console.log("\n--- 3. Verifying Load after Reloading/Refetching ---");
  const { data: fetch2, error: err3 } = await supabase.from('curso_detalle').select('*').eq('id', originalRowId);
  if (err3) {
    console.error("Error fetching second time:", err3);
    return;
  }
  const rowAfter = fetch2[0];
  const parsedAfter = parseObservaciones(rowAfter.observaciones);
  console.log("Verified loaded observations after refetching:", parsedAfter);
  
  console.log("\n--- 4. Cleaning up ---");
  await supabase.from('curso_detalle').update({ observaciones: '' }).eq('id', originalRowId);
  console.log("Cleanup complete!");
}

runTestFlow();
