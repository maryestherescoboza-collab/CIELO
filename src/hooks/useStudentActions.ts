import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Estudiante as EstudianteType } from '../types';

const mapearEstudiante = (d: any): EstudianteType => ({
    id: d.id,
    nombre: d.nombre,
    apellido: d.apellido,
    cursoId: d.curso_id,
    grupoId: d.grupo_id,
    sharedCourseId: d.shared_course_id,
    avatarColor: d.avatar_color,
    actividadesRecientes: d.actividades_recientes,
    enRiesgo: d.en_riesgo,
    numeroLista: d.numero_lista,
    nivel: d.nivel,
    puntaje: d.puntaje,
    bc1: d.bc1,
    bc2: d.bc2,
    bc3: d.bc3,
    bc4: d.bc4,
    userId: d.docente_id,
    observacion: d.observacion
});

export function useStudentActions() {
    const state = useAppStore(s => s.state);
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);
    const setGenericToast = useAppStore(s => s.setGenericToast);

    const handleAddEstudiante = useCallback(async (cursoId: number, nombre: string, apellido: string, numeroLista?: number) => {
        if (!session?.user?.id) return null;
        const colors = ['#059669', '#10b981', '#34d399', '#0f172a', '#334155', '#475569', '#64748b'];
        
        const cId = Number(cursoId);
        const currentCurso = state.cursos.find(c => c.id === cId);
        
        if (!currentCurso) {
            setGenericToast({ message: 'Error: Curso no encontrado', type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return null;
        }

        if (!currentCurso.grupoId) {
            setGenericToast({ 
                message: 'Error: El curso no tiene un grupo asignado.', 
                type: 'error' 
            });
            setTimeout(() => setGenericToast(null), 3000);
            return null;
        }

        // PASO 1 (posición explícita): resolver curso_id + numero_lista ANTES de
        // insertar. La fuente de verdad es la base: si la posición ya está ocupada
        // por un registro legacy inactivo (activo=false con numero_lista=puesto),
        // se REACTIVA el MISMO id (conservando historia, FKs y numero_lista) — así
        // no se dispara el duplicate key ni el límite de la base (que solo actúa
        // sobre INSERT). Si hay un estudiante activo, se actualiza nombre/apellido.
        if (typeof numeroLista === 'number') {
            const { data: existente, error: errRead } = await supabase
                .from('estudiantes')
                .select('*')
                .eq('curso_id', cId)
                .eq('numero_lista', numeroLista)
                .maybeSingle();

            if (errRead) {
                console.error('Error buscando posición del estudiante:', errRead);
                setGenericToast({ message: `No se pudo registrar: ${errRead.message}`, type: 'error' });
                setTimeout(() => setGenericToast(null), 3000);
                return null;
            }

            if (existente) {
                const esActivo = existente.activo !== false;
                const { data: upd, error: errUpd } = await supabase
                    .from('estudiantes')
                    .update(esActivo
                        ? { nombre, apellido }
                        : { activo: true, nombre, apellido })
                    .eq('id', existente.id)
                    .select()
                    .maybeSingle();

                if (errUpd) {
                    console.error('Error actualizando/reactivando estudiante:', errUpd);
                    setGenericToast({ message: `No se pudo registrar: ${errUpd.message}`, type: 'error' });
                    setTimeout(() => setGenericToast(null), 3000);
                    return null;
                }

                if (upd) {
                    const mapped = mapearEstudiante(upd);
                    setState(s => {
                        const yaExiste = s.estudiantes.some(e => e.id === mapped.id);
                        return {
                            ...s,
                            estudiantes: yaExiste
                                ? s.estudiantes.map(e => e.id === mapped.id ? mapped : e)
                                : [...s.estudiantes, mapped]
                        };
                    });
                    return mapped;
                }
                return null;
            }
        }

        // PASO 2: el límite de 40 SOLO aplica a la creación de un estudiante
        // completamente NUEVO. Cuenta únicamente estudiantes ACTIVOS reales del
        // curso; nunca placeholders, posiciones vacías, filas visuales ni
        // registros inactivos (el estado solo contiene activos).
        const currentCursoEsts = state.estudiantes.filter(e => Number(e.cursoId) === cId);
        if (currentCursoEsts.length >= 40) {
            setGenericToast({ 
                message: 'Límite alcanzado: El curso ya tiene 40 estudiantes.', 
                type: 'warning' 
            });
            setTimeout(() => setGenericToast(null), 3000);
            return null;
        }

        const nextId = Math.max(0, ...state.estudiantes.map(x => (typeof x.id === 'number' ? x.id : 0))) + 1;

        const newEstDB = {
            nombre, 
            apellido, 
            avatar_color: colors[nextId % colors.length], 
            curso_id: cId,
            grupo_id: currentCurso.grupoId,
            docente_id: session.user.id,
            // Si se indica una posición (numero_lista) se respeta tal cual; si no,
            // el trigger DB asigna MAX+1 (aplicación normal de "Agregar estudiante").
            numero_lista: numeroLista ?? undefined,
            nivel: 1, 
            puntaje: 0,
            bc1: { nivel: 1, puntaje: 0 }, 
            bc2: { nivel: 1, puntaje: 0 },
            bc3: { nivel: 1, puntaje: 0 }, 
            bc4: { nivel: 1, puntaje: 0 },
            actividades_recientes: 0, 
            en_riesgo: false,
            shared_course_id: currentCurso.sharedCourseId || `group_${currentCurso.grupoId}`
        };

        const { data, error } = await supabase.from('estudiantes').insert([newEstDB]).select();
        
        if (error) { 
            console.error('Error adding estudiante:', error); 
            setGenericToast({ message: `No se pudo registrar: ${error.message}`, type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return null; 
        }

        if (data && data[0]) {
            const d = data[0];
            const mapped = mapearEstudiante(d);
            setState(s => ({ ...s, estudiantes: [...s.estudiantes, mapped] }));
            return mapped;
        }
        return null;
    }, [session, state.cursos, state.estudiantes, setState, setGenericToast]);

    const handleUpdateEstudiante = useCallback(async (
        estOrId: EstudianteType | number,
        maybePartial?: Partial<EstudianteType>
    ) => {
        if (!session?.user?.id) return;

        const id: number = typeof estOrId === 'object' && estOrId !== null ? estOrId.id : estOrId;
        const updateData = (typeof estOrId === 'object' && estOrId !== null) ? estOrId : (maybePartial || {});

        // Un ID <= 0 es un placeholder visual (isPlaceholder). Jamás debe llegar
        // a una operación Supabase de UPDATE/insert: se ignora en silencio.
        if (!(id > 0)) return;

        const existing = state.estudiantes.find(e => e.id === id);
        const merged = { ...existing, ...updateData, id } as EstudianteType;

        setState(s => ({ ...s, estudiantes: s.estudiantes.map(est => est.id === merged.id ? merged : est) }));

        const { error } = await supabase.from('estudiantes').upsert({
            id: merged.id,
            nombre: merged.nombre,
            apellido: merged.apellido,
            avatar_color: merged.avatarColor,
            curso_id: merged.cursoId,
            grupo_id: merged.grupoId,
            docente_id: session.user.id,
            nivel: merged.nivel,
            puntaje: merged.puntaje,
            bc1: merged.bc1,
            bc2: merged.bc2,
            bc3: merged.bc3,
            bc4: merged.bc4,
            actividades_recientes: merged.actividadesRecientes,
            en_riesgo: merged.enRiesgo,
            shared_course_id: merged.sharedCourseId || `group_${merged.grupoId}`,
            numero_lista: merged.numeroLista,
            observacion: merged.observacion
        });

        if (error) {
            setGenericToast({ message: 'Error al guardar cambios del estudiante', type: 'warning' });
            setTimeout(() => setGenericToast(null), 3000);
        }
    }, [session, state.estudiantes, setState, setGenericToast]);

    const handleDeleteEstudiante = useCallback(async (id: number) => {
        // Un ID <= 0 es un placeholder visual: no hay registro que desactivar.
        if (!(id > 0)) return;

        // Logical deactivation instead of physical delete: se conserva el registro
        // histórico (calificaciones, actividades, incidencias, relaciones leídas
        // por estudiantes.id), se libera la posición: activo=false Y numero_lista
        // = NULL. NULL es inmune a la unique (curso_id, numero_lista), así la
        // posición puede reutilizarse para un estudiante real nuevo sin romper la
        // constraint ni el MAX del trigger (éste considera solo activos).
        const { error } = await supabase.from('estudiantes').update({ activo: false, numero_lista: null }).eq('id', id);
        if (!error) {
            setState(s => ({ ...s, estudiantes: s.estudiantes.filter(e => e.id !== id) }));
        }
    }, [setState]);

    return {
        addEstudiante: handleAddEstudiante,
        updateEstudiante: handleUpdateEstudiante,
        deleteEstudiante: handleDeleteEstudiante
    };
}
