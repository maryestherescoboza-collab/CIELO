/**
 * Suite de Pruebas Unitarias y de Integración para el Servidor CIELO MCP.
 * Ejecutable con Node.js / ts-node / Vitest.
 */

import { CIELO_TOOLS_DEFINITIONS, executeTool } from '../../supabase/functions/cielo-mcp/lib/tools.ts';
import { mismaAsignatura } from '../../supabase/functions/cielo-mcp/lib/auth.ts';

// Mock de Contexto Autenticado
const mockDocenteContext = {
  userId: 'docente-uuid-001',
  email: 'docente@liceo.edu.do',
  nombreDocente: 'Profesor de Prueba',
  centroId: 'centro-uuid-001',
  rolGlobal: 'docente',
  isCentroAdmin: false,
  accessToken: 'valid-mock-token',
};

async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE CIELO MCP ===\n');
  let passed = 0;
  let total = 0;

  function assert(desc: string, condition: boolean) {
    total++;
    if (condition) {
      console.log(`✓ [PASÓ] ${desc}`);
      passed++;
    } else {
      console.error(`✗ [FALLÓ] ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. Catálogo oficial de 9 herramientas registrado
  assert('El catálogo registra exactamente las 9 herramientas canónicas requeridas', CIELO_TOOLS_DEFINITIONS.length === 9);

  const toolNames = CIELO_TOOLS_DEFINITIONS.map(t => t.name);
  assert('Herramienta cielo_perfil está registrada', toolNames.includes('cielo_perfil'));
  assert('Herramienta cielo_listar_cursos está registrada', toolNames.includes('cielo_listar_cursos'));
  assert('Herramienta cielo_listar_estudiantes está registrada', toolNames.includes('cielo_listar_estudiantes'));
  assert('Herramienta cielo_consultar_estudiante está registrada', toolNames.includes('cielo_consultar_estudiante'));
  assert('Herramienta cielo_consultar_actividades está registrada', toolNames.includes('cielo_consultar_actividades'));
  assert('Herramienta cielo_consultar_calificaciones está registrada', toolNames.includes('cielo_consultar_calificaciones'));
  assert('Herramienta cielo_crear_actividad está registrada', toolNames.includes('cielo_crear_actividad'));
  assert('Herramienta cielo_registrar_calificacion está registrada', toolNames.includes('cielo_registrar_calificacion'));
  assert('Herramienta cielo_generar_reporte está registrada', toolNames.includes('cielo_generar_reporte'));

  // 2. Comprobación de normalización de asignaturas
  assert('mismaAsignatura reconoce nombres idénticos con o sin tildes', mismaAsignatura('Matemáticas', 'matematicas'));
  assert('mismaAsignatura rechaza asignaturas dispares', !mismaAsignatura('Lengua Española', 'Ciencias Sociales'));

  // Mock helper para simular cadena Supabase
  const mockDbWithCurso = {
    from: (table: string) => ({
      select: () => {
        const chain: any = {
          eq: () => chain,
          single: async () => {
            if (table === 'actividades') return { data: { id: 201, nombre: 'Actividad 1', periodo: 'P1', asignatura: 'Matemáticas', bc_asignados: ['BC1'] } };
            if (table === 'estudiantes') return { data: { id: 301, nombre: 'Juan', apellido: 'Perez', numero_lista: 1 } };
            return { data: null };
          },
          then: (resolve: any) => {
            if (table === 'cursos') {
              resolve({
                data: [
                  {
                    id: 101,
                    nombre: '1ro Secundaria A',
                    grado: '1ro Secundaria',
                    seccion: 'A',
                    periodo: 'P2',
                    centro_id: 'centro-uuid-001',
                    shared_course_id: 'c-101',
                    user_id: 'docente-uuid-001',
                    asignatura: 'Matemáticas',
                  },
                ],
                error: null,
              });
            } else if (table === 'curso_docentes') {
              resolve({ data: [], error: null });
            } else {
              resolve({ data: [], error: null });
            }
          },
        };
        return chain;
      },
    }),
  };

  // 3. Política de Confirmación en Creación de Actividades
  const previewActividad = await executeTool(
    'cielo_crear_actividad',
    {
      curso_id: 101,
      nombre: 'Prueba Parcial',
      fecha: '2026-11-15',
      periodo: 'P2',
      asignatura: 'Matemáticas',
      bc_asignados: ['BC1', 'BC2'],
      confirmado: false, // Sin confirmación
    },
    mockDocenteContext,
    mockDbWithCurso
  );

  assert('cielo_crear_actividad sin confirmado=true retorna requiere_confirmacion: true', previewActividad.requiere_confirmacion === true);
  assert('cielo_crear_actividad sin confirmado=true genera vista_previa estructurada', Boolean(previewActividad.vista_previa));

  // 4. Política de Confirmación en Registro de Calificaciones
  const previewCalif = await executeTool(
    'cielo_registrar_calificacion',
    {
      curso_id: 101,
      actividad_id: 201,
      estudiante_id: 301,
      puntaje: 95,
      confirmado: false,
    },
    mockDocenteContext,
    mockDbWithCurso
  );

  assert('cielo_registrar_calificacion sin confirmado=true retorna requiere_confirmacion: true', previewCalif.requiere_confirmacion === true);

  console.log(`\n=== RESULTADO: ${passed}/${total} PRUEBAS EXITOSAS ===`);
}

runTests();
