const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://sgjnactnhmpmbbgexcox.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnam5hY3RuaG1wbWJiZ2V4Y294Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU0NDA3MSwiZXhwIjoyMDg5MTIwMDcxfQ.5q55wA-xhX9ILrR_PQZ5XYF2piQbdv-3WuNbsoRQ68U";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testUpdates() {
  console.log("--- 1. Testing Activity Update (Rename & Competencies) ---");
  const actId = 178;
  const { data: actBeforeList } = await supabase.from('actividades').select('*').eq('id', actId);
  const actBefore = actBeforeList[0];
  console.log("Original Activity Name:", actBefore.nombre);
  console.log("Original Competencies:", actBefore.bc_asignados);

  // Simulate updating name
  const tempName = "ACTIV. TEST " + Math.round(Math.random() * 100);
  const tempBCs = ["BC1", "BC2", "BC3"];
  
  const { error: actUpdateError } = await supabase.from('actividades').upsert({
    ...actBefore,
    nombre: tempName,
    bc_asignados: tempBCs
  });
  
  if (actUpdateError) {
    console.error("Error updating activity:", actUpdateError);
  } else {
    console.log("Activity updated successfully.");
  }
  
  const { data: actAfterList } = await supabase.from('actividades').select('*').eq('id', actId);
  console.log("Updated Activity Name in DB:", actAfterList[0].nombre);
  console.log("Updated Competencies in DB:", actAfterList[0].bc_asignados);

  // Restore original activity name & competencies
  await supabase.from('actividades').update({
    nombre: actBefore.nombre,
    bc_asignados: actBefore.bc_asignados
  }).eq('id', actId);
  console.log("Activity restored.");

  console.log("\n--- 2. Testing Student Update (Rename) ---");
  const estId = 184;
  const { data: estBeforeList } = await supabase.from('estudiantes').select('*').eq('id', estId);
  const estBefore = estBeforeList[0];
  console.log("Original Student Name:", estBefore.nombre, estBefore.apellido);

  const tempNombre = "Juan";
  const tempApellido = "Perez";
  
  const { error: estUpdateError } = await supabase.from('estudiantes').upsert({
    ...estBefore,
    nombre: tempNombre,
    apellido: tempApellido
  });
  
  if (estUpdateError) {
    console.error("Error updating student:", estUpdateError);
  } else {
    console.log("Student updated successfully.");
  }
  
  const { data: estAfterList } = await supabase.from('estudiantes').select('*').eq('id', estId);
  console.log("Updated Student Name in DB:", estAfterList[0].nombre, estAfterList[0].apellido);

  // Restore original student name
  await supabase.from('estudiantes').update({
    nombre: estBefore.nombre,
    apellido: estBefore.apellido
  }).eq('id', estId);
  console.log("Student restored.");
}

testUpdates();
