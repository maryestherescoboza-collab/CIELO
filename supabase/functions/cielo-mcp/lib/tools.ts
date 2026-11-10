import type { AuthenticatedContext } from './types.ts';
import {
  MCPAuthorizationError,
  assertCursoAutorizado,
  getCursosAutorizados,
} from './auth.ts';
import { recordMCPAudit } from './audit.ts';

export const MCP_PROTOCOL_VERSION = '2024-11-05';

export const CIELO_TOOLS_DEFINITIONS = [
  {
    name: 'cielo_perfil',
    description:
      'Consulta la identidad, centro educativo y rol del docente autenticado en CIELO.',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'cielo_listar_cursos',
    description:
      'Lista los cursos, grados, secciones y asignaturas autorizados para el docente autenticado.',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'cielo_listar_estudiantes',
    description:
      'Consulta el listado de estudiantes de un curso asignado al docente. Soporta paginación y filtro de búsqueda por nombre o número.',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        curso_id: { type: 'integer', description: 'ID del curso en CIELO.' },
        busqueda: { type: 'string', description: 'Nombre, apellido o número de lista para filtrar.' },
        page: { type: 'integer', default: 1, description: 'Número de página.' },
        page_size: { type: 'integer', default: 50, maximum: 100, description: 'Cantidad por página.' },
      },
      required: ['curso_id'],
    },
  },
  {
    name: 'cielo_consultar_estudiante',
    description:
      'Consulta el expediente académico de un estudiante autorizado en un curso del docente.',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        estudiante_id: { type: 'integer', description: 'ID del estudiante.' },
        curso_id: { type: 'integer', description: 'ID del curso en el que está matriculado.' },
      },
      required: ['estudiante_id', 'curso_id'],
    },
  },
  {
    name: 'cielo_consultar_actividades',
    description:
      'Consulta las actividades evaluativas registradas en un curso, con filtro opcional por período o asignatura.',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        curso_id: { type: 'integer', description: 'ID del curso.' },
        periodo: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'], description: 'Período académico.' },
        asignatura: { type: 'string', description: 'Nombre de la asignatura.' },
      },
      required: ['curso_id'],
    },
  },
  {
    name: 'cielo_consultar_calificaciones',
    description:
      'Consulta las calificaciones registradas de una actividad o de un estudiante en un curso.',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        curso_id: { type: 'integer', description: 'ID del curso.' },
        actividad_id: { type: 'integer', description: 'ID de la actividad evaluativa (opcional).' },
        estudiante_id: { type: 'integer', description: 'ID del estudiante (opcional).' },
        periodo: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'], description: 'Período académico.' },
      },
      required: ['curso_id'],
    },
  },
  {
    name: 'cielo_crear_actividad',
    description:
      'Crea una nueva actividad pedagógica en CIELO asociada a competencias y producto/evidencia. REQUIERE CONFIRMACIÓN EXPLÍCITA (confirmado: true). Si confirmado no es true, devuelve la vista previa para que el usuario la autorice.',
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        curso_id: { type: 'integer', description: 'ID del curso.' },
        nombre: { type: 'string', description: 'Título o nombre de la actividad.' },
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD.' },
        periodo: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'], description: 'Período académico.' },
        asignatura: { type: 'string', description: 'Asignatura en la que se impartirá.' },
        bc_asignados: {
          type: 'array',
          items: { type: 'string', enum: ['BC1', 'BC2', 'BC3', 'BC4'] },
          description: 'Competencias fundamentales asociadas (BC1 Comunicativa, BC2 Pensamiento Lógico, BC3 Científica/Tecnológica, BC4 Ética y Ciudadana).',
        },
        indicador: { type: 'string', description: 'Indicador de logro curricular.' },
        producto: { type: 'string', description: 'Evidencia o producto esperado del estudiante.' },
        descripcion: { type: 'string', description: 'Instrucciones pedagógicas o desglose.' },
        confirmado: {
          type: 'boolean',
          default: false,
          description: 'Debe ser true una vez que el usuario apruebe explícitamente los datos.',
        },
      },
      required: ['curso_id', 'nombre', 'fecha', 'periodo', 'asignatura', 'bc_asignados'],
    },
  },
  {
    name: 'cielo_registrar_calificacion',
    description:
      'Registra o actualiza la calificación de un estudiante en una actividad. REQUIERE CONFIRMACIÓN EXPLÍCITA (confirmado: true).',
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        curso_id: { type: 'integer', description: 'ID del curso.' },
        actividad_id: { type: 'integer', description: 'ID de la actividad a evaluar.' },
        estudiante_id: { type: 'integer', description: 'ID del estudiante.' },
        puntaje: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Puntaje obtenido (escala 0 a 100 o valor correspondiente al instrumento).',
        },
        confirmado: {
          type: 'boolean',
          default: false,
          description: 'Debe ser true tras la confirmación explícita del docente.',
        },
      },
      required: ['curso_id', 'actividad_id', 'estudiante_id', 'puntaje'],
    },
  },
  {
    name: 'cielo_generar_reporte',
    description:
      'Genera el resumen de rendimiento académico oficial por curso, asignatura y competencias (BC1-BC4) según las fórmulas oficiales de CIELO.',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        curso_id: { type: 'integer', description: 'ID del curso.' },
        periodo: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'], description: 'Período opcional o cálculo acumulado.' },
        asignatura: { type: 'string', description: 'Asignatura específica.' },
        estudiante_id: { type: 'integer', description: 'ID opcional para reporte individual.' },
      },
      required: ['curso_id'],
    },
  },
];

