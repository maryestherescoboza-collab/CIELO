import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '../lib/supabase';
import { NewActivityModal } from '../components/dashboard/NewActivityModal';
import { AttendanceWizardModal } from '../components/dashboard/AttendanceWizardModal';
import { AttendanceReportModal } from '../components/dashboard/AttendanceReportModal';
import { ModalHorarioClase } from '../components/dashboard/ModalHorarioClase';
import type { Actividad, EventoCalendario } from '../types';
import { usePlanClasesStore } from '../store/planClasesStore';
import { cdImparteEnDia, diaDeSemana, normalizarAsignatura, normalizarDia, normalizarHora } from '../utils/diasSemana';

const getMinerdEventsForDate = (dateIso: string, events: EventoCalendario[]) => {
    return events.filter(e => {
        if (e.fechaInicio && e.fechaFin) {
            return dateIso >= e.fechaInicio && dateIso <= e.fechaFin;
        }
        return e.fecha === dateIso || e.fechaInicio === dateIso;
    });
};

const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
/** La semana docente es de lunes a viernes: 5 columnas. */
const DIAS_SEMANA_SEMANA = 5;
const dayNamesSemana = dayNames.slice(0, DIAS_SEMANA_SEMANA);

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function weekStart(d: Date) { const x = new Date(d); const day = x.getDay() || 7; x.setDate(x.getDate() - day + 1); return x; }

/**
 * Interpreta 'YYYY-MM-DD' como FECHA LOCAL del calendario.
 *
 * `new Date('2026-03-01')` se interpreta como medianoche **UTC** (spec ES), y
 * luego `getDate()`/`getMonth()` leen la zona **local**: en cualquier huso con
 * offset negativo devuelve el día anterior. Construir la fecha con los
 * componentes numéricos la mantiene local y correcta en todos los husos.
 */
const dateLocalDesdeIso = (isoStr: string): Date => {
    const [a, m, d] = String(isoStr).split('-').map(Number);
    return new Date(a || 1970, (m || 1) - 1, d || 1);
};

const toMinutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
const minutesToTime = (min: number) => { const h = Math.floor(min / 60); const m = min % 60; return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); };
/** Granularidad de ajuste ya usada por la grilla: 30 minutos. */
const STEP_MIN = 30;
const snapMin = (min: number) => Math.round(min / STEP_MIN) * STEP_MIN;

/* ------------------------------------------------------------------ *
 * MODELO DERIVADO DE LA VISTA SEMANAL
 *
 * día → horario → curso_docente (el curso es el contenedor visual)
 *            └── actividades / fichas  (contenido interno)
 *
 * Se construye UNA sola vez por semana, antes de renderizar. Cada
 * actividad/ficha se ubica en exactamente un lugar: dentro del bloque de
 * su curso_docente, o en "Todo el día" si ese día no puede ubicarse.
 * ------------------------------------------------------------------ */

type ItemCalendario = any;

/** Bloque = una clase de un curso_docente en un día y hora concretos. */
interface BloqueClaseSemanal {
    key: string;
    cdId: number;
    dateIso: string;
    dia: string;
    inicio: string;
    fin: string;
    cursoId: number;
    asignatura: string;
    actividades: ItemCalendario[];
    fichas: ItemCalendario[];
}

/** curso_docente que visita el día pero aún no tiene horario para él. */
interface CursoSinHorarioSemanal {
    cdId: number;
    cursoId: number;
    asignatura: string;
    actividades: ItemCalendario[];
    fichas: ItemCalendario[];
}

interface DiaSemanalModelo {
    dateIso: string;
    dia: string;
    bloques: BloqueClaseSemanal[];
    sinHorario: CursoSinHorarioSemanal[];
    sueltos: ItemCalendario[];
    minerd: EventoCalendario[];
}

const esFicha = (item: ItemCalendario) => item?.tipo_calendario === 'clase';

const construirModeloSemana = (
    start: Date,
    cursoDocentes: any[],
    actividades: ItemCalendario[],
    minerd: EventoCalendario[]
): DiaSemanalModelo[] => {
    const cds = (cursoDocentes || []).filter(cd => cd && cd.cursoId != null);

    // Identidad real del curso_docente (curso_id + asignatura) para resolver
    // a qué bloque pertenece cada actividad/ficha sin mezclar asignaturas.
    const cdPorCursoAsignatura = new Map<string, any>();
    const cdsPorCurso = new Map<number, any[]>();
    for (const cd of cds) {
        cdPorCursoAsignatura.set(`${cd.cursoId}|${normalizarAsignatura(cd.asignatura)}`, cd);
        const lista = cdsPorCurso.get(cd.cursoId) || [];
        lista.push(cd);
        cdsPorCurso.set(cd.cursoId, lista);
    }

    const resolverCursoDocente = (item: ItemCalendario) => {
        const cursoId = item?.cursoId ?? item?.curso_id;
        if (cursoId == null) return null;
        const exacto = cdPorCursoAsignatura.get(`${cursoId}|${normalizarAsignatura(item?.asignatura)}`);
        if (exacto) return exacto;
        // Sin asignatura en la actividad: solo es inequívoco si el docente
        // tiene un único vínculo con ese curso.
        const candidatos = cdsPorCurso.get(cursoId) || [];
        return candidatos.length === 1 ? candidatos[0] : null;
    };

    const porFecha = new Map<string, ItemCalendario[]>();
    for (const a of actividades || []) {
        if (!a?.fecha) continue;
        const lista = porFecha.get(a.fecha) || [];
        lista.push(a);
        porFecha.set(a.fecha, lista);
    }

    const dias: DiaSemanalModelo[] = [];

    for (let d = 0; d < DIAS_SEMANA_SEMANA; d++) {
        const date = addDays(start, d);
        const dateIso = iso(date);
        const dia = diaDeSemana(date);

        // 1) DÍA → curso_docente: sólo los que dias_semana permite.
        const cdsDelDia = cds.filter(cd => cdImparteEnDia(cd, dia));

        // 2) HORARIO → curso_docente: cada entrada de `horarios` genera un
        //    bloque únicamente en SU propio día.
        const bloquesMap = new Map<string, BloqueClaseSemanal>();
        const bloquePorCd = new Map<number, BloqueClaseSemanal>();
        for (const cd of cdsDelDia) {
            const horarios = Array.isArray(cd.horarios) ? cd.horarios : [];
            for (const h of horarios) {
                if (normalizarDia(h?.dia) !== dia) continue;
                const inicio = normalizarHora(h?.inicio);
                const fin = normalizarHora(h?.fin);
                if (!inicio || !fin) continue;
                const key = `${dateIso}|${inicio}|${cd.id}`;
                if (!bloquesMap.has(key)) {
                    const bloque: BloqueClaseSemanal = {
                        key, cdId: cd.id, dateIso, dia, inicio, fin,
                        cursoId: cd.cursoId, asignatura: cd.asignatura || '',
                        actividades: [], fichas: [],
                    };
                    bloquesMap.set(key, bloque);
                    if (!bloquePorCd.has(cd.id)) bloquePorCd.set(cd.id, bloque);
                }
            }
        }

        // 3) Cursos que visitan el día pero no tienen horario para él.
        const sinHorario: CursoSinHorarioSemanal[] = cdsDelDia
            .filter(cd => !bloquePorCd.has(cd.id))
            .map(cd => ({ cdId: cd.id, cursoId: cd.cursoId, asignatura: cd.asignatura || '', actividades: [], fichas: [] }));
        const sinHorarioPorCd = new Map(sinHorario.map(s => [s.cdId, s]));

        // 4) Contenido: cada actividad/ficha entra en UN solo lugar.
        const sueltos: ItemCalendario[] = [];
        for (const item of porFecha.get(dateIso) || []) {
            const cd = resolverCursoDocente(item);
            const bloque = cd ? bloquePorCd.get(cd.id) : undefined;
            if (bloque) {
                (esFicha(item) ? bloque.fichas : bloque.actividades).push(item);
                continue;
            }
            const sinH = cd ? sinHorarioPorCd.get(cd.id) : undefined;
            if (sinH) {
                (esFicha(item) ? sinH.fichas : sinH.actividades).push(item);
                continue;
            }
            // Sin curso_docente resoluble, o su día no tiene horario: Todo el día.
            sueltos.push(item);
        }

        dias.push({
            dateIso,
            dia,
            bloques: [...bloquesMap.values()].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.cdId - b.cdId),
            sinHorario,
            sueltos,
            minerd: getMinerdEventsForDate(dateIso, minerd),
        });
    }

    return dias;
};

