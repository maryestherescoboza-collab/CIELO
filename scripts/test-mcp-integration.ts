/**
 * FASE 7: Suite de Pruebas Obligatorias de Integración, Autorización, Idempotencia y Cálculo Académico MCP.
 *
 * Verifica los 12 escenarios exigidos:
 * 1. Consulta de estudiantes de un curso propio.
 * 2. Bloqueo de acceso a estudiantes de otro centro (`centro_id` distinto).
 * 3. Bloqueo de acceso a asignatura no autorizada.
 * 4. Consulta de un co-docente con permisos limitados a su asignatura.
 * 5. Preparación de actividad (vista previa).
 * 6. Bloqueo de creación de actividad sin confirmación (`confirmado !== true` o sin `confirmation_token`).
 * 7. Creación de actividad tras confirmación explícita.
 * 8. Prevención de duplicados por reintento (idempotencia con misma `idempotency_key` o duplicado en BD).
 * 9. Generación de reporte académico con datos reales y fórmulas oficiales (`calculateStudentPeriodBC`, Producto Final, Recuperación).
 * 10. Filtrado correcto por período (`P1` vs `P2`) y separación entre calificaciones registradas y actividades pendientes.
 * 11. Rechazo de parámetros manipulados (`user_id` o `centro_id` inyectados en argumentos).
 * 12. Revocación de acceso OAuth 2.0 y bloqueo inmediato de solicitudes posteriores.
 */

import assert from 'node:assert/strict';
import {
  buildAuthenticatedContext,
  clearActivityPreviewAndIdempotencyStores,
  clearAllMCPCache,
  clearMCPAuditLogs,
  executeMCPToolCall,
  exchangeCodeForToken,
  getMCPAuditLogs,
  handleMCPJsonRpc,
  issueAuthorizationCode,
  MCPAuthorizationError,
  revokeOAuthToken,
  validateOAuthAccessToken,
  type CieloDataRepository,
  type PeriodoAcademico,
  type BCKey,
} from '../src/mcp/index';

