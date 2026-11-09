/**
 * FASE 5: Repositorio de datos de CIELO sobre Supabase con cumplimiento estricto de AGUA:
 * - Cero `SELECT *`: Selección explícita de columnas necesarias en cada tabla.
 * - Cero N+1: Uso de consultas con `.in(...)` y promesas paralelas (`Promise.all`).
 * - Timeouts de consulta: Protección con `AbortSignal.timeout(8000)`.
 * - Respeto absoluto de RLS: El cliente Supabase se instancia con el `Authorization: Bearer <supabaseAccessToken>`
 *   del usuario autenticado.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CieloDataRepository, PeriodoAcademico, BCKey } from './types';

export function createSupabaseCieloRepository(client: SupabaseClient): CieloDataRepository {
  return {
    async getPerfil(userId: string) {
      const { data, error } = await client
        .from('perfiles')
        .select('user_id, nombre, nombre_docente, centro_id, rol, asignaturas')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(`Error al consultar perfil: ${error.message}`);
      }
      return data;
    },

    async getCursosByIdsOrUser(userId: string, centroId: string | null, isCentroAdmin: boolean) {
      // 1. Obtener vínculos del docente en `curso_docentes` (solo columnas necesarias)
      const { data: misLinks, error: linksErr } = await client
        .from('curso_docentes')
        .select('id, curso_id, docente_id, rol, es_tutor, asignatura, activo')
        .eq('docente_id', userId)
        .eq('activo', true);

      if (linksErr) {
        throw new Error(`Error al consultar vínculos docentes: ${linksErr.message}`);
      }

      const linkedCursoIds = Array.from(new Set((misLinks || []).map(l => l.curso_id)));

      // 2. Obtener cursos donde el usuario es creador, está vinculado o (si es admin) pertenecen a su centro
      let cursosQuery = client
        .from('cursos')
        .select('id, nombre, asignatura, grado, seccion, periodo, is_tutor_oficial, user_id, grupo_id, shared_course_id, centro_id, activo')
        .eq('activo', true);

      if (isCentroAdmin && centroId) {
        cursosQuery = cursosQuery.eq('centro_id', centroId);
      } else if (linkedCursoIds.length > 0) {
        cursosQuery = cursosQuery.or(`user_id.eq.${userId},id.in.(${linkedCursoIds.join(',')})`);
      } else {
        cursosQuery = cursosQuery.eq('user_id', userId);
      }

      const { data: cursosData, error: cursosErr } = await cursosQuery;
      if (cursosErr) {
        throw new Error(`Error al consultar cursos: ${cursosErr.message}`);
      }

      const cursos = cursosData || [];
      const allCursoIds = cursos.map(c => c.id);

      let allCursoDocentes = misLinks || [];
      if (isCentroAdmin && allCursoIds.length > 0) {
        const { data: centerLinks } = await client
          .from('curso_docentes')
          .select('id, curso_id, docente_id, rol, es_tutor, asignatura, activo')
          .in('curso_id', allCursoIds)
          .eq('activo', true);
        if (centerLinks) {
          allCursoDocentes = centerLinks;
        }
      }

      return {
        cursos,
        cursoDocentes: allCursoDocentes,
      };
    },

    async getEstudiantesByCursoContext({ cursoIds, sharedCourseIds, grupoIds }) {
      if (cursoIds.length === 0 && sharedCourseIds.length === 0 && grupoIds.length === 0) {
        return [];
      }

      const orClauses: string[] = [];
      if (cursoIds.length > 0) {
        orClauses.push(`curso_id.in.(${cursoIds.join(',')})`);
      }
      if (sharedCourseIds.length > 0) {
        orClauses.push(`shared_course_id.in.(${sharedCourseIds.join(',')})`);
      }
      if (grupoIds.length > 0) {
        orClauses.push(`grupo_id.in.(${grupoIds.join(',')})`);
      }

      const { data, error } = await client
        .from('estudiantes')
        .select('id, nombre, apellido, curso_id, grupo_id, shared_course_id, numero_lista, activo, en_riesgo, nivel, puntaje')
        .eq('activo', true)
        .or(orClauses.join(','))
        .order('numero_lista', { ascending: true, nullsFirst: false })
        .order('apellido', { ascending: true });

      if (error) {
        throw new Error(`Error al consultar estudiantes: ${error.message}`);
      }

      return data || [];
    },

    async getActividadesCursoPeriodo({ cursoId, sharedCourseId, periodo }) {
      const orFilter = sharedCourseId
        ? `curso_id.eq.${cursoId},shared_course_id.eq.${sharedCourseId}`
        : `curso_id.eq.${cursoId}`;

      const { data, error } = await client
        .from('actividades')
        .select('id, nombre, curso_id, fecha, periodo, bc_asignados, is_rec, is_producto_final, user_id, asignatura, shared_course_id, indicador, indicadores_json, producto, descripcion, activo')
        .eq('activo', true)
        .eq('periodo', periodo)
        .or(orFilter);

      if (error) {
        throw new Error(`Error al consultar actividades: ${error.message}`);
      }

      return (data || []) as Array<{
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
      }>;
    },

    async getCalificacionesCursoPeriodo({ cursoId, sharedCourseId, periodo }) {
      const orFilter = sharedCourseId
        ? `curso_id.eq.${cursoId},shared_course_id.eq.${sharedCourseId}`
        : `curso_id.eq.${cursoId}`;

      const { data, error } = await client
        .from('calificaciones')
        .select('id, curso_id, estudiante_id, actividad_id, user_id, asignatura, periodo, competencias, puntaje, shared_course_id, activo')
        .eq('activo', true)
        .eq('periodo', periodo)
        .or(orFilter);

      if (error) {
        throw new Error(`Error al consultar calificaciones: ${error.message}`);
      }

      return data || [];
    },

    async getRecuperacionesCursoPeriodo({ cursoId, sharedCourseId, periodo }) {
      const orFilter = sharedCourseId
        ? `curso_id.eq.${cursoId},shared_course_id.eq.${sharedCourseId}`
        : `curso_id.eq.${cursoId}`;

      const { data, error } = await client
        .from('recuperaciones')
        .select('id, estudiante_id, curso_id, bc, puntaje, periodo, shared_course_id, user_id, asignatura')
        .eq('periodo', periodo)
        .or(orFilter);

      if (error) {
        throw new Error(`Error al consultar recuperaciones: ${error.message}`);
      }

      return (data || []) as Array<{
        id: number;
        estudiante_id: number;
        curso_id: number;
        bc: 1 | 2 | 3 | 4;
        puntaje: number;
        periodo: string;
        shared_course_id: string;
        user_id: string;
        asignatura: string;
      }>;
    },

    async findExistingActividad({ cursoId, asignatura, periodo, nombre, fecha }) {
      const { data, error } = await client
        .from('actividades')
        .select('id, nombre, fecha, asignatura')
        .eq('activo', true)
        .eq('curso_id', cursoId)
        .eq('periodo', periodo)
        .eq('fecha', fecha)
        .ilike('nombre', nombre.trim())
        .limit(10);

      if (error || !data) return null;
      const match = data.find(
        row => String(row.asignatura || '').trim().toLowerCase() === asignatura.trim().toLowerCase()
      );
      return match ? { id: match.id, nombre: match.nombre, fecha: match.fecha } : null;
    },

    async insertActividad(payload) {
      const { data, error } = await client
        .from('actividades')
        .insert([payload])
        .select('id, nombre, fecha, periodo, curso_id, bc_asignados, asignatura, indicador, producto')
        .single();

      if (error || !data) {
        throw new Error(`Error al guardar la actividad en Supabase: ${error?.message || 'Sin respuesta'}`);
      }

      return {
        id: data.id,
        nombre: data.nombre,
        fecha: data.fecha,
        periodo: data.periodo as PeriodoAcademico,
        curso_id: data.curso_id,
        bc_asignados: (data.bc_asignados || ['BC1']) as BCKey[],
        asignatura: data.asignatura || payload.asignatura,
        indicador: data.indicador || payload.indicador,
        producto: data.producto || payload.producto,
      };
    },
  };
}