export const getCourseColor = (cursoId: number | null | undefined, cursos: any[]) => {
    if (!cursoId) return { bg: 'bg-[#f0f4f8]', border: 'border-black/5', text: 'text-[#2b405c]', dot: 'bg-[#537bac]' };

    const curso = cursos.find((c: any) => c.id === cursoId);
    const targetId = curso?.grupoId ?? cursoId; 

    const palettes = [
        { bg: 'bg-[#e0e9f4]', border: 'border-[#b8cde4]', text: 'text-[#2b405c]', dot: 'bg-[#537bac]' }, // Blue
        { bg: 'bg-[#e2ebdc]', border: 'border-[#c1d9b3]', text: 'text-[#263128]', dot: 'bg-[#689c63]' }, // Green
        { bg: 'bg-[#fbe6d8]', border: 'border-[#f2c7a7]', text: 'text-[#5c3a21]', dot: 'bg-[#d97c36]' }, // Orange
        { bg: 'bg-[#f0e6f5]', border: 'border-[#d4c3db]', text: 'text-[#3d2b4a]', dot: 'bg-[#7a598c]' }, // Purple
        { bg: 'bg-[#f7edcf]', border: 'border-[#e8d59c]', text: 'text-[#5c5017]', dot: 'bg-[#a38c26]' }, // Yellow
        { bg: 'bg-[#f7dfdb]', border: 'border-[#e8b5ac]', text: 'text-[#5c2b2b]', dot: 'bg-[#b85c5c]' }, // Red
        { bg: 'bg-[#e0f4f0]', border: 'border-[#b3e0d8]', text: 'text-[#1a4a42]', dot: 'bg-[#3b8c7c]' }, // Teal
    ];
    
    return palettes[targetId % palettes.length];
};

interface DraggedItem {
    id: number | string;
    type: 'actividad' | 'ficha' | 'horario';
    /** Identidad real del bloque de clase: curso_docente + día + hora de inicio. */
    cdId?: number;
    dia?: string | null;
    inicio?: string | null;
}

interface CalendarioProps {
    onAddActividad?: (a: Omit<Actividad, 'id'>) => Promise<any>;
}