// ============================================================================
// Mock Repository In-Memory con datos multi-centro y multi-docente realistas
// ============================================================================
function createMockRepository(): CieloDataRepository & { insertedActivitiesCount: () => number } {
  const perfiles = [
    {
      user_id: 'docente-tutor-1',
      nombre: 'Prof. Juan Pérez',
      nombre_docente: 'Prof. Juan Pérez',
      centro_id: 'centro-A',
      rol: 'docente',
      asignaturas: ['Lengua Española'],
    },
    {
      user_id: 'docente-codocente-2',
      nombre: 'Prof. María Gómez',
      nombre_docente: 'Prof. María Gómez',
      centro_id: 'centro-A',
      rol: 'docente',
      asignaturas: ['Matemática'],
    },
    {
      user_id: 'docente-otro-centro-3',
      nombre: 'Prof. Carlos Ruiz',
      nombre_docente: 'Prof. Carlos Ruiz',
      centro_id: 'centro-B',
      rol: 'docente',
      asignaturas: ['Ciencias de la Naturaleza'],
    },
  ];

  const cursos = [
    {
      id: 101,
      nombre: '1ro A Secundaria',
      asignatura: 'Lengua Española',
      grado: '1ro',
      seccion: 'A',
      periodo: '2025-2026',
      is_tutor_oficial: true,
      user_id: 'docente-tutor-1',
      grupo_id: 10,
      shared_course_id: 'shared_101',
      centro_id: 'centro-A',
      activo: true,
    },
    {
      id: 202,
      nombre: '2do B Otro Centro',
      asignatura: 'Ciencias de la Naturaleza',
      grado: '2do',
      seccion: 'B',
      periodo: '2025-2026',
      is_tutor_oficial: true,
      user_id: 'docente-otro-centro-3',
      grupo_id: 20,
      shared_course_id: 'shared_202',
      centro_id: 'centro-B',
      activo: true,
    },
  ];

  const cursoDocentes = [
    {
      id: 1,
      curso_id: 101,
      docente_id: 'docente-tutor-1',
      rol: 'tutor' as const,
      es_tutor: true,
      asignatura: 'Lengua Española',
      activo: true,
    },
    {
      id: 2,
      curso_id: 101,
      docente_id: 'docente-codocente-2',
      rol: 'co-docente' as const,
      es_tutor: false,
      asignatura: 'Matemática',
      activo: true,
    },
    {
      id: 3,
      curso_id: 202,
      docente_id: 'docente-otro-centro-3',
      rol: 'tutor' as const,
      es_tutor: true,
      asignatura: 'Ciencias de la Naturaleza',
      activo: true,
    },
  ];

  const estudiantes = [
    {
      id: 1001,
      nombre: 'Ana',
      apellido: 'Martínez',
      curso_id: 101,
      grupo_id: 10,
      shared_course_id: 'shared_101',
      numero_lista: 1,
      activo: true,
      en_riesgo: false,
      nivel: 'Dominio Completo',
      puntaje: 92,
    },
    {
      id: 1002,
      nombre: 'Luis',
      apellido: 'Tejada',
      curso_id: 101,
      grupo_id: 10,
      shared_course_id: 'shared_101',
      numero_lista: 2,
      activo: true,
      en_riesgo: true,
      nivel: 'En Riesgo',
      puntaje: 60,
    },
    {
      id: 2001,
      nombre: 'Pedro',
      apellido: 'De Otro Centro',
      curso_id: 202,
      grupo_id: 20,
      shared_course_id: 'shared_202',
      numero_lista: 1,
      activo: true,
      en_riesgo: false,
      nivel: 'Logro Esperado',
      puntaje: 85,
    },
  ];

  const actividades: Array<{
    id: number;
    nombre: string;
    curso_id: number;
    fecha: string;
    periodo: PeriodoAcademico;
    bc_asignados: BCKey[];
    is_rec: boolean;
    is_producto_final: boolean;
    user_id: string;
    asignatura: string;
    shared_course_id: string;
    indicador: string | null;
    indicadores_json: any;
    producto: string | null;
    descripcion: string | null;
    activo: boolean;
  }> = [
    {
      id: 501,
      nombre: 'Análisis de texto funcional',
      curso_id: 101,
      fecha: '2026-10-10',
      periodo: 'P1',
      bc_asignados: ['BC1', 'BC2'],
      is_rec: false,
      is_producto_final: false,
      user_id: 'docente-tutor-1',
      asignatura: 'Lengua Española',
      shared_course_id: 'shared_101',
      indicador: 'IL-1.1 Comprende textos funcionales orales y escritos',
      indicadores_json: [{ codigo: 'IL-1.1', descripcion: 'Comprende textos funcionales orales y escritos' }],
      producto: 'Informe de lectura',
      descripcion: null,
      activo: true,
    },
    {
      id: 502,
      nombre: 'Debate argumentativo',
      curso_id: 101,
      fecha: '2026-10-20',
      periodo: 'P1',
      bc_asignados: ['BC1'],
      is_rec: false,
      is_producto_final: false,
      user_id: 'docente-tutor-1',
      asignatura: 'Lengua Española',
      shared_course_id: 'shared_101',
      indicador: 'IL-1.2 Produce argumentos coherentes',
      indicadores_json: [{ codigo: 'IL-1.2', descripcion: 'Produce argumentos coherentes' }],
      producto: 'Guion de debate',
      descripcion: null,
      activo: true,
    },
    {
      id: 503,
      nombre: 'Resolución de ecuaciones lineales',
      curso_id: 101,
      fecha: '2026-11-05',
      periodo: 'P2',
      bc_asignados: ['BC2'],
      is_rec: false,
      is_producto_final: false,
      user_id: 'docente-codocente-2',
      asignatura: 'Matemática',
      shared_course_id: 'shared_101',
      indicador: 'IL-M.1 Resuelve problemas con ecuaciones lineales',
      indicadores_json: [{ codigo: 'IL-M.1', descripcion: 'Resuelve problemas con ecuaciones lineales' }],
      producto: 'Práctica resuelta',
      descripcion: null,
      activo: true,
    },
  ];

  const calificaciones = [
    // Ana Martínez (1001) en P1 Lengua Española: tiene las 2 actividades calificadas (90 y 94 -> BC1 = 92, BC2 = 90)
    {
      id: 9001,
      curso_id: 101,
      estudiante_id: 1001,
      actividad_id: 501,
      user_id: 'docente-tutor-1',
      asignatura: 'Lengua Española',
      periodo: 'P1',
      competencias: ['BC1', 'BC2'],
      puntaje: 90,
      shared_course_id: 'shared_101',
      activo: true,
    },
    {
      id: 9002,
      curso_id: 101,
      estudiante_id: 1001,
      actividad_id: 502,
      user_id: 'docente-tutor-1',
      asignatura: 'Lengua Española',
      periodo: 'P1',
      competencias: ['BC1'],
      puntaje: 94,
      shared_course_id: 'shared_101',
      activo: true,
    },
    // Luis Tejada (1002) en P1 Lengua Española: tiene calificada la actividad 501 con 60, y la actividad 502 PENDIENTE (sin fila)
    {
      id: 9003,
      curso_id: 101,
      estudiante_id: 1002,
      actividad_id: 501,
      user_id: 'docente-tutor-1',
      asignatura: 'Lengua Española',
      periodo: 'P1',
      competencias: ['BC1', 'BC2'],
      puntaje: 60,
      shared_course_id: 'shared_101',
      activo: true,
    },
    // En P2 Matemática (actividad 503): Ana tiene 95
    {
      id: 9004,
      curso_id: 101,
      estudiante_id: 1001,
      actividad_id: 503,
      user_id: 'docente-codocente-2',
      asignatura: 'Matemática',
      periodo: 'P2',
      competencias: ['BC2'],
      puntaje: 95,
      shared_course_id: 'shared_101',
      activo: true,
    },
  ];

  let nextActId = 600;
  let insertCount = 0;

  return {
    insertedActivitiesCount: () => insertCount,

    async getPerfil(userId: string) {
      return perfiles.find(p => p.user_id === userId) || null;
    },

    async getCursosByIdsOrUser(userId: string, centroId: string | null, isCentroAdmin: boolean) {
      const misLinks = cursoDocentes.filter(cd => cd.docente_id === userId && cd.activo);
      const linkedIds = new Set(misLinks.map(l => l.curso_id));
      const matchedCursos = cursos.filter(c => {
        if (!c.activo) return false;
        if (isCentroAdmin && centroId) return c.centro_id === centroId;
        return c.user_id === userId || linkedIds.has(c.id);
      });
      return {
        cursos: matchedCursos,
        cursoDocentes: misLinks,
      };
    },

    async getEstudiantesByCursoContext({ cursoIds, sharedCourseIds, grupoIds }) {
      return estudiantes.filter(
        e =>
          e.activo &&
          (cursoIds.includes(e.curso_id) ||
            (e.shared_course_id && sharedCourseIds.includes(e.shared_course_id)) ||
            (e.grupo_id !== null && grupoIds.includes(e.grupo_id)))
      );
    },

    async getActividadesCursoPeriodo({ cursoId, sharedCourseId, periodo }) {
      return actividades.filter(
        a =>
          a.activo &&
          a.periodo === periodo &&
          (a.curso_id === cursoId || a.shared_course_id === sharedCourseId)
      );
    },

    async getCalificacionesCursoPeriodo({ cursoId, sharedCourseId, periodo }) {
      return calificaciones.filter(
        c =>
          c.activo &&
          c.periodo === periodo &&
          (c.curso_id === cursoId || c.shared_course_id === sharedCourseId)
      );
    },

    async getRecuperacionesCursoPeriodo() {
      return [];
    },

    async findExistingActividad({ cursoId, asignatura, periodo, nombre, fecha }) {
      const found = actividades.find(
        a =>
          a.activo &&
          a.curso_id === cursoId &&
          a.periodo === periodo &&
          a.fecha === fecha &&
          a.nombre.toLowerCase() === nombre.trim().toLowerCase() &&
          a.asignatura.toLowerCase() === asignatura.trim().toLowerCase()
      );
      return found ? { id: found.id, nombre: found.nombre, fecha: found.fecha } : null;
    },

    async insertActividad(payload) {
      insertCount++;
      const created = {
        id: ++nextActId,
        nombre: payload.nombre,
        fecha: payload.fecha,
        periodo: payload.periodo,
        curso_id: payload.curso_id,
        bc_asignados: payload.bc_asignados,
        is_rec: payload.is_rec,
        is_producto_final: payload.is_producto_final,
        user_id: payload.user_id,
        asignatura: payload.asignatura,
        shared_course_id: payload.shared_course_id,
        indicador: payload.indicador,
        indicadores_json: payload.indicadores_json,
        producto: payload.producto,
        descripcion: payload.descripcion,
        activo: true,
      };
      actividades.push(created);
      return {
        id: created.id,
        nombre: created.nombre,
        fecha: created.fecha,
        periodo: created.periodo,
        curso_id: created.curso_id,
        bc_asignados: created.bc_asignados,
        asignatura: created.asignatura,
        indicador: created.indicador || '',
        producto: created.producto || '',
      };
    },
  };
}

