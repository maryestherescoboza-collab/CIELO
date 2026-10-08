import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { getAsignaturaNombre } from '../constants/asignaturas';
import type { CombinacionCurricular } from '../types/especificaciones';

/**
 * Combina `curso_docentes` (relación real del usuario) con `cursos` (grado/sección)
 * para obtener las combinaciones curso + asignatura que corresponden al usuario.
 * No crea cursos ni asignaturas nuevas ni usa una lógica paralela de permisos.
 */
export function useCombinacionesCurriculares(): CombinacionCurricular[] {
  const session = useAppStore((s) => s.session);
  const cursos = useAppStore((s) => s.state.cursos);
  const cursoDocentes = useAppStore((s) => s.state.cursoDocentes);
  const userId = session?.user?.id;

  return useMemo(() => {
    if (!userId) return [];

    const cursosMap = new Map(cursos.map((c) => [c.id, c]));
    const mapa = new Map<string, CombinacionCurricular>();

    for (const cd of cursoDocentes) {
      if (cd.userId !== userId || !cd.asignatura) continue;
      const curso = cursosMap.get(cd.cursoId);
      if (!curso) continue;
      const key = `${curso.id}|${cd.asignatura}`;
      if (mapa.has(key)) continue;
      mapa.set(key, {
        key,
        cursoId: curso.id,
        cursoDocenteId: cd.id ?? null,
        grado: curso.grado,
        seccion: curso.seccion,
        cursoNombre: curso.nombre || `${curso.grado} ${curso.seccion}`,
        asignatura: cd.asignatura,
        asignaturaNombre: getAsignaturaNombre(cd.asignatura),
      });
    }

    // Cursos propios legados sin vínculo registrado en curso_docentes.
    for (const curso of cursos) {
      if (!curso.asignatura || String(curso.userId || '') !== userId) continue;
      const key = `${curso.id}|${curso.asignatura}`;
      if (mapa.has(key)) continue;
      mapa.set(key, {
        key,
        cursoId: curso.id,
        cursoDocenteId: null,
        grado: curso.grado,
        seccion: curso.seccion,
        cursoNombre: curso.nombre || `${curso.grado} ${curso.seccion}`,
        asignatura: curso.asignatura,
        asignaturaNombre: getAsignaturaNombre(curso.asignatura),
      });
    }

    return Array.from(mapa.values()).sort(
      (a, b) =>
        a.grado.localeCompare(b.grado, 'es', { numeric: true }) ||
        a.seccion.localeCompare(b.seccion, 'es') ||
        a.asignaturaNombre.localeCompare(b.asignaturaNombre, 'es')
    );
  }, [userId, cursos, cursoDocentes]);
}