export async function executeTool(
  toolName: string,
  args: any,
  auth: AuthenticatedContext,
  adminClient: any
): Promise<any> {
  switch (toolName) {
    case 'cielo_perfil': {
      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'TOOL_EXECUTION',
        toolName,
        parameters: args,
        status: 'SUCCESS',
      });
      return {
        usuario_id: auth.userId,
        nombre: auth.nombreDocente,
        email: auth.email,
        centro_id: auth.centroId,
        rol_global: auth.rolGlobal,
        es_admin_centro: auth.isCentroAdmin,
        plataforma: 'CIELO (evaluacielo.com)',
      };
    }

    case 'cielo_listar_cursos': {
      const cursos = await getCursosAutorizados(auth, adminClient);
      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'TOOL_EXECUTION',
        toolName,
        parameters: args,
        status: 'SUCCESS',
      });
      return {
        total_cursos: cursos.length,
        cursos: cursos.map(c => ({
          curso_id: c.id,
          nombre: c.nombre,
          grado: c.grado,
          seccion: c.seccion,
          periodo_activo: c.periodo,
          asignaturas: c.asignaturasAutorizadas,
          roles: c.rolesEnCurso,
        })),
      };
    }

    case 'cielo_listar_estudiantes': {
      const curso = await assertCursoAutorizado(args.curso_id, auth, adminClient);
      const page = Math.max(1, Number(args.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(args.page_size || 50)));
      const offset = (page - 1) * pageSize;

      let query = adminClient
        .from('estudiantes')
        .select('id, numero_lista, nombre, apellido, curso_id, en_riesgo, observacion, activo')
        .eq('curso_id', curso.id)
        .eq('activo', true)
        .order('numero_lista', { ascending: true, nullsFirst: false })
        .order('apellido', { ascending: true })
        .order('nombre', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (args.busqueda && typeof args.busqueda === 'string') {
        const busq = args.busqueda.trim();
        query = query.or(`nombre.ilike.%${busq}%,apellido.ilike.%${busq}%`);
      }

      const { data: estudiantes, error } = await query;
      if (error) throw new Error(`Error consultando estudiantes: ${error.message}`);

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'TOOL_EXECUTION',
        toolName,
        parameters: args,
        status: 'SUCCESS',
      });

      return {
        curso_id: curso.id,
        curso_nombre: curso.nombre,
        grado: curso.grado,
        seccion: curso.seccion,
        pagina: page,
        tamano_pagina: pageSize,
        estudiantes: (estudiantes || []).map((e: any) => ({
          id: e.id,
          numero_lista: e.numero_lista,
          nombre_completo: `${e.nombre} ${e.apellido}`.trim(),
          nombre: e.nombre,
          apellido: e.apellido,
          en_riesgo: Boolean(e.en_riesgo),
          observacion: e.observacion || null,
        })),
      };
    }

    case 'cielo_consultar_estudiante': {
      const curso = await assertCursoAutorizado(args.curso_id, auth, adminClient);
      const { data: est, error: estErr } = await adminClient
        .from('estudiantes')
        .select('*')
        .eq('id', args.estudiante_id)
        .eq('curso_id', curso.id)
        .single();

      if (estErr || !est) {
        throw new MCPAuthorizationError(
          `Estudiante con ID ${args.estudiante_id} no encontrado en el curso especificado.`,
          'NOT_FOUND',
          404
        );
      }

      // Consultar calificaciones del estudiante
      const { data: califs } = await adminClient
        .from('calificaciones')
        .select('id, actividad_id, puntaje, periodo, competencias, recuperacion, actividades(nombre, fecha, asignatura)')
        .eq('estudiante_id', est.id)
        .eq('curso_id', curso.id);

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'TOOL_EXECUTION',
        toolName,
        parameters: args,
        status: 'SUCCESS',
      });

      return {
        estudiante: {
          id: est.id,
          numero_lista: est.numero_lista,
          nombre_completo: `${est.nombre} ${est.apellido}`.trim(),
          nombre: est.nombre,
          apellido: est.apellido,
          curso: {
            id: curso.id,
            nombre: curso.nombre,
            grado: curso.grado,
            seccion: curso.seccion,
          },
          en_riesgo: Boolean(est.en_riesgo),
          puntaje_general: est.puntaje,
          resumen_bc: {
            bc1: est.bc1,
            bc2: est.bc2,
            bc3: est.bc3,
            bc4: est.bc4,
          },
          calificaciones_recientes: (califs || []).map((c: any) => ({
            calificacion_id: c.id,
            actividad_id: c.actividad_id,
            actividad_nombre: c.actividades?.nombre || 'Sin título',
            fecha: c.actividades?.fecha || null,
            asignatura: c.actividades?.asignatura || null,
            periodo: c.periodo,
            puntaje: c.puntaje,
            competencias: c.competencias,
          })),
        },
      };
    }

    case 'cielo_consultar_actividades': {
      const curso = await assertCursoAutorizado(args.curso_id, auth, adminClient);
      let query = adminClient
        .from('actividades')
        .select('id, nombre, fecha, periodo, asignatura, bc_asignados, indicador, producto, is_producto_final, requiere_producto, descripcion, user_id')
        .eq('curso_id', curso.id)
        .eq('activo', true)
        .order('fecha', { ascending: false });

      if (args.periodo) {
        query = query.eq('periodo', args.periodo);
      }
      if (args.asignatura) {
        query = query.ilike('asignatura', `%${args.asignatura}%`);
      }

      const { data: acts, error } = await query;
      if (error) throw new Error(`Error consultando actividades: ${error.message}`);

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'TOOL_EXECUTION',
        toolName,
        parameters: args,
        status: 'SUCCESS',
      });

      return {
        curso_id: curso.id,
        curso_nombre: curso.nombre,
        total_actividades: (acts || []).length,
        actividades: (acts || []).map((a: any) => ({
          id: a.id,
          nombre: a.nombre,
          fecha: a.fecha,
          periodo: a.periodo,
          asignatura: a.asignatura,
          competencias: a.bc_asignados,
          indicador: a.indicador,
          producto: a.producto,
          es_producto_final: Boolean(a.is_producto_final),
          descripcion: a.descripcion,
          creada_por_mi: a.user_id === auth.userId,
        })),
      };
    }

    case 'cielo_consultar_calificaciones': {
      const curso = await assertCursoAutorizado(args.curso_id, auth, adminClient);
      let query = adminClient
        .from('calificaciones')
        .select('id, estudiante_id, actividad_id, puntaje, periodo, competencias, recuperacion, asignatura, estudiantes(nombre, apellido, numero_lista), actividades(nombre, fecha)')
        .eq('curso_id', curso.id);

      if (args.actividad_id) query = query.eq('actividad_id', args.actividad_id);
      if (args.estudiante_id) query = query.eq('estudiante_id', args.estudiante_id);
      if (args.periodo) query = query.eq('periodo', args.periodo);

      const { data: califs, error } = await query.limit(200);
      if (error) throw new Error(`Error consultando calificaciones: ${error.message}`);

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'TOOL_EXECUTION',
        toolName,
        parameters: args,
        status: 'SUCCESS',
      });

      return {
        curso_id: curso.id,
        curso_nombre: curso.nombre,
        total_registros: (califs || []).length,
        calificaciones: (califs || []).map((c: any) => ({
          id: c.id,
          estudiante_id: c.estudiante_id,
          estudiante_nombre: c.estudiantes ? `${c.estudiantes.nombre} ${c.estudiantes.apellido}`.trim() : null,
          numero_lista: c.estudiantes?.numero_lista,
          actividad_id: c.actividad_id,
          actividad_nombre: c.actividades?.nombre,
          fecha: c.actividades?.fecha,
          periodo: c.periodo,
          asignatura: c.asignatura,
          puntaje: c.puntaje,
          competencias: c.competencias,
          recuperacion: c.recuperacion,
        })),
      };
    }

    case 'cielo_crear_actividad': {
      const curso = await assertCursoAutorizado(args.curso_id, auth, adminClient);

      // Política de confirmación obligatoria
      if (!args.confirmado) {
        return {
          requiere_confirmacion: true,
          mensaje:
            'Esta operación creará una nueva actividad evaluativa en la base de datos de CIELO. Por favor revisa la vista previa y solicita al docente su confirmación antes de proceder.',
          vista_previa: {
            curso_id: curso.id,
            curso_nombre: curso.nombre,
            grado_seccion: `${curso.grado} ${curso.seccion}`,
            nombre: args.nombre,
            fecha: args.fecha,
            periodo: args.periodo,
            asignatura: args.asignatura,
            bc_asignados: args.bc_asignados,
            indicador: args.indicador || null,
            producto: args.producto || null,
            descripcion: args.descripcion || null,
          },
          instruccion_chatgpt:
            'Presenta esta ficha al docente de forma clara. Si el docente responde afirmativamente ("Sí", "Procede", "Créala"), vuelve a invocar esta herramienta con los mismos datos y el parámetro adicional "confirmado": true.',
        };
      }

      // Validar fecha
      if (!/^\d{4}-\d{2}-\d{2}$/.test(args.fecha)) {
        throw new MCPAuthorizationError('Formato de fecha inválido. Utiliza YYYY-MM-DD.', 'INVALID_INPUT', 400);
      }

      // Validar competencias
      const bcsValidos = ['BC1', 'BC2', 'BC3', 'BC4'];
      const bcAsignados: string[] = Array.isArray(args.bc_asignados)
        ? args.bc_asignados.filter((b: string) => bcsValidos.includes(b))
        : [];

      if (bcAsignados.length === 0) {
        throw new MCPAuthorizationError(
          'Debes asignar al menos una competencia fundamental válida (BC1, BC2, BC3, BC4).',
          'INVALID_INPUT',
          400
        );
      }

      const actividadPayload = {
        user_id: auth.userId,
        curso_id: curso.id,
        nombre: args.nombre.trim(),
        fecha: args.fecha,
        periodo: args.periodo,
        asignatura: args.asignatura.trim(),
        bc_asignados: bcAsignados,
        indicador: args.indicador ? String(args.indicador).trim() : null,
        producto: args.producto ? String(args.producto).trim() : null,
        descripcion: args.descripcion ? String(args.descripcion).trim() : null,
        requiere_producto: Boolean(args.producto),
        shared_course_id: curso.sharedCourseId,
        activo: true,
      };

      const { data: actCreada, error: insertError } = await adminClient
        .from('actividades')
        .insert(actividadPayload)
        .select()
        .single();

      if (insertError || !actCreada) {
        recordMCPAudit({
          userId: auth.userId,
          centroId: auth.centroId,
          operation: 'CREAR_ACTIVIDAD',
          toolName,
          parameters: args,
          status: 'ERROR',
          details: insertError?.message,
        });
        throw new Error(`Error guardando actividad en Supabase: ${insertError?.message || 'Fallo desconocido'}`);
      }

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'CREAR_ACTIVIDAD',
        toolName,
        parameters: args,
        status: 'SUCCESS',
        details: `Actividad ${actCreada.id} creada exitosamente`,
      });

      return {
        exito: true,
        mensaje: `Actividad "${actCreada.nombre}" creada y persistida con éxito en CIELO.`,
        actividad: {
          id: actCreada.id,
          curso_id: actCreada.curso_id,
          nombre: actCreada.nombre,
          fecha: actCreada.fecha,
          periodo: actCreada.periodo,
          asignatura: actCreada.asignatura,
          competencias: actCreada.bc_asignados,
        },
      };
    }

    case 'cielo_registrar_calificacion': {
      const curso = await assertCursoAutorizado(args.curso_id, auth, adminClient);

      // Verificar que la actividad pertenece al curso
      const { data: act, error: actErr } = await adminClient
        .from('actividades')
        .select('id, nombre, periodo, asignatura, bc_asignados')
        .eq('id', args.actividad_id)
        .eq('curso_id', curso.id)
        .single();

      if (actErr || !act) {
        throw new MCPAuthorizationError(
          `La actividad con ID ${args.actividad_id} no pertenece al curso especificado.`,
          'INVALID_INPUT',
          400
        );
      }

      // Verificar que el estudiante pertenece al curso
      const { data: est, error: estErr } = await adminClient
        .from('estudiantes')
        .select('id, nombre, apellido, numero_lista')
        .eq('id', args.estudiante_id)
        .eq('curso_id', curso.id)
        .single();

      if (estErr || !est) {
        throw new MCPAuthorizationError(
          `El estudiante con ID ${args.estudiante_id} no está matriculado en este curso.`,
          'INVALID_INPUT',
          400
        );
      }

      // Política de confirmación obligatoria
      if (!args.confirmado) {
        return {
          requiere_confirmacion: true,
          mensaje:
            'Esta operación registrará o actualizará una calificación en CIELO. Por favor confirma los datos con el docente.',
          vista_previa: {
            curso: curso.nombre,
            estudiante: `${est.nombre} ${est.apellido} (N° ${est.numero_lista || 'S/N'})`,
            actividad: act.nombre,
            asignatura: act.asignatura,
            periodo: act.periodo,
            puntaje_a_registrar: Number(args.puntaje),
          },
          instruccion_chatgpt:
            'Pide confirmación al docente. Al recibir respuesta afirmativa, invoca esta herramienta de nuevo incluyendo "confirmado": true.',
        };
      }

      const numPuntaje = Number(args.puntaje);
      if (isNaN(numPuntaje) || numPuntaje < 0 || numPuntaje > 100) {
        throw new MCPAuthorizationError('El puntaje debe ser un número entre 0 y 100.', 'INVALID_INPUT', 400);
      }

      // Upsert seguro de calificación
      const califPayload = {
        user_id: auth.userId,
        estudiante_id: est.id,
        actividad_id: act.id,
        curso_id: curso.id,
        periodo: act.periodo,
        puntaje: numPuntaje,
        competencias: act.bc_asignados || [],
        asignatura: act.asignatura,
        shared_course_id: curso.sharedCourseId,
        activo: true,
      };

      const { data: califGuardada, error: saveErr } = await adminClient
        .from('calificaciones')
        .upsert(califPayload, { onConflict: 'estudiante_id,actividad_id' })
        .select()
        .single();

      if (saveErr) {
        throw new Error(`Error persistiendo calificación en base de datos: ${saveErr.message}`);
      }

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'REGISTRAR_CALIFICACION',
        toolName,
        parameters: args,
        status: 'SUCCESS',
        details: `Calificación registrada para estudiante ${est.id} en actividad ${act.id}`,
      });

      return {
        exito: true,
        mensaje: `Calificación de ${numPuntaje} pts registrada correctamente para ${est.nombre} ${est.apellido}.`,
        calificacion: {
          id: califGuardada.id,
          estudiante_id: est.id,
          actividad_id: act.id,
          puntaje: califGuardada.puntaje,
          periodo: califGuardada.periodo,
        },
      };
    }

    case 'cielo_generar_reporte': {
      const curso = await assertCursoAutorizado(args.curso_id, auth, adminClient);

      // Consultar estudiantes del curso
      const { data: ests } = await adminClient
        .from('estudiantes')
        .select('id, numero_lista, nombre, apellido, en_riesgo, puntaje, bc1, bc2, bc3, bc4')
        .eq('curso_id', curso.id)
        .eq('activo', true)
        .order('numero_lista', { ascending: true });

      // Consultar actividades
      let actQuery = adminClient
        .from('actividades')
        .select('id, nombre, periodo, asignatura, bc_asignados')
        .eq('curso_id', curso.id)
        .eq('activo', true);

      if (args.periodo) actQuery = actQuery.eq('periodo', args.periodo);
      if (args.asignatura) actQuery = actQuery.ilike('asignatura', `%${args.asignatura}%`);

      const { data: acts } = await actQuery;

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        operation: 'GENERAR_REPORTE',
        toolName,
        parameters: args,
        status: 'SUCCESS',
      });

      const listaEsts = ests || [];
      const totalEsts = listaEsts.length;
      const enRiesgoCount = listaEsts.filter((e: any) => e.en_riesgo).length;

      // Cálculo de promedios generales
      const puntajesValidos: number[] = listaEsts
        .map((e: any) => Number(e.puntaje))
        .filter((n: number) => !isNaN(n) && n > 0);
      const promedioGeneral =
        puntajesValidos.length > 0
          ? Math.round((puntajesValidos.reduce((a: number, b: number) => a + b, 0) / puntajesValidos.length) * 10) / 10
          : 0;

      return {
        tipo_reporte: 'Rendimiento por Competencias CIELO',
        curso: {
          id: curso.id,
          nombre: curso.nombre,
          grado: curso.grado,
          seccion: curso.seccion,
          periodo_filtro: args.periodo || 'Acumulado',
        },
        estadisticas: {
          total_estudiantes: totalEsts,
          estudiantes_en_riesgo: enRiesgoCount,
          total_actividades_evaluadas: (acts || []).length,
          promedio_curso: promedioGeneral,
        },
        estudiantes: listaEsts.slice(0, 50).map((e: any) => ({
          numero_lista: e.numero_lista,
          nombre_completo: `${e.nombre} ${e.apellido}`.trim(),
          en_riesgo: Boolean(e.en_riesgo),
          promedio: e.puntaje,
          competencias: {
            BC1_Comunicativa: e.bc1?.calificacion ?? null,
            BC2_Pensamiento_Critico: e.bc2?.calificacion ?? null,
            BC3_Cientifica_Tecnologica: e.bc3?.calificacion ?? null,
            BC4_Etica_Ciudadana: e.bc4?.calificacion ?? null,
          },
        })),
      };
    }

    default:
      throw new MCPAuthorizationError(`Herramienta no implementada: ${toolName}`, 'NOT_FOUND', 404);
  }
}