async function runAllTests() {
  console.log('===================================================================');
  console.log('🧪 INICIANDO SUITE DE PRUEBAS OBLIGATORIAS: CIELO + CHATGPT MCP');
  console.log('===================================================================\n');

  clearAllMCPCache();
  clearMCPAuditLogs();
  clearActivityPreviewAndIdempotencyStores();

  const repo = createMockRepository();
  const tutorAuth = await buildAuthenticatedContext('docente-tutor-1', 'jwt-tutor-1', repo, 'juan@cielo.do');
  const coDocenteAuth = await buildAuthenticatedContext('docente-codocente-2', 'jwt-codocente-2', repo, 'maria@cielo.do');

  // --------------------------------------------------------------------------
  // PRUEBA 1: Consulta de estudiantes de un curso propio
  // --------------------------------------------------------------------------
  {
    const res: any = await executeMCPToolCall(
      'consultar_estudiantes',
      { curso_id: 101, page: 1, page_size: 10 },
      tutorAuth,
      repo
    );
    assert.equal(res.ok, true);
    assert.equal(res.estudiantes.length, 2, 'Debe devolver exactamente los 2 estudiantes del curso 101');
    assert.equal(res.estudiantes[0].nombre_completo, 'Ana Martínez');
    assert.equal(res.estudiantes[1].nombre_completo, 'Luis Tejada');
    console.log('✅ Prueba 1 PASÓ: Consulta de estudiantes de un curso propio.');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 2: Bloqueo de acceso a estudiantes de otro centro
  // --------------------------------------------------------------------------
  {
    let blocked = false;
    try {
      await executeMCPToolCall('consultar_estudiantes', { curso_id: 202 }, tutorAuth, repo);
    } catch (err: any) {
      blocked = err instanceof MCPAuthorizationError && err.httpStatus === 403;
    }
    assert.equal(blocked, true, 'El acceso al curso 202 de otro centro educativo debe ser bloqueado con 403');

    // También probamos buscar_estudiante para verificar que nunca devuelve a "Pedro De Otro Centro"
    const searchRes: any = await executeMCPToolCall(
      'buscar_estudiante',
      { query: 'Pedro' },
      tutorAuth,
      repo
    );
    assert.equal(searchRes.estudiantes.length, 0, 'Búsqueda nunca debe filtrar estudiantes de otro centro');
    console.log('✅ Prueba 2 PASÓ: Bloqueo estricto de acceso a estudiantes de otro centro educativo.');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 3: Bloqueo de acceso a asignatura no autorizada
  // --------------------------------------------------------------------------
  {
    let blocked = false;
    try {
      // El co-docente imparte Matemática, intenta consultar/crear en Ciencias Sociales
      await executeMCPToolCall(
        'consultar_estudiantes',
        { curso_id: 101, asignatura_id: 'Ciencias Sociales' },
        coDocenteAuth,
        repo
      );
    } catch (err: any) {
      blocked = err instanceof MCPAuthorizationError && err.code === 'FORBIDDEN_SUBJECT';
    }
    assert.equal(blocked, true, 'Debe bloquear el acceso a una asignatura no autorizada');
    console.log('✅ Prueba 3 PASÓ: Bloqueo de acceso a asignatura no autorizada.');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 4: Consulta de un co-docente con permisos limitados a su asignatura
  // --------------------------------------------------------------------------
  {
    const res: any = await executeMCPToolCall(
      'consultar_estudiantes',
      { curso_id: 101, asignatura_id: 'Matemática' },
      coDocenteAuth,
      repo
    );
    assert.equal(res.ok, true);
    assert.equal(res.curso.asignatura_consultada, 'Matemática');
    assert.equal(res.estudiantes.length, 2);

    // Verificar que el co-docente NO puede generar reporte de Lengua Española
    let blockedOtherSubj = false;
    try {
      await executeMCPToolCall(
        'generar_reporte_academico',
        {
          tipo_reporte: 'rendimiento_general_curso',
          curso_id: 101,
          asignatura: 'Lengua Española',
          periodo: 'P1',
        },
        coDocenteAuth,
        repo
      );
    } catch (err: any) {
      blockedOtherSubj = err instanceof MCPAuthorizationError && err.code === 'FORBIDDEN_SUBJECT';
    }
    assert.equal(blockedOtherSubj, true, 'Co-docente no puede leer reportes de otra asignatura');
    console.log('✅ Prueba 4 PASÓ: Co-docente limitado estrictamente a su asignatura asignada.');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 5: Preparación de actividad (vista previa sin escribir en BD)
  // --------------------------------------------------------------------------
  let confirmationToken = '';
  let idempotencyKey = '';
  const baseActivityPayload = {
    curso_id: 101,
    asignatura: 'Lengua Española',
    titulo: 'Ensayo sobre el cambio climático',
    descripcion: 'Redacción de un ensayo argumentativo de 3 páginas.',
    periodo: 'P2',
    competencias: ['BC1', 'BC3'],
    indicadores: ['IL-2.1 Estructura argumentos sobre problemáticas ambientales'],
    producto_evidencia: 'Ensayo escrito',
    criterios_evaluacion: ['Tesis clara', 'Uso de conectores lógicos', 'Ortografía'],
    puntaje_maximo: 100,
    fecha_entrega: '2026-11-20',
  };

  {
    const beforeCount = repo.insertedActivitiesCount();
    const previewRes: any = await executeMCPToolCall(
      'crear_actividad',
      { ...baseActivityPayload, accion: 'preparar' },
      tutorAuth,
      repo
    );

    assert.equal(previewRes.ok, true);
    assert.equal(previewRes.estado, 'PENDIENTE_CONFIRMACION_USUARIO');
    assert.equal(previewRes.requiere_confirmacion_explicita, true);
    assert.ok(previewRes.confirmation_token, 'Debe emitir confirmation_token');
    assert.ok(previewRes.idempotency_key, 'Debe emitir idempotency_key');
    assert.equal(repo.insertedActivitiesCount(), beforeCount, 'Modo preparar NO debe escribir en la base de datos');

    confirmationToken = previewRes.confirmation_token;
    idempotencyKey = previewRes.idempotency_key;
    console.log('✅ Prueba 5 PASÓ: Preparación de actividad (vista previa estructurada sin escritura en BD).');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 6: Bloqueo de creación de actividad sin confirmación
  // --------------------------------------------------------------------------
  {
    let blockedNoConfirmFlag = false;
    try {
      await executeMCPToolCall(
        'crear_actividad',
        {
          ...baseActivityPayload,
          accion: 'confirmar',
          confirmation_token: confirmationToken,
          idempotency_key: idempotencyKey,
          confirmado: false,
        },
        tutorAuth,
        repo
      );
    } catch (err: any) {
      blockedNoConfirmFlag = err instanceof MCPAuthorizationError && err.httpStatus === 400;
    }
    assert.equal(blockedNoConfirmFlag, true, 'Debe bloquear creación cuando confirmado !== true');

    let blockedInvalidToken = false;
    try {
      await executeMCPToolCall(
        'crear_actividad',
        {
          ...baseActivityPayload,
          accion: 'confirmar',
          confirmation_token: 'conf_token_falso',
          idempotency_key: idempotencyKey,
          confirmado: true,
        },
        tutorAuth,
        repo
      );
    } catch (err: any) {
      blockedInvalidToken = err instanceof MCPAuthorizationError && err.httpStatus === 400;
    }
    assert.equal(blockedInvalidToken, true, 'Debe bloquear creación cuando confirmation_token es inválido');
    assert.equal(repo.insertedActivitiesCount(), 0, 'Ninguna actividad debe haberse insertado aún');
    console.log('✅ Prueba 6 PASÓ: Bloqueo de creación de actividad sin confirmación explícita.');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 7: Creación de actividad tras confirmación explícita
  // --------------------------------------------------------------------------
  let createdActivityId = 0;
  {
    const confirmRes: any = await executeMCPToolCall(
      'crear_actividad',
      {
        ...baseActivityPayload,
        accion: 'confirmar',
        confirmation_token: confirmationToken,
        idempotency_key: idempotencyKey,
        confirmado: true,
      },
      tutorAuth,
      repo
    );

    assert.equal(confirmRes.ok, true);
    assert.equal(confirmRes.estado, 'CREADA');
    assert.equal(confirmRes.idempotente_reutilizado, false);
    assert.equal(repo.insertedActivitiesCount(), 1, 'Debe haber insertado exactamente 1 actividad');
    createdActivityId = confirmRes.actividad.id;
    assert.ok(createdActivityId > 0);
    console.log(`✅ Prueba 7 PASÓ: Creación de actividad tras confirmación explícita (ID #${createdActivityId}).`);
  }

  // --------------------------------------------------------------------------
  // PRUEBA 8: Prevención de duplicados por reintento (idempotencia)
  // --------------------------------------------------------------------------
  {
    const retryRes: any = await executeMCPToolCall(
      'crear_actividad',
      {
        ...baseActivityPayload,
        accion: 'confirmar',
        confirmation_token: confirmationToken,
        idempotency_key: idempotencyKey,
        confirmado: true,
      },
      tutorAuth,
      repo
    );

    assert.equal(retryRes.ok, true);
    assert.equal(retryRes.idempotente_reutilizado, true, 'Debe marcar el resultado como reutilizado por idempotencia');
    assert.equal(retryRes.actividad.id, createdActivityId, 'Debe devolver el mismo ID de actividad');
    assert.equal(repo.insertedActivitiesCount(), 1, 'NO debe insertar un segundo registro en la base de datos');
    console.log('✅ Prueba 8 PASÓ: Prevención de duplicados por reintento (idempotencia garantizada).');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 9: Generación de reporte académico con datos reales y fórmulas CIELO
  // --------------------------------------------------------------------------
  {
    const repGeneral: any = await executeMCPToolCall(
      'generar_reporte_academico',
      {
        tipo_reporte: 'rendimiento_general_curso',
        curso_id: 101,
        asignatura: 'Lengua Española',
        periodo: 'P1',
      },
      tutorAuth,
      repo
    );
    assert.equal(repGeneral.ok, true);
    assert.equal(repGeneral.resumen_ejecutivo.total_estudiantes, 2);
    assert.equal(repGeneral.resumen_ejecutivo.estudiantes_aprobados, 1); // Ana Martínez (91)
    assert.equal(repGeneral.resumen_ejecutivo.estudiantes_en_recuperacion, 1); // Luis Tejada

    const repRecup: any = await executeMCPToolCall(
      'generar_reporte_academico',
      {
        tipo_reporte: 'estudiantes_recuperacion_pedagogica',
        curso_id: 101,
        asignatura: 'Lengua Española',
        periodo: 'P1',
      },
      tutorAuth,
      repo
    );
    assert.equal(repRecup.total_requieren_recuperacion, 1);
    assert.equal(repRecup.estudiantes_en_recuperacion[0].nombre_completo, 'Luis Tejada');

    const repPendientes: any = await executeMCPToolCall(
      'generar_reporte_academico',
      {
        tipo_reporte: 'estudiantes_actividades_pendientes',
        curso_id: 101,
        asignatura: 'Lengua Española',
        periodo: 'P1',
      },
      tutorAuth,
      repo
    );
    assert.equal(repPendientes.total_estudiantes_con_pendientes, 1);
    assert.equal(repPendientes.estudiantes[0].nombre_completo, 'Luis Tejada');
    assert.equal(repPendientes.estudiantes[0].actividades_pendientes[0].titulo, 'Debate argumentativo');
    console.log('✅ Prueba 9 PASÓ: Generación de reportes académicos con fórmulas oficiales y separación de pendientes.');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 10: Filtrado correcto por período (P1 vs P2)
  // --------------------------------------------------------------------------
  {
    const repMatP1: any = await executeMCPToolCall(
      'generar_reporte_academico',
      {
        tipo_reporte: 'resumen_calificaciones_periodo',
        curso_id: 101,
        asignatura: 'Matemática',
        periodo: 'P1',
      },
      coDocenteAuth,
      repo
    );
    assert.equal(repMatP1.promedio_general_curso, null, 'En P1 Matemática no hay actividades evaluadas');

    const repMatP2: any = await executeMCPToolCall(
      'generar_reporte_academico',
      {
        tipo_reporte: 'resumen_calificaciones_periodo',
        curso_id: 101,
        asignatura: 'Matemática',
        periodo: 'P2',
      },
      coDocenteAuth,
      repo
    );
    const anaP2 = repMatP2.calificaciones_estudiantes.find((e: any) => e.estudiante_id === 1001);
    assert.equal(anaP2.BC2, 95, 'En P2 Matemática Ana tiene 95 en BC2');
    console.log('✅ Prueba 10 PASÓ: Filtrado estricto por período académico (P1 vs P2).');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 11: Rechazo de parámetros manipulados (`user_id` / `centro_id`)
  // --------------------------------------------------------------------------
  {
    let rejectedUserOverride = false;
    try {
      await executeMCPToolCall(
        'consultar_estudiantes',
        {
          curso_id: 101,
          user_id: 'docente-otro-centro-3',
        },
        tutorAuth,
        repo
      );
    } catch (err: any) {
      rejectedUserOverride = err instanceof MCPAuthorizationError && err.httpStatus === 403;
    }
    assert.equal(rejectedUserOverride, true, 'Debe rechazar cualquier user_id manipulado en los argumentos');

    let rejectedCenterOverride = false;
    try {
      await executeMCPToolCall(
        'consultar_estudiantes',
        {
          curso_id: 101,
          centro_id: 'centro-B',
        },
        tutorAuth,
        repo
      );
    } catch (err: any) {
      rejectedCenterOverride = err instanceof MCPAuthorizationError && err.httpStatus === 403;
    }
    assert.equal(rejectedCenterOverride, true, 'Debe rechazar cualquier centro_id manipulado en los argumentos');
    console.log('✅ Prueba 11 PASÓ: Rechazo inmediato de parámetros de identidad o centro manipulados.');
  }

  // --------------------------------------------------------------------------
  // PRUEBA 12: Flujo OAuth 2.0 + PKCE, Transporte JSON-RPC y Revocación de Token
  // --------------------------------------------------------------------------
  {
    const authCode = issueAuthorizationCode({
      userId: 'docente-tutor-1',
      email: 'juan@cielo.do',
      supabaseAccessToken: 'supabase_jwt_secreto_123',
      clientId: 'chatgpt-mcp',
      redirectUri: 'https://chatgpt.com/aip/oauth/callback',
    });

    const tokenRes = await exchangeCodeForToken({
      code: authCode.code,
      clientId: 'chatgpt-mcp',
      redirectUri: 'https://chatgpt.com/aip/oauth/callback',
    });

    assert.ok(tokenRes.access_token.startsWith('cielo_at_'));
    const validated = validateOAuthAccessToken(tokenRes.access_token);
    assert.equal(validated.userId, 'docente-tutor-1');

    // Probar JSON-RPC tools/list
    const listRpc = await handleMCPJsonRpc(
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      tutorAuth,
      repo
    );
    assert.equal((listRpc.result as any).tools.length, 4);

    // Revocar el token OAuth
    const revoked = revokeOAuthToken(tokenRes.access_token);
    assert.equal(revoked, true);

    let failedAfterRevoke = false;
    try {
      validateOAuthAccessToken(tokenRes.access_token);
    } catch {
      failedAfterRevoke = true;
    }
    assert.equal(failedAfterRevoke, true, 'El token revocado debe ser rechazado inmediatamente');
    console.log('✅ Prueba 12 PASÓ: Flujo OAuth 2.0, transporte JSON-RPC 2.0 y revocación inmediata de tokens.');
  }

  // --------------------------------------------------------------------------
  // VERIFICACIÓN ADICIONAL: Auditoría sin filtración de secretos
  // --------------------------------------------------------------------------
  {
    const logs = getMCPAuditLogs();
    assert.ok(logs.length >= 10, 'Deben haberse registrado los eventos en el log de auditoría');
    const serialized = JSON.stringify(logs);
    assert.equal(serialized.includes('supabase_jwt_secreto_123'), false, 'El log nunca debe contener JWTs ni tokens');
    console.log(`✅ Verificación de Auditoría PASÓ: ${logs.length} eventos registrados con sanitización de secretos.`);
  }

  console.log('\n🎉 TODAS LAS 12 PRUEBAS OBLIGATORIAS PASARON EXITOSAMENTE.');
}

runAllTests().catch(err => {
  console.error('❌ Fallo en las pruebas MCP:', err);
  process.exit(1);
});

