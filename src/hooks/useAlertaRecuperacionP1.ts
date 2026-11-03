import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import type { Curso } from '../types';

export interface CursoRecuperacionInfo {
  cursoId: number;
  grado: string;
  seccion: string;
  asignatura: string;
  cursoLabel: string;
}

export function useAlertaRecuperacionP1() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAppStore((s) => s.session);
  const state = useAppStore((s) => s.state);

  const currentUserId = session?.user?.id;

  const [dbVerificado, setDbVerificado] = useState<boolean | null>(null);
  const [cursosDbP1, setCursosDbP1] = useState<{ curso_id: number; asignatura: string }[]>([]);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (!currentUserId) return false;
    try {
      return sessionStorage.getItem(`cielo_alerta_p1_dismissed_${currentUserId}`) === 'true';
    } catch {
      return false;
    }
  });

  // 1. Verificación en memoria en el estado de Zustand
  const tieneEnState = useMemo(() => {
    if (!currentUserId) return false;
    const califs = state.calificaciones || [];
    return califs.some((c: any) => {
      const esP1 = String(c.periodo || '').trim().toUpperCase() === 'P1';
      const tienePuntaje = c.puntaje !== null && c.puntaje !== undefined && c.puntaje !== '';
      const esDeUsuario = !c.userId || c.userId === currentUserId;
      const estaActivo = c.activo === undefined || c.activo === true || c.activo === null;
      return esP1 && tienePuntaje && esDeUsuario && estaActivo;
    });
  }, [currentUserId, state.calificaciones]);

  // 2. Consulta de respaldo única a Supabase (asegura detección incluso si no se ha cargado todo el curso)
  useEffect(() => {
    if (!currentUserId) {
      setDbVerificado(false);
      return;
    }

    let isMounted = true;

    async function checkEvaluacionesP1() {
      try {
        const { data, error } = await supabase
          .from('calificaciones')
          .select('id, curso_id, asignatura')
          .eq('user_id', currentUserId)
          .eq('periodo', 'P1')
          .not('puntaje', 'is', null)
          .or('activo.is.null,activo.eq.true')
          .limit(50);

        if (!isMounted) return;

        if (error) {
          console.warn('[AlertaRecuperacionP1] Consulta Supabase:', error.message);
          setDbVerificado(tieneEnState);
          return;
        }

        if (data && data.length > 0) {
          setDbVerificado(true);
          setCursosDbP1(data.map((d: any) => ({ curso_id: Number(d.curso_id), asignatura: d.asignatura || '' })));
        } else {
          setDbVerificado(tieneEnState);
        }
      } catch (err) {
        if (isMounted) {
          setDbVerificado(tieneEnState);
        }
      }
    }

    checkEvaluacionesP1();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, tieneEnState]);

  // Usuario califica si tiene en estado o verificado por DB
  const usuarioCalifica = Boolean(tieneEnState || dbVerificado);

  // Lista de cursos y asignaturas del usuario con evaluaciones en P1
  const cursosConP1 = useMemo<CursoRecuperacionInfo[]>(() => {
    if (!usuarioCalifica) return [];

    const map = new Map<string, CursoRecuperacionInfo>();
    const cursosList: Curso[] = state.cursos || [];

    // Priorizar combinaciones de la DB
    cursosDbP1.forEach((item) => {
      const c = cursosList.find((cur) => cur.id === item.curso_id);
      if (c) {
        const asig = (item.asignatura || c.asignatura || c.nombre || 'General').trim();
        const key = `${c.id}|${asig.toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, {
            cursoId: c.id,
            grado: c.grado || '',
            seccion: c.seccion || '',
            asignatura: asig,
            cursoLabel: `${c.grado || ''} "${c.seccion || ''}"`.trim() || c.nombre
          });
        }
      }
    });

    // Añadir del estado si aún faltan
    (state.calificaciones || []).forEach((c: any) => {
      if (
        String(c.periodo || '').trim().toUpperCase() === 'P1' &&
        c.puntaje !== null &&
        c.puntaje !== undefined &&
        (!c.userId || c.userId === currentUserId)
      ) {
        const cur = cursosList.find((cu) => cu.id === c.cursoId);
        if (cur) {
          const asig = (c.asignatura || cur.asignatura || cur.nombre || 'General').trim();
          const key = `${cur.id}|${asig.toLowerCase()}`;
          if (!map.has(key)) {
            map.set(key, {
              cursoId: cur.id,
              grado: cur.grado || '',
              seccion: cur.seccion || '',
              asignatura: asig,
              cursoLabel: `${cur.grado || ''} "${cur.seccion || ''}"`.trim() || cur.nombre
            });
          }
        }
      }
    });

    // Si calificó pero la lista detallada de cursos no coincidió, incluir los cursos activos del docente
    if (map.size === 0 && cursosList.length > 0) {
      cursosList.forEach((c) => {
        const asig = (c.asignatura || c.nombre || 'General').trim();
        const key = `${c.id}|${asig.toLowerCase()}`;
        map.set(key, {
          cursoId: c.id,
          grado: c.grado || '',
          seccion: c.seccion || '',
          asignatura: asig,
          cursoLabel: `${c.grado || ''} "${c.seccion || ''}"`.trim() || c.nombre
        });
      });
    }

    return Array.from(map.values());
  }, [usuarioCalifica, cursosDbP1, state.cursos, state.calificaciones, currentUserId]);

  // Si ya estamos viendo los planes de recuperación en /planificacion, ocultamos el banner global para evitar redundancia
  const estaEnVistaRecuperacion =
    location.pathname === '/planificacion' &&
    location.search.includes('seccion=recuperacion');

  const visible = Boolean(usuarioCalifica && !dismissed && !estaEnVistaRecuperacion);

  const dismiss = useCallback(() => {
    setDismissed(true);
    if (currentUserId) {
      try {
        sessionStorage.setItem(`cielo_alerta_p1_dismissed_${currentUserId}`, 'true');
      } catch {
        // ignore
      }
    }
  }, [currentUserId]);

  const irAPlanRecuperacion = useCallback((cursoId?: number) => {
    const targetCursoId = cursoId || cursosConP1[0]?.cursoId;
    const url = targetCursoId
      ? `/planificacion?seccion=recuperacion&periodo=P1&cursoId=${targetCursoId}`
      : `/planificacion?seccion=recuperacion&periodo=P1`;
    navigate(url);
  }, [cursosConP1, navigate]);

  return {
    visible,
    usuarioCalifica,
    cursosConP1,
    dismiss,
    irAPlanRecuperacion
  };
}