export const Calendario: React.FC<CalendarioProps> = ({ onAddActividad }) => {
    const state = useAppStore(s => s.state);
    const { loadCalendarioData, contextReady } = useSupabaseData(true);
    const session = useAppStore(s => s.session);
    const selectedCursoId = useAppStore(s => s.selectedCursoId);
    const selectedPeriodo = useAppStore(s => s.selectedPeriodo);
    const { actividades = [], cursos = [], cursoDocentes = [] } = state || {};
    const [view, setView] = useState<'month' | 'week'>('month');
    const [cursor, setCursor] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(iso(new Date()));
    
    const fetchAllNotas = usePlanClasesStore(s => s.fetchAllNotas);
    const fichasReales = usePlanClasesStore(s => s.notas);

    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAttendanceWizardOpen, setIsAttendanceWizardOpen] = useState(false);
    const [isAttendanceReportOpen, setIsAttendanceReportOpen] = useState(false);
    const [isHorarioModalOpen, setIsHorarioModalOpen] = useState(false);
    /** Columna sobre la que el arrastre de una clase es inválido (día fuera de dias_semana). */
    const [invalidDropDay, setInvalidDropDay] = useState<string | null>(null);
    /** Ajuste en curso del borde de un bloque: { bloqueKey, inicio, fin } */
    const [ajuste, setAjuste] = useState<{ key: string; inicio: string; fin: string } | null>(null);
    const [ajustando, setAjustando] = useState(false);
    const ajusteRef = useRef<{
        key: string;
        cdId: number;
        dia: string;
        borde: 'inicio' | 'fin';
        inicio: string;
        fin: string;
        y0: number;
        pxPorMinuto: number;
    } | null>(null);
    const ajustePreviewRef = useRef<{ key: string; inicio: string; fin: string } | null>(null);
    /** Tarjeta en ajuste: se le quita `draggable` para que el asa no la mueva. */
    const ajusteElRef = useRef<HTMLElement | null>(null);

    
    // Modal Form State
    const [entryDate, setEntryDate] = useState(iso(new Date()));
    const [entryTime, setEntryTime] = useState<string>('10:00');

    useEffect(() => {
        if (session?.user?.id) {
            fetchAllNotas(session.user.id);
        }
        if (contextReady) {
            loadCalendarioData();
        }
    }, [session?.user?.id, fetchAllNotas, contextReady, loadCalendarioData]);
    
    // Context data ready









    // Range-aware loader hook ready
        // Selective range fetch ready
        // For now, assume global data is loaded or trigger a refresh if needed.


    /**
     * ÚNICO punto de persistencia del horario por día de un curso_docente.
     * Lo usan tanto el arrastre de la tarjeta como el ajuste de sus bordes,
     * para no existir dos caminos que escriban `curso_docentes.horarios`.
     */
    const guardarHorarios = async (
        cdId: number,
        horarios: any[],
        horariosPrevios: any[] | undefined,
        accion: 'mover' | 'redimensionar'
    ) => {
        useAppStore.setState((s) => ({
            state: {
                ...s.state,
                cursoDocentes: (s.state.cursoDocentes || []).map(c => c.id === cdId ? { ...c, horarios } : c)
            }
        }));

        const { error } = await supabase.from('curso_docentes').update({ horarios }).eq('id', cdId);
        if (error) {
            alert(accion === 'mover' ? "Error al mover el horario." : "Error al ajustar la duración de la clase.");
            useAppStore.setState((s) => ({
                state: {
                    ...s.state,
                    cursoDocentes: (s.state.cursoDocentes || []).map(c => c.id === cdId ? { ...c, horarios: horariosPrevios || [] } : c)
                }
            }));
        }
    };

    /* ------------------------------------------------------------------ *
     * AJUSTE DIRECTO DE LA TARJETA (arrastrar borde = cambiar hora)
     *
     * El borde inferior ajusta `fin` manteniendo `inicio`; el borde superior
     * ajusta `inicio` manteniendo `fin`. Misma granularidad de 30 min que usa
     * el resto de la grilla. Se persiste al soltar, sin abrir ningún modal.
     * ------------------------------------------------------------------ */

    const iniciarAjuste = (
        e: React.MouseEvent,
        bloque: BloqueClaseSemanal,
        borde: 'inicio' | 'fin',
        pxPorMinuto: number
    ) => {
        // Evita que el mousedown del asa dispare el drag de HTML5 de la tarjeta.
        e.preventDefault();
        e.stopPropagation();
        const tarjeta = e.currentTarget.parentElement as HTMLElement | null;
        if (tarjeta) tarjeta.setAttribute('draggable', 'false');
        ajusteElRef.current = tarjeta;
        ajusteRef.current = {
            key: bloque.key,
            cdId: bloque.cdId,
            dia: bloque.dia,
            borde,
            inicio: bloque.inicio,
            fin: bloque.fin,
            y0: e.clientY,
            pxPorMinuto,
        };
        setAjuste({ key: bloque.key, inicio: bloque.inicio, fin: bloque.fin });
        setAjustando(true);
    };

    useEffect(() => {
        if (!ajustando) return;

        const onMove = (e: MouseEvent) => {
            const ctx = ajusteRef.current;
            if (!ctx) return;
            const deltaMin = snapMin((e.clientY - ctx.y0) / ctx.pxPorMinuto);
            const ini = toMinutes(ctx.inicio);
            const fin = toMinutes(ctx.fin);
            let nuevoIni = ini;
            let nuevoFin = fin;
            if (ctx.borde === 'fin') {
                // Mínimo 30 min de clase; tope a 23:59.
                nuevoFin = Math.min(Math.max(fin + deltaMin, ini + STEP_MIN), 23 * 60 + 59);
            } else {
                nuevoIni = Math.min(Math.max(ini + deltaMin, 0), fin - STEP_MIN);
            }
            const siguiente = { key: ctx.key, inicio: minutesToTime(nuevoIni), fin: minutesToTime(nuevoFin) };
            ajustePreviewRef.current = siguiente;
            setAjuste(siguiente);
        };

        const finalizarAjuste = () => {
            const tarjeta = ajusteElRef.current;
            ajusteElRef.current = null;
            // Se restituye siempre el arrastre, incluso si el puntero se soltó
            // fuera de la ventana: sin esto la tarjeta quedaría inmovible.
            if (tarjeta) tarjeta.setAttribute('draggable', 'true');

            const ctx = ajusteRef.current;
            const siguiente = ajustePreviewRef.current;
            ajusteRef.current = null;
            ajustePreviewRef.current = null;
            setAjuste(null);
            setAjustando(false);
            if (!ctx || !siguiente) return;
            if (siguiente.inicio === ctx.inicio && siguiente.fin === ctx.fin) return; // sin cambio real

            const cd = cursoDocentes.find(c => c.id === ctx.cdId);
            const current: any[] = cd && Array.isArray(cd.horarios) ? cd.horarios : [];
            // Se identifica la entrada por curso_docente + día + hora de inicio:
            // sólo se modifica ese día, nunca los demás.
            const idx = current.findIndex(h =>
                normalizarDia(h?.dia) === ctx.dia && normalizarHora(h?.inicio) === ctx.inicio
            );
            if (idx < 0) return;

            const nuevos = current.map((h, i) => (i === idx ? { ...h, dia: ctx.dia, inicio: siguiente.inicio, fin: siguiente.fin } : h));
            guardarHorarios(ctx.cdId, nuevos, current, 'redimensionar');
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', finalizarAjuste);
        window.addEventListener('blur', finalizarAjuste);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', finalizarAjuste);
            window.removeEventListener('blur', finalizarAjuste);
            const tarjeta = ajusteElRef.current;
            ajusteElRef.current = null;
            if (tarjeta) tarjeta.setAttribute('draggable', 'true');
        };
    }, [ajustando]);

    const handleMoveItem = async (item: DraggedItem | null, date: string, minutes?: number, targetId?: number | null) => {
        if (!item) return;
        
        if (item.type === 'actividad') {
            const act = actividades.find((a: any) => a.id === item.id);
            if (!act) return;

            const prevFecha = act.fecha;
            const prevHora = act.hora_inicio;

            let payload: any = { fecha: date };
            
            if (targetId && targetId !== item.id && date === prevFecha) {
                const targetAct = actividades.find((a: any) => a.id === targetId);
                if (targetAct) {
                    const targetMin = targetAct.hora_inicio ? toMinutes(targetAct.hora_inicio) : 480;
                    payload.hora_inicio = minutesToTime(Math.max(0, targetMin - 1));
                }
            } else if (minutes !== undefined) {
                payload.hora_inicio = minutesToTime(Math.max(420, Math.min(1020, minutes)));
            } else {
                payload.hora_inicio = act.hora_inicio;
            }

            if (prevFecha === payload.fecha && prevHora === payload.hora_inicio) return;

            useAppStore.setState((s) => ({
                state: {
                    ...s.state,
                    actividades: s.state.actividades.map((a: any) => a.id === item.id ? { ...a, ...payload } : a)
                }
            }));

            const { error } = await supabase.from('actividades').update(payload).eq('id', item.id);
            if (error) {
                useAppStore.setState((s) => ({
                    state: {
                        ...s.state,
                        actividades: s.state.actividades.map((a: any) => a.id === item.id ? { ...a, fecha: prevFecha, hora_inicio: prevHora } : a)
                    }
                }));
                alert("Error al mover el elemento.");
            }
        } else if (item.type === 'horario') {
            if (item.cdId === undefined || minutes === undefined) return;

            const newDayName = diaDeSemana(new Date(date + 'T00:00:00'));

            const { cursoDocentes } = useAppStore.getState().state;
            const cd = cursoDocentes?.find(c => c.id === item.cdId);
            if (!cd) return;

            // REGLA CRÍTICA: sólo se permiten días que ya están en dias_semana.
            // No se agrega el día ni se modifica dias_semana silenciosamente.
            if (!cdImparteEnDia(cd, newDayName)) {
                alert(`No se puede mover: ${cd.asignatura || 'este curso'} no se imparte los ${newDayName}s.`);
                return;
            }

            const current: any[] = Array.isArray(cd.horarios) ? cd.horarios : [];
            const draggedDia = normalizarDia(item.dia);
            const draggedInicio = normalizarHora(item.inicio);

            // Se identifica la entrada por curso_docente + día + hora, nunca por
            // posición en el array, para no pisar el horario de otro día.
            const idx = current.findIndex(h =>
                normalizarDia(h?.dia) === draggedDia &&
                (!draggedInicio || normalizarHora(h?.inicio) === draggedInicio)
            );

            const nuevoInicio = minutesToTime(minutes);
            let newHorarios: any[];

            if (idx >= 0) {
                const prev = current[idx];
                const prevStart = toMinutes(normalizarHora(prev.inicio) || '00:00');
                const prevEnd = toMinutes(normalizarHora(prev.fin) || '00:00');
                const dur = prevEnd - prevStart > 0 ? prevEnd - prevStart : 60;
                const movido = { ...prev, dia: newDayName, inicio: nuevoInicio, fin: minutesToTime(minutes + dur) };
                // Mismo día → se reemplaza sólo esa entrada.
                // Otro día permitido → esa entrada se traslada, el resto no cambia.
                newHorarios = draggedDia === newDayName
                    ? current.map((h, i) => (i === idx ? movido : h))
                    : [...current.filter((_, i) => i !== idx), movido];
            } else {
                // Arrastrado desde "Todo el día": no existía horario para ese día.
                newHorarios = [...current, { dia: newDayName, inicio: nuevoInicio, fin: minutesToTime(minutes + 60) }];
            }

            // Actualización optimista local
            await guardarHorarios(cd.id, newHorarios, cd.horarios, 'mover');
        } else if (item.type === 'ficha') {
            const ficha = fichasReales.find((f: any) => f.id === item.id);
            if (!ficha) return;

            const payload = {
                nombre: ficha.titulo,
                fecha: date,
                tipo_calendario: 'clase',
                plan_ficha_id: ficha.id,
                curso_id: selectedCursoId || null,
                periodo: selectedPeriodo || 'P1',
                user_id: session?.user?.id
            };

            const tempId = Date.now();
            const tempAct = { ...payload, id: tempId, color_calendario: 'blue' };

            useAppStore.setState((s) => ({
                state: {
                    ...s.state,
                    actividades: [...(s.state.actividades || []), tempAct as any]
                }
            }));

            const { data, error } = await supabase.from('actividades').insert(payload).select().single();
            
            if (error || !data) {
                useAppStore.setState((s) => ({
                    state: {
                        ...s.state,
                        actividades: (s.state.actividades || []).filter((a: any) => a.id !== tempId)
                    }
                }));
                alert("Error al agendar la ficha.");
            } else {
                useAppStore.setState((s) => ({
                    state: {
                        ...s.state,
                        actividades: (s.state.actividades || []).map((a: any) => a.id === tempId ? { ...a, id: data.id } : a)
                    }
                }));
            }
        }
    };

    const renderMonthGrid = () => {
        const y = cursor.getFullYear();
        const m = cursor.getMonth();
        const first = new Date(y, m, 1);
        const offset = (first.getDay() + 6) % 7;
        const start = addDays(first, -offset);

        let cells = [];
        for (let i = 0; i < 42; i++) {
            const date = addDays(start, i);
            const dateIso = iso(date);
            const isOutside = date.getMonth() !== m;
            const isSelected = dateIso === selectedDate;
            const isToday = dateIso === iso(new Date());

            const cellEvents = actividades.filter((a: any) => a.fecha === dateIso && a.tipo_calendario !== 'clase').sort((a: any, b: any) => (a.hora_inicio || "99:99").localeCompare(b.hora_inicio || "99:99"));

            cells.push(
                <div 
                    key={dateIso}
                    data-date={dateIso}
                    className={`day-cell relative p-1.5 md:p-2 border-r border-b border-[#e6e8e2] min-w-0 transition-colors ${isOutside ? 'bg-[#fbfbf9]' : ''} ${isSelected ? 'bg-[#f0f5ec]' : 'hover:bg-[#fcfdfb] group'}`}
                    onClick={() => setSelectedDate(dateIso)}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-[#f0f5ec]'); e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(104,156,99,.36)'; }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('bg-[#f0f5ec]'); e.currentTarget.style.boxShadow = 'none'; }}
                    onDrop={(e) => { 
                        e.preventDefault(); 
                        e.currentTarget.classList.remove('bg-[#f0f5ec]'); 
                        e.currentTarget.style.boxShadow = 'none';
                        handleMoveItem(draggedItem, dateIso); 
                    }}
                >
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold ${isToday ? 'bg-[#689c63] text-white shadow-sm' : (isOutside ? 'text-[#afb5ae]' : 'text-[#4e5750]')}`}>
                        {date.getDate()}
                    </span>
                    <button
                        type="button"
                        className="hidden group-hover:block absolute right-1.5 top-1.5 text-[10px] font-bold text-[#689c63] bg-white border border-[#d9e3d4] px-1.5 py-1 rounded shadow-sm"
                        onClick={(e) => { e.stopPropagation(); setEntryDate(dateIso); setIsModalOpen(true); }}
                    >
                        + Actividad
                    </button>

                    {cellEvents.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                            {cellEvents.map((act: any) => {
                                const c = getCourseColor(act.cursoId || (act as any).curso_id, cursos);
                                return (
                                    <div 
                                        key={act.id} 
                                        className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium leading-tight truncate border cursor-grab active:cursor-grabbing ${c.bg} ${c.border} ${c.text}`} 
                                        title={act.nombre}
                                        draggable
                                        onDragStart={(e) => { setDraggedItem({ id: act.id, type: 'actividad' }); e.stopPropagation(); setTimeout(() => (e.target as HTMLElement).style.opacity = '0.5', 0); }}
                                        onDragEnd={(e) => { (e.target as HTMLElement).style.opacity = '1'; setDraggedItem(null); }}
                                    >
                                        {act.nombre}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {(() => {
                        const cellFichas = actividades.filter((a: any) => a.fecha === dateIso && a.tipo_calendario === 'clase');
                        if (cellFichas.length === 0) return null;
                        return (
                            <div className="mt-1 flex flex-col gap-1">
                                {cellFichas.map((ficha: any) => {
                                    const c = getCourseColor(ficha.cursoId || (ficha as any).curso_id, cursos);
                                    return (
                                        <div 
                                            key={`ficha-${ficha.id}`} 
                                            className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium leading-tight truncate border cursor-grab active:cursor-grabbing ${c.bg} ${c.border} ${c.text}`} 
                                            title={ficha.nombre}
                                            draggable
                                            onDragStart={(e) => { setDraggedItem({ id: ficha.id, type: 'ficha' }); e.stopPropagation(); setTimeout(() => (e.target as HTMLElement).style.opacity = '0.5', 0); }}
                                            onDragEnd={(e) => { (e.target as HTMLElement).style.opacity = '1'; setDraggedItem(null); }}
                                        >
                                            📄 {ficha.nombre}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {(() => {
                        const cellMinerd = getMinerdEventsForDate(dateIso, state.calendarioMinerd || []);
                        if (cellMinerd.length === 0) return null;
                        return (
                            <div className="mt-1 flex flex-wrap gap-0.5">
                                {cellMinerd.map((ev: any) => (
                                    <div key={`minerd-${ev.id}`} className="px-1 h-3 rounded-sm bg-[#e8e2c0] text-[#786b33] text-[9px] font-bold truncate max-w-full" title={ev.titulo}>MINERD</div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            );
        }
        return cells;
    };

    const renderWeekGrid = () => {
        const start = weekStart(cursor);
        const HOUR_HEIGHT = 60; // 60px por hora
        const PX_POR_MIN = HOUR_HEIGHT / 60;

        // Representación derivada única de la semana.
        const modelo = construirModeloSemana(
            start,
            cursoDocentes,
            actividades,
            state.calendarioMinerd || []
        );

        /* ---------------------------------------------------------------- *
         * ESCALA ADAPTATIVA: se dibuja el rango que el docente realmente usa.
         * No hay una regla horaria fija que ocupe espacio cuando no hay
         * ninguna clase. El mapeo minutos→px sigue siendo lineal, así que
         * posicionar, soltar y redimensionar comparten la misma escala.
         * ---------------------------------------------------------------- */
        const minutos = modelo.flatMap(d => d.bloques.flatMap(b => [toMinutes(b.inicio), toMinutes(b.fin)]));
        const GRID_INI = minutos.length
            ? snapMin(Math.floor(Math.min(...minutos) / STEP_MIN) * STEP_MIN - STEP_MIN)
            : 8 * 60;
        const GRID_FIN = minutos.length
            ? snapMin(Math.ceil(Math.max(...minutos) / STEP_MIN) * STEP_MIN + STEP_MIN)
            : 10 * 60;
        const PX_POR_HORA = HOUR_HEIGHT;
        const PX_GRID = Math.max(((GRID_FIN - GRID_INI) / 60) * PX_POR_HORA, PX_POR_HORA * 2);

        const getTimePosition = (timeStr: string) =>
            ((toMinutes(timeStr) - GRID_INI) / 60) * PX_POR_HORA;

        const getDurationHeight = (inicio: string, fin: string) => {
            const dur = toMinutes(fin) - toMinutes(inicio);
            return ((dur > 0 ? dur : 60) / 60) * PX_POR_HORA;
        };

        // Offset vertical → minutos del día, ajustado a la misma granularidad.
        const minutosDesdeY = (y: number) =>
            snapMin(GRID_INI + y / PX_POR_MIN);

        // Marcas de referencia: sólo dentro del rango ocupado, y horarias.
        const marcasHora: number[] = [];
        for (let m = Math.ceil(GRID_INI / 60) * 60; m <= GRID_FIN; m += 60) marcasHora.push(m);

        const cursoLabel = (cursoId: number) => {
            const curso = cursos.find((cu: any) => cu.id === cursoId);
            return curso ? `${curso.grado} ${curso.seccion}` : 'Curso';
        };

        // ¿Es válido soltar aquí el bloque de clase que se está arrastrando?
        const diaInvalidoPara = (dia: string) => {
            if (draggedItem?.type !== 'horario' || draggedItem.cdId === undefined) return false;
            const cd = cursoDocentes.find((c: any) => c.id === draggedItem.cdId);
            return !cdImparteEnDia(cd, dia);
        };

        const renderHijos = (
            children: ItemCalendario[],
            c: ReturnType<typeof getCourseColor>,
            prefijo: string
        ) =>
            children.map((item: ItemCalendario) => (
                <div key={`${prefijo}-${item.id}`} className={`rounded-[2px] bg-white/60 px-1 py-0.5 text-[9px] font-bold ${c.text} truncate`}>
                    {prefijo === 'ficha' ? `📄 ${item.nombre}` : item.nombre}
                </div>
            ));

        const allDayCols: React.ReactNode[] = [];
        const gridCols: React.ReactNode[] = [];

        for (const dia of modelo) {
            const { dateIso } = dia;

            /* ---------- Todo el día: sólo lo que NO se pudo ubicar ---------- */
            allDayCols.push(
                <div key={`allday-${dateIso}`} className="border-l border-[#e6e8e2] p-1.5 flex flex-col gap-1.5 min-h-12.5 first:border-l-0 bg-[#fafbf8]">
                    {dia.sinHorario.map((s) => {
                        const c = getCourseColor(s.cursoId, cursos);
                        return (
                            <div
                                key={`cd-sin-horario-${s.cdId}`}
                                className={`p-1.5 rounded-[2px] border border-dashed ${c.border} ${c.bg} opacity-80 cursor-grab active:cursor-grabbing hover:opacity-100 flex flex-col gap-0.5`}
                                draggable
                                onDragStart={(e) => {
                                    setDraggedItem({ id: s.cdId, type: 'horario', cdId: s.cdId, dia: null, inicio: null });
                                    e.stopPropagation();
                                    setTimeout(() => (e.target as HTMLElement).style.opacity = '0.5', 0);
                                }}
                                onDragEnd={(e) => { (e.target as HTMLElement).style.opacity = '1'; setDraggedItem(null); }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEntryDate(dateIso);
                                    // La escala es adaptativa: la hora propuesta debe caer
                                    // dentro de la franja visible o la clase nueva aparecería
                                    // fuera de la grilla.
                                    setEntryTime(minutesToTime(Math.min(Math.max(8 * 60, GRID_INI), GRID_FIN - STEP_MIN)));
                                    setIsHorarioModalOpen(true);
                                }}
                            >
                                <span className={`font-extrabold ${c.text} text-[10px] leading-tight`}>{cursoLabel(s.cursoId)}</span>
                                <span className={`font-bold ${c.text} text-[9px] leading-tight truncate`}>{s.asignatura}</span>
                                <span className="text-[8px] font-medium text-gray-500 mt-0.5 mb-1">Sin horario (TBD)</span>
                                {(s.fichas.length > 0 || s.actividades.length > 0) && (
                                    <div className="flex-1 space-y-0.5 mt-1">
                                        {renderHijos(s.fichas, c, 'ficha')}
                                        {renderHijos(s.actividades, c, 'actividad')}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {dia.sueltos.map((item) => {
                        const ficha = esFicha(item);
                        const c = getCourseColor(item.cursoId ?? item.curso_id, cursos);
                        return (
                            <div key={`${ficha ? 'ficha' : 'act'}-${item.id}`} className={`p-1.5 rounded-[2px] border ${c.border} ${c.bg} text-[10px] leading-tight`}>
                                <span className={`font-bold ${c.text}`}>{ficha ? `📄 ${item.nombre}` : item.nombre}</span>
                            </div>
                        );
                    })}

                    {dia.minerd.map(ev => (
                        <div key={`minerd-week-${ev.id}`} className="px-1.5 py-1 rounded-[2px] border border-[#d6cfad] bg-[#fbf9ee] text-[9px] font-bold text-[#5c5017] leading-tight">
                            <span className="text-[#b8a032]">M</span> {ev.titulo}
                        </div>
                    ))}
                </div>
            );

            /* ---------- Columna horaria: el curso_docente es el bloque ---------- */
            gridCols.push(
                <div
                    key={`grid-${dateIso}`}
                    data-date={dateIso}
                    className="relative border-l border-[#e6e8e2] first:border-l-0 group cursor-pointer"
                    style={{ minHeight: `${PX_GRID}px` }}
                    onClick={(e) => {
                        // Clic en espacio vacío → ModalHorarioClase con día + hora.
                        if ((e.target as HTMLElement).closest('[data-bloque-clase]')) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setEntryDate(dateIso);
                        setEntryTime(minutesToTime(minutosDesdeY(e.clientY - rect.top)));
                        setIsHorarioModalOpen(true);
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        const bloqueado = diaInvalidoPara(dia.dia);
                        e.currentTarget.style.backgroundColor = bloqueado ? '#fdf3f2' : '#f3f7ef';
                        e.currentTarget.style.boxShadow = bloqueado ? 'inset 0 0 0 2px rgba(184,92,92,.28)' : 'none';
                        setInvalidDropDay(prev => bloqueado ? dateIso : (prev === dateIso ? null : prev));
                    }}
                    onDragLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.boxShadow = 'none';
                        setInvalidDropDay(prev => (prev === dateIso ? null : prev));
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.boxShadow = 'none';
                        setInvalidDropDay(null);
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleMoveItem(draggedItem, dateIso, minutosDesdeY(e.clientY - rect.top));
                    }}
                >
                    {/* Referencias discontinuas: orientan sin dominar el contenido */}
                    {marcasHora.map(m => (
                        <div
                            key={m}
                            className="absolute w-full border-b border-dashed border-[#dfe3dc] pointer-events-none"
                            style={{ top: `${((m - GRID_INI) / 60) * PX_POR_HORA}px` }}
                        />
                    ))}

                    {invalidDropDay === dateIso && (
                        <div className="absolute top-1 left-1 right-1 z-20 rounded-[2px] border border-[#e5b4b4] bg-[#fdf3f2] px-2 py-1 text-[9px] font-bold text-[#a03a3a] leading-tight pointer-events-none">
                            Este curso no tiene clase este día
                        </div>
                    )}

                    {dia.bloques.map((bloque) => {
                        const enAjuste = ajuste?.key === bloque.key;
                        const bInicio = enAjuste ? ajuste.inicio : bloque.inicio;
                        const bFin = enAjuste ? ajuste.fin : bloque.fin;
                        const top = getTimePosition(bInicio);
                        const height = getDurationHeight(bInicio, bFin);
                        const c = getCourseColor(bloque.cursoId, cursos);

                        return (
                            <div
                                key={bloque.key}
                                data-bloque-clase
                                draggable
                                onDragStart={(e) => {
                                    setDraggedItem({
                                        id: bloque.cdId,
                                        type: 'horario',
                                        cdId: bloque.cdId,
                                        dia: bloque.dia,
                                        inicio: bloque.inicio,
                                    });
                                    e.stopPropagation();
                                    setTimeout(() => (e.target as HTMLElement).style.opacity = '0.5', 0);
                                }}
                                onDragEnd={(e) => { (e.target as HTMLElement).style.opacity = '1'; setDraggedItem(null); }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAddActividad) {
                                        setEntryDate(dateIso);
                                        setIsModalOpen(true);
                                    }
                                }}
                                className={`absolute left-1 right-1 rounded-[2px] border ${c.border} ${c.bg} pt-1 pb-2 px-1.5 overflow-hidden z-10 cursor-grab active:cursor-grabbing flex flex-col gap-1 ${enAjuste ? 'ring-1 ring-black/20' : ''}`}
                                style={{ top: `${top}px`, height: `${height}px` }}
                                title={`${cursoLabel(bloque.cursoId)} · ${bloque.asignatura} · ${bInicio}-${bFin}`}
                            >
                                {/* Asa superior: ajusta la hora de inicio */}
                                <div
                                    onMouseDown={(e) => iniciarAjuste(e, bloque, 'inicio', PX_POR_MIN)}
                                    className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-20"
                                    title="Arrastrar para ajustar la hora de inicio"
                                />
                                <div className="shrink-0 pointer-events-none">
                                    <div className={`font-extrabold ${c.text} text-[10px] leading-tight truncate`}>{cursoLabel(bloque.cursoId)}</div>
                                    <div className={`font-medium ${c.text} text-[9px] leading-tight truncate opacity-90`}>{bloque.asignatura}</div>
                                    <div className={`font-semibold ${c.text} text-[9px] leading-tight opacity-70 tabular-nums`}>{bInicio}–{bFin}</div>
                                </div>

                                {(bloque.fichas.length > 0 || bloque.actividades.length > 0) && (
                                    <div className="flex-1 overflow-y-auto mt-0.5 space-y-0.5 min-h-0 pointer-events-none">
                                        {renderHijos(bloque.fichas, c, 'ficha')}
                                        {renderHijos(bloque.actividades, c, 'actividad')}
                                    </div>
                                )}

                                {/* Asa inferior: ajusta la hora de finalización */}
                                <div
                                    onMouseDown={(e) => iniciarAjuste(e, bloque, 'fin', PX_POR_MIN)}
                                    className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 flex items-end justify-center"
                                    title="Arrastrar para ajustar la hora de finalización"
                                >
                                    <span className="block w-8 h-0.5 rounded-full bg-black/25 group-hover:bg-black/40" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return (
            <div className="border border-[#e6e8e2] rounded-md overflow-hidden bg-white flex flex-col">
                {/* Header (Días) */}
                <div className="flex border-b border-[#e6e8e2] bg-[#fafbf8]">
                    <div className="w-12.5 shrink-0 border-r border-[#e6e8e2]"></div>
                    <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${DIAS_SEMANA_SEMANA}, minmax(0, 1fr))` }}>
                        {dayNamesSemana.map((d, i) => {
                            const day = addDays(start, i);
                            const isToday = iso(day) === iso(new Date());
                            return (
                                <div key={d} className="px-2 py-2 text-[#7a817b] text-[10px] font-bold uppercase tracking-wider text-center border-l border-[#e6e8e2] first:border-l-0">
                                    {d}
                                    <strong className={`block mt-0.5 text-[14px] tracking-normal normal-case ${isToday ? 'text-[#689c63]' : 'text-[#404a41]'}`}>{day.getDate()}</strong>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* All-day Section */}
                <div className="flex border-b border-[#e6e8e2]/80 bg-[#fafbf8]">
                    <div className="w-12.5 shrink-0 border-r border-[#e6e8e2] flex items-center justify-center">
                        <span className="text-[9px] text-[#9a9e9b] font-medium tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>TODO EL DÍA</span>
                    </div>
                    <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${DIAS_SEMANA_SEMANA}, minmax(0, 1fr))` }}>
                        {allDayCols}
                    </div>
                </div>

                {/* Time Grid Scrollable */}
                <div className="flex bg-white overflow-y-auto max-h-150 relative">
                    <div className="w-12.5 shrink-0 border-r border-[#e6e8e2] bg-[#fafbf8] relative" style={{ height: `${PX_GRID}px` }}>
                        {marcasHora.map(m => (
                            <div key={m} className="absolute w-full text-right pr-1.5" style={{ top: `${((m - GRID_INI) / 60) * PX_POR_HORA}px` }}>
                                <span className="text-[10px] font-medium text-[#a8ada7] tabular-nums">{minutesToTime(m)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${DIAS_SEMANA_SEMANA}, minmax(0, 1fr))` }}>
                        {gridCols}
                    </div>
                </div>
            </div>
        );
    };

    const getPeriodLabel = () => {
        if (view === 'month') {
            return `${monthNames[cursor.getMonth()][0].toUpperCase()}${monthNames[cursor.getMonth()].slice(1)} ${cursor.getFullYear()}`;
        } else {
            const start = weekStart(cursor);
            const end = addDays(start, DIAS_SEMANA_SEMANA - 1);
            return `${start.getDate()} ${monthNames[start.getMonth()].slice(0, 3)} — ${end.getDate()} ${monthNames[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
        }
    };

    const navigate = useNavigate();

    return (
        <div 
            className="w-full min-h-screen text-[#263128] font-sans bg-[#f7edcf]"
            style={{ 
                backgroundImage: `url('/calendar-bg.jpg')`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }}
        >
            <div className="min-h-screen bg-white/40 backdrop-blur-[2px]">
                <header className="w-full bg-white/80 backdrop-blur-md border-b border-[#e6e8e2]/50 sticky top-0 z-20">
                    <div className="max-w-360 mx-auto px-7 py-2 flex items-center justify-between">
                        <button onClick={() => navigate('/inicio')} className="text-[13px] font-bold text-[#689c63] hover:text-[#578952] flex items-center gap-1.5 drop-shadow-sm">
                            &larr; Inicio
                        </button>
                        <div className="border border-[#e6e8e2]/50 bg-white/50 backdrop-blur-md rounded-lg p-0.5 flex gap-0.5 shadow-sm">
                            <button 
                                onClick={() => setView('month')}
                                className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-all ${view === 'month' ? 'bg-white text-[#314b32] shadow-sm' : 'text-[#687169] hover:bg-white/50'}`}
                            >
                                Mes
                            </button>
                            <button 
                                onClick={() => setView('week')}
                                className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-all ${view === 'week' ? 'bg-white text-[#314b32] shadow-sm' : 'text-[#687169] hover:bg-white/50'}`}
                            >
                                Semana
                            </button>
                        </div>
                    </div>
                </header>
                <main className="max-w-360 mx-auto w-full px-7 py-4 relative z-10">
                <section className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2">
                        <button 
                            className="w-8.5 h-8.5 inline-flex items-center justify-center border border-[#e6e8e2] rounded-[9px] bg-white text-[#58625a] hover:bg-[#f4f6f1] transition-colors"
                            onClick={() => setCursor(view === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1) : addDays(cursor, -7))}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                            className="w-8.5 h-8.5 inline-flex items-center justify-center border border-[#e6e8e2] rounded-[9px] bg-white text-[#58625a] hover:bg-[#f4f6f1] transition-colors"
                            onClick={() => setCursor(view === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) : addDays(cursor, 7))}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <h2 className="ml-3 text-[15px] font-extrabold text-[#263128] tracking-tight">{getPeriodLabel()}</h2>
                        <button 
                            className="ml-2 rounded-lg border border-[#dfe3dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#566057] hover:bg-[#f4f6f1]"
                            onClick={() => { setCursor(new Date()); setSelectedDate(iso(new Date())); }}
                        >
                            Hoy
                        </button>
                    </div>
                    <aside className="flex items-center gap-4 text-xs text-[#697169]">
                        <span className="flex items-center gap-2"><i className="w-2 h-2 rounded-full bg-[#689c63]"></i>Actividad</span>
                        <span className="flex items-center gap-2"><i className="w-2.25 h-2.25 border-l-[3px] border-[#537bac] bg-[#e0e9f4]"></i>Clase</span>
                    </aside>
                </section>
                
                {view === 'month' ? (
                    <section className="flex flex-col xl:flex-row gap-5 items-start">
                        <div className="flex-1 w-full border border-[#e6e8e2] rounded-xl overflow-hidden bg-white">
                            <div className="grid grid-cols-7 border-b border-[#e6e8e2] bg-[#fafbf8]">
                                {dayNames.map(d => (
                                    <div key={d} className="px-3 py-2.5 text-[#7a817b] text-[11px] font-bold uppercase tracking-wider">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(118px, 1fr)' }}>
                                {renderMonthGrid()}
                            </div>
                        </div>
                        {selectedDate && (
                            <CalendarSidePanel 
                                date={selectedDate}
                                actividades={actividades}
                                fichasReales={fichasReales}
                                cursos={cursos}
                                minerdEvents={state.calendarioMinerd || []}
                                onAddActividad={() => { setEntryDate(selectedDate); setIsModalOpen(true); }}
                                onOpenAttendance={() => setIsAttendanceWizardOpen(true)}
                                onOpenAttendanceReport={() => setIsAttendanceReportOpen(true)}
                                onMoveItem={(item, d, min, targetId) => handleMoveItem(item, d, min, targetId)}
                                setDraggedItem={setDraggedItem}
                                draggedItem={draggedItem}
                            />
                        )}
                    </section>
                ) : (
                    <section>
                        {renderWeekGrid()}
                    </section>
                )}
            </main>

            {/* Horario Modal */}
            <ModalHorarioClase
                show={isHorarioModalOpen}
                onClose={() => setIsHorarioModalOpen(false)}
                initialDate={entryDate}
                initialTime={entryTime}
                cursos={cursos}
                onSave={async (cursoDocenteId, dia, inicio, fin) => {
                    const cd = state.cursoDocentes?.find(c => c.id === cursoDocenteId);
                    if (!cd) throw new Error("Curso docente no encontrado");

                    // El modal sólo ofrece cursos que imparten ese día, pero se
                    // revalida aquí: nunca se agrega un día a dias_semana.
                    if (!cdImparteEnDia(cd, dia)) {
                        throw new Error(`Este curso no se imparte los ${dia}s.`);
                    }

                    const horarios = Array.isArray(cd.horarios) ? [...cd.horarios] : [];

                    if (inicio >= fin) throw new Error("La hora de inicio debe ser menor a la hora de fin.");

                    // Si ya existe una clase de ese curso ese día a esa hora, se
                    // actualiza en el lugar (no se duplica el bloque).
                    const existente = horarios.findIndex(h =>
                        normalizarDia(h?.dia) === dia && normalizarHora(h?.inicio) === inicio
                    );

                    if (existente >= 0) {
                        const duplicate = horarios.some((h, i) =>
                            i !== existente && normalizarHora(h?.fin) === fin
                        );
                        if (duplicate) throw new Error("Ya existe este horario para la asignatura.");
                        horarios[existente] = { ...horarios[existente], dia, inicio, fin };
                    } else {
                        horarios.push({ dia, inicio, fin });
                    }

                    // Update globally
                    const { error } = await supabase.from('curso_docentes').update({ horarios }).eq('id', cursoDocenteId);
                    if (error) throw new Error("Error guardando en la base de datos.");

                    // Update locally
                    useAppStore.setState((s) => ({
                        state: {
                            ...s.state,
                            cursoDocentes: (s.state.cursoDocentes || []).map(c => c.id === cd.id ? { ...c, horarios } : c)
                        }
                    }));
                }}
            />

            {/* Creation Modal */}
            {isModalOpen && onAddActividad && (
                <NewActivityModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onAddActividad={onAddActividad}
                    cursos={cursos}
                    onSuccess={() => setIsModalOpen(false)}
                    initialDate={entryDate}
                />
            )}
            
            {selectedDate && (
                <AttendanceWizardModal 
                    date={selectedDate}
                    isOpen={isAttendanceWizardOpen}
                    onClose={() => setIsAttendanceWizardOpen(false)}
                />
            )}
            
            {selectedDate && (
                <AttendanceReportModal 
                    date={selectedDate}
                    isOpen={isAttendanceReportOpen}
                    onClose={() => setIsAttendanceReportOpen(false)}
                />
            )}
            </div>
        </div>
    );
}

const CalendarSidePanel: React.FC<{
    date: string;
    actividades: Actividad[];
    fichasReales: any[];
    cursos: any[];
    minerdEvents: EventoCalendario[];
    onAddActividad: () => void;
    onOpenAttendance: () => void;
    onOpenAttendanceReport: () => void;
    onMoveItem: (item: DraggedItem | null, date: string, minutes?: number, targetId?: number | null) => void;
    setDraggedItem: (item: DraggedItem | null) => void;
    draggedItem: DraggedItem | null;
}> = ({ date, actividades, fichasReales, cursos, minerdEvents, onAddActividad, onOpenAttendance, onOpenAttendanceReport, onMoveItem, setDraggedItem, draggedItem }) => {
    const dayActividades = actividades.filter(a => a.fecha === date && a.tipo_calendario !== 'clase').sort((a: any, b: any) => (a.hora_inicio || "99:99").localeCompare(b.hora_inicio || "99:99"));
    const dayFichasScheduled = actividades.filter(a => a.fecha === date && a.tipo_calendario === 'clase');
    const dayMinerd = getMinerdEventsForDate(date, minerdEvents);
    // La fecha seleccionada es una fecha LOCAL: se interpreta con sus
    // componentes, nunca con new Date(iso) (que parsea a UTC y adelanta/atrasa
    // el día según el huso del equipo).
    const selLocal = dateLocalDesdeIso(date);
    
    const [isFichaSelectorOpen, setIsFichaSelectorOpen] = useState(false);
    
    return (
        <aside className="w-full xl:w-80 bg-white border border-[#e6e8e2] rounded-xl p-4 flex flex-col gap-5 sticky top-5">
            <header className="flex justify-between items-center pb-3 border-b border-[#e6e8e2]">
                <h3 className="font-bold text-lg text-[#263128]">{selLocal.getDate()} de {monthNames[selLocal.getMonth()]}</h3>
            </header>
            
            <section>
                <h4 className="text-xs font-bold text-[#7a817b] uppercase tracking-wider mb-3">Actividades</h4>
                <div className="flex flex-col gap-2 min-h-7.5" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onMoveItem(draggedItem, date); }}>
                    {dayActividades.map((act: any) => {
                        const c = getCourseColor(act.cursoId || act.curso_id, cursos);
                        return (
                        <div 
                            key={act.id}
                            draggable
                            onDragStart={(e) => { setDraggedItem({ id: act.id, type: 'actividad' }); setTimeout(() => (e.target as HTMLElement).style.opacity = '0.45', 0); }}
                            onDragEnd={(e) => { (e.target as HTMLElement).style.opacity = '1'; setDraggedItem(null); }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).style.borderTop = `2px solid ${c.dot.replace('bg-[', '').replace(']', '')}`; }}
                            onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderTop = ''; }}
                            onDrop={(e) => {
                                e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).style.borderTop = '';
                                onMoveItem(draggedItem, date, undefined, act.id);
                            }}
                            className={`p-2.5 rounded-lg border ${c.border} text-sm cursor-grab active:cursor-grabbing hover:border-black/20 transition-colors ${c.bg}`}
                        >
                            <div className={`font-bold ${c.text} leading-tight mb-1`}>{act.nombre}</div>
                            <div className={`text-xs ${c.text} opacity-80 flex gap-2`}>
                                {act.hora_inicio && <span>{act.hora_inicio}</span>}
                                {act.asignatura && <span>· {act.asignatura}</span>}
                            </div>
                        </div>
                        );
                    })}
                    <button onClick={onAddActividad} className="text-xs font-semibold text-[#689c63] hover:text-[#578952] flex items-center gap-1 mt-1 p-1">
                        <Plus className="w-3.5 h-3.5" /> Nueva actividad
                    </button>
                </div>
            </section>

            <section>
                <h4 className="text-xs font-bold text-[#7a817b] uppercase tracking-wider mb-3">Fichas</h4>
                <div className="flex flex-col gap-2 min-h-7.5" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onMoveItem(draggedItem, date); }}>
                    {dayFichasScheduled.map((ficha: any) => {
                        const c = getCourseColor(ficha.cursoId || ficha.curso_id, cursos);
                        return (
                        <div 
                            key={`sched-ficha-${ficha.id}`}
                            draggable
                            onDragStart={(e) => { setDraggedItem({ id: ficha.id, type: 'actividad' }); setTimeout(() => (e.target as HTMLElement).style.opacity = '0.45', 0); }}
                            onDragEnd={(e) => { (e.target as HTMLElement).style.opacity = '1'; setDraggedItem(null); }}
                            className={`p-2.5 rounded-lg border ${c.border} ${c.bg} text-sm cursor-grab active:cursor-grabbing hover:border-black/20 transition-colors`}
                        >
                            <div className={`font-bold ${c.text} leading-tight`}>📄 {ficha.nombre}</div>
                        </div>
                        );
                    })}
                    <button onClick={() => setIsFichaSelectorOpen(true)} className="text-xs font-semibold text-[#537bac] hover:text-[#42648f] flex items-center gap-1 mt-1 p-1">
                        <Plus className="w-3.5 h-3.5" /> Agregar ficha
                    </button>
                </div>
            </section>

            {dayMinerd.length > 0 && (
                <section>
                    <h4 className="text-xs font-bold text-[#7a817b] uppercase tracking-wider mb-3">MINERD</h4>
                    <div className="flex flex-col gap-2">
                        {dayMinerd.map(ev => (
                            <div key={`minerd-side-${ev.id}`} className="p-2.5 rounded-lg border border-[#d6cfad] bg-[#fbf9ee] text-sm">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <div className="font-bold text-[#5c5017] leading-tight">{ev.titulo}</div>
                                    <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#e8e2c0] text-[#786b33] uppercase shrink-0">
                                        {ev.tipo === 'institucional' ? 'Inst.' : 
                                         ev.tipo === 'conmemoracion' ? 'Conm.' : 
                                         ev.tipo === 'evaluacion' ? 'Eval.' :
                                         ev.tipo === 'receso' ? 'Receso' : ev.tipo}
                                    </div>
                                </div>
                                {ev.descripcion && (
                                    <p className="text-xs text-[#736830] opacity-90 leading-snug mt-1">
                                        {ev.descripcion}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {(() => {
                const recursos = dayFichasScheduled.flatMap((f: any) => (f.recursos || []).map((r: any) => ({ ...r, fichaTitulo: f.nombre, cursoId: f.cursoId || f.curso_id })));
                if (recursos.length > 0) {
                    return (
                        <section>
                            <h4 className="text-xs font-bold text-[#7a817b] uppercase tracking-wider mb-3">Recursos</h4>
                            <div className="flex flex-col gap-2">
                                {recursos.map((r: any, i) => {
                                    const c = getCourseColor(r.cursoId, cursos);
                                    return (
                                    <div key={i} className={`p-2.5 rounded-lg border ${c.border} ${c.bg} text-sm flex gap-2 items-center`}>
                                        <span className="text-lg">📎</span>
                                        <div>
                                            <div className={`font-bold ${c.text} leading-tight`}>{r.titulo}</div>
                                            <div className={`text-xs ${c.text} opacity-80`}>{r.fichaTitulo}</div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                }
                return null;
            })()}

            {(() => {
                const entregas = dayActividades.filter(a => a.requiereProducto || a.producto);
                if (entregas.length > 0) {
                    return (
                        <section>
                            <h4 className="text-xs font-bold text-[#7a817b] uppercase tracking-wider mb-3">Entregas</h4>
                            <div className="flex flex-col gap-2">
                                {entregas.map((a: any) => {
                                    const c = getCourseColor(a.cursoId || a.curso_id, cursos);
                                    return (
                                    <div key={a.id} className={`p-2.5 rounded-lg border ${c.border} ${c.bg} text-sm flex gap-2 items-center`}>
                                        <span className={`text-lg ${c.text}`}>↑</span>
                                        <div>
                                            <div className={`font-bold leading-tight ${c.text}`}>Producto: {a.producto || 'Entregable'}</div>
                                            <div className={`text-xs opacity-80 ${c.text}`}>{a.nombre}</div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                }
                return null;
            })()}

            <section>
                <h4 className="text-xs font-bold text-[#7a817b] uppercase tracking-wider mb-3">Asistencia</h4>
                <button 
                    onClick={onOpenAttendance} 
                    className="w-full text-left p-3 rounded-lg border border-black/5 bg-[#fcfcfa] text-sm flex gap-3 items-center hover:border-black/20 hover:bg-white transition-colors"
                >
                    <div className="w-6 h-6 rounded-full bg-[#e0e9f4] text-[#537bac] flex items-center justify-center font-bold text-xs">✓</div>
                    <div className="font-bold text-[#263128]">Pase de lista</div>
                </button>
                <button 
                    onClick={onOpenAttendanceReport} 
                    className="w-full text-left p-3 mt-2 rounded-lg border border-transparent text-sm flex gap-3 items-center hover:bg-[#f3f7ef] transition-colors"
                >
                    <div className="font-semibold text-[#58625a]">Informe de asistencia</div>
                </button>
            </section>

            {isFichaSelectorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
                        <header className="px-5 py-4 border-b border-[#e6e8e2] flex justify-between items-center bg-[#fafbf8]">
                            <h2 className="text-lg font-bold text-[#263128]">Agregar ficha existente</h2>
                            <button onClick={() => setIsFichaSelectorOpen(false)} className="text-[#8a918b] hover:text-[#263128] font-bold p-1">&times;</button>
                        </header>
                        <div className="p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-2">
                            {fichasReales.length === 0 ? (
                                <p className="text-sm text-[#8a918b]">No hay fichas en el espacio de trabajo.</p>
                            ) : (
                                fichasReales.map((f: any) => (
                                    <button 
                                        key={f.id} 
                                        onClick={() => { onMoveItem({ id: f.id, type: 'ficha' }, date); setIsFichaSelectorOpen(false); }}
                                        className="text-left w-full p-3 rounded-lg border border-[#e6e8e2] hover:bg-[#f3f7ef] hover:border-[#689c63] transition-colors"
                                    >
                                        <div className="font-bold text-[#263128] text-sm">{f.titulo}</div>
                                        {f.grado && f.curso_id && <div className="text-xs text-[#8a918b] mt-0.5">Asociada al curso</div>}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
