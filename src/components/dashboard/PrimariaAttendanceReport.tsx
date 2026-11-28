import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Curso, Estudiante, Grupo, NivelEducativo } from '../../types';
import { ensureCourseStudentsSWR } from '../../cache/estudianteCache';

/* ═════════════════════════════════════════════════════════════════════════
   1. IDENTIFICACIÓN DEL NIVEL EDUCATIVO (PRIMARIA VS SECUNDARIA)
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Determina de forma estricta si un curso pertenece al Nivel Primario
 * utilizando la clasificación oficial de CIELO (`curso.nivelEducativo` o `grupo.nivelEducativo`),
 * sin depender únicamente del nombre del grado.
 */
export function esCursoPrimaria(
    curso?: Curso | null,
    grupos?: Array<Pick<Grupo, 'id' | 'nivelEducativo'>> | null
): boolean {
    if (!curso) return false;
    const nivelDirecto: NivelEducativo | undefined = curso.nivelEducativo;
    if (nivelDirecto === 'primaria') return true;
    if (nivelDirecto === 'secundaria') return false;

    if (curso.grupoId && Array.isArray(grupos)) {
        const grupo = grupos.find(g => g.id === curso.grupoId);
        if (grupo?.nivelEducativo === 'primaria') return true;
        if (grupo?.nivelEducativo === 'secundaria') return false;
    }

    return false;
}

/* ═════════════════════════════════════════════════════════════════════════
   2. TIPOS Y CONSTANTES DEL CONTROL DE ASISTENCIA DE PRIMARIA
   ═════════════════════════════════════════════════════════════════════════ */

export type CodigoAsistenciaPrimaria = 'P' | 'T' | 'A' | 'E';

export interface DiaLaborableSlot {
    diaSemanaIndex: number; // 0 = Lunes .. 4 = Viernes
    diaSemanaNombre: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
    diaMes: number | null;
    fechaIso: string | null;
}

export interface SemanaMensualPrimaria {
    numero: 1 | 2 | 3 | 4 | 5;
    etiqueta: '1ra. Semana' | '2da. Semana' | '3ra. Semana' | '4ta. Semana' | '5ta. Semana';
    dias: [DiaLaborableSlot, DiaLaborableSlot, DiaLaborableSlot, DiaLaborableSlot, DiaLaborableSlot];
}

export interface ResumenMensualEstudiantePrimaria {
    presente: number;
    tardanza: number;
    ausente: number;
    excusa: number;
}

export interface FilaMensualEstudiantePrimaria {
    estudiante: Estudiante;
    numeroOrden: number;
    porFecha: Record<string, CodigoAsistenciaPrimaria>;
    resumen: ResumenMensualEstudiantePrimaria;
}

export interface MesEscolarConfig {
    clave: string;
    nombre: string;
    monthIndex: number; // 0 = Enero .. 11 = Diciembre
    year: number;
     startIso: string;
    endIso: string;
    pagina: 1 | 2;
}

export interface FilaAnualEstudiantePrimaria {
    estudiante: Estudiante;
    numeroOrden: number;
    porMes: Record<
        string,
        {
            diasTrabajadosMes: number;
            asistencia: number;
            tardanza: number;
            ausencia: number;
            excusa: number;
        }
    >;
    resumenAnual: {
        asistencia: number;
        tardanza: number;
        ausencia: number;
        excusa: number;
    };
    porcentajeAnual: {
        asistencia: number | null;
        ausencia: number | null;
    };
}

const DIAS_LABORABLES: Array<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'> = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
];

const ETIQUETAS_SEMANAS: Array<'1ra. Semana' | '2da. Semana' | '3ra. Semana' | '4ta. Semana' | '5ta. Semana'> = [
    '1ra. Semana',
    '2da. Semana',
    '3ra. Semana',
    '4ta. Semana',
    '5ta. Semana',
];

const MESES_NOMBRES: Record<number, string> = {
    0: 'Enero',
    1: 'Febrero',
    2: 'Marzo',
    3: 'Abril',
    4: 'Mayo',
    5: 'Junio',
    6: 'Julio',
    7: 'Agosto',
    8: 'Septiembre',
    9: 'Octubre',
    10: 'Noviembre',
    11: 'Diciembre',
};

/* ═════════════════════════════════════════════════════════════════════════
   3. FUNCIONES PURAS DE CALENDARIO Y CÁLCULO DE ASISTENCIA (PRIMARIA)
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Convierte el estado almacenado en `asistencia_excepciones` al código oficial de CIELO:
 * - 'P' -> Presente / Asistencia
 * - 'A' (o 'T') -> Tardanza
 * - 'F' -> Ausente / Ausencia
 * - 'J' (o 'E') -> Excusa
 */
export function mapearEstadoDbAPrimaria(dbStatus?: string | null): CodigoAsistenciaPrimaria {
    if (!dbStatus || dbStatus === 'P') return 'P';
    if (dbStatus === 'A' || dbStatus === 'T') return 'T';
    if (dbStatus === 'F') return 'A';
    if (dbStatus === 'J' || dbStatus === 'E') return 'E';
    return 'P';
}

/**
 * Determina el año escolar (Agosto de `startYear` a Junio de `endYear`) correspondiente a `refDate`.
 */
export function obtenerAnioEscolarBounds(refDate: Date): {
    startYear: number;
    endYear: number;
    fetchStartIso: string;
    fetchEndIso: string;
    mesesEscolares: MesEscolarConfig[];
} {
    const m = refDate.getMonth();
    const y = refDate.getFullYear();
    // Si estamos entre agosto (7) y diciembre (11) (o julio 6), el año escolar inicia en `y` y termina en `y + 1`.
    // Si estamos entre enero (0) y junio (5), el año escolar inició en `y - 1` y termina en `y`.
    const startYear = m >= 6 ? y : y - 1;
    const endYear = startYear + 1;

    const definicionMeses: Array<{ monthIndex: number; year: number; pagina: 1 | 2 }> = [
        // Primera página: Agosto a Febrero
        { monthIndex: 7, year: startYear, pagina: 1 },  // Agosto
        { monthIndex: 8, year: startYear, pagina: 1 },  // Septiembre
        { monthIndex: 9, year: startYear, pagina: 1 },  // Octubre
        { monthIndex: 10, year: startYear, pagina: 1 }, // Noviembre
        { monthIndex: 11, year: startYear, pagina: 1 }, // Diciembre
        { monthIndex: 0, year: endYear, pagina: 1 },    // Enero
        { monthIndex: 1, year: endYear, pagina: 1 },    // Febrero
        // Segunda página: Marzo a Junio
        { monthIndex: 2, year: endYear, pagina: 2 },    // Marzo
        { monthIndex: 3, year: endYear, pagina: 2 },    // Abril
        { monthIndex: 4, year: endYear, pagina: 2 },    // Mayo
        { monthIndex: 5, year: endYear, pagina: 2 },    // Junio
    ];

    const mesesEscolares: MesEscolarConfig[] = definicionMeses.map(({ monthIndex, year, pagina }) => {
        const mm = String(monthIndex + 1).padStart(2, '0');
        const lastDay = new Date(year, monthIndex + 1, 0).getDate();
        return {
            clave: `${year}-${mm}`,
            nombre: MESES_NOMBRES[monthIndex],
            monthIndex,
            year,
            startIso: `${year}-${mm}-01`,
            endIso: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
            pagina,
        };
    });

    return {
        startYear,
        endYear,
        fetchStartIso: `${startYear}-07-01`,
        fetchEndIso: `${endYear}-07-31`,
        mesesEscolares,
    };
}

/**
 * Construye las semanas laborables (Lunes a Viernes) de un mes.
 * La 5ta. semana se incluye ÚNICAMENTE cuando el calendario del mes requiere 5 bloques de lunes a viernes.
 */
export function construirSemanasMesPrimaria(year: number, monthIndex: number): SemanaMensualPrimaria[] {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const mm = String(monthIndex + 1).padStart(2, '0');

    const crearSlotsVacios = (): [
        DiaLaborableSlot,
        DiaLaborableSlot,
        DiaLaborableSlot,
        DiaLaborableSlot,
        DiaLaborableSlot
    ] => [
        { diaSemanaIndex: 0, diaSemanaNombre: 'Lunes', diaMes: null, fechaIso: null },
        { diaSemanaIndex: 1, diaSemanaNombre: 'Martes', diaMes: null, fechaIso: null },
        { diaSemanaIndex: 2, diaSemanaNombre: 'Miércoles', diaMes: null, fechaIso: null },
        { diaSemanaIndex: 3, diaSemanaNombre: 'Jueves', diaMes: null, fechaIso: null },
        { diaSemanaIndex: 4, diaSemanaNombre: 'Viernes', diaMes: null, fechaIso: null },
    ];

    const bloques: Array<[DiaLaborableSlot, DiaLaborableSlot, DiaLaborableSlot, DiaLaborableSlot, DiaLaborableSlot]> = [];
    let actual = crearSlotsVacios();
    let tieneDiasEnActual = false;

    for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(year, monthIndex, d, 12, 0, 0);
        const dow = dateObj.getDay(); // 0 = Dom, 1 = Lun .. 5 = Vie, 6 = Sáb
        if (dow >= 1 && dow <= 5) {
            if (dow === 1 && tieneDiasEnActual) {
                bloques.push(actual);
                actual = crearSlotsVacios();
                tieneDiasEnActual = false;
            }
            const slotIdx = dow - 1;
            const dd = String(d).padStart(2, '0');
            actual[slotIdx] = {
                diaSemanaIndex: slotIdx,
                diaSemanaNombre: DIAS_LABORABLES[slotIdx],
                diaMes: d,
                fechaIso: `${year}-${mm}-${dd}`,
            };
            tieneDiasEnActual = true;
        }
    }

    if (tieneDiasEnActual) {
        bloques.push(actual);
    }

    // Garantizar mínimo 4 semanas (y 5 únicamente cuando el calendario del mes lo requiera)
    while (bloques.length < 4) {
        bloques.push(crearSlotsVacios());
    }

    const semanasVisibles = bloques.slice(0, 5);
    return semanasVisibles.map((dias, idx) => ({
        numero: (idx + 1) as 1 | 2 | 3 | 4 | 5,
        etiqueta: ETIQUETAS_SEMANAS[idx],
        dias,
    }));
}

/**
 * Deduplica sesiones por `fecha` ('YYYY-MM-DD') para evitar duplicar registros
 * si existiera más de una sesión guardada en el mismo día.
 */
export function deduplicarSesionesPorFecha(
    sesiones: Array<{ id: string; fecha: string }>,
    excepciones: Array<{ sesion_id: string; estudiante_id: number; estado: string }>
): {
    fechasUnicas: string[];
    estadoPorFechaYEstudiante: Map<string, Map<number, CodigoAsistenciaPrimaria>>;
} {
    const excPorSesion = new Map<string, Array<{ estudiante_id: number; estado: string }>>();
    for (const exc of excepciones) {
        const arr = excPorSesion.get(exc.sesion_id) || [];
        arr.push(exc);
        excPorSesion.set(exc.sesion_id, arr);
    }

    const estadoPorFechaYEstudiante = new Map<string, Map<number, CodigoAsistenciaPrimaria>>();
    for (const ses of sesiones) {
        if (!ses?.fecha) continue;
        let mapaEst = estadoPorFechaYEstudiante.get(ses.fecha);
        if (!mapaEst) {
            mapaEst = new Map<number, CodigoAsistenciaPrimaria>();
            estadoPorFechaYEstudiante.set(ses.fecha, mapaEst);
        }
        const excs = excPorSesion.get(ses.id) || [];
        for (const exc of excs) {
            mapaEst.set(Number(exc.estudiante_id), mapearEstadoDbAPrimaria(exc.estado));
        }
    }

    const fechasUnicas = Array.from(estadoPorFechaYEstudiante.keys()).sort((a, b) => a.localeCompare(b));
    return { fechasUnicas, estadoPorFechaYEstudiante };
}

/**
 * Calcula los porcentajes anuales de asistencia y ausencia para Primaria:
 * - Porcentaje de asistencia = (Total de días asistidos / Total de días trabajados) * 100
 * - Porcentaje de ausencia = (Total de días de ausencia / Total de días trabajados) * 100
 * - No calcula porcentajes cuando el total de días trabajados es 0 (evita división entre cero).
 * - No cuenta tardanzas como ausencias.
 * - No cuenta excusas como días de asistencia.
 */
export function calcularPorcentajesAnualesPrimaria(
    totalAsistencia: number,
    totalAusencia: number,
    totalDiasTrabajados: number
): { asistencia: number | null; ausencia: number | null } {
    if (!Number.isFinite(totalDiasTrabajados) || totalDiasTrabajados <= 0) {
        return { asistencia: null, ausencia: null };
    }
    const pctAsistencia = Math.round((totalAsistencia / totalDiasTrabajados) * 100);
    const pctAusencia = Math.round((totalAusencia / totalDiasTrabajados) * 100);
    return {
        asistencia: Math.max(0, Math.min(100, pctAsistencia)),
        ausencia: Math.max(0, Math.min(100, pctAusencia)),
    };
}

/* ═════════════════════════════════════════════════════════════════════════
   4. COMPONENTE VISUAL DE CONTROL DE ASISTENCIA PARA PRIMARIA
   ═════════════════════════════════════════════════════════════════════════ */

interface PrimariaAttendanceReportProps {
    curso: Curso;
    cursoDocenteId: number;
    currentDate: Date;
    courseStudents: Estudiante[];
    userId?: string | null;
}

const codigoColorClass: Record<CodigoAsistenciaPrimaria, string> = {
    P: 'text-[#204a25] font-bold',
    T: 'text-[#b45309] font-bold',
    A: 'text-[#b91c1c] font-bold',
    E: 'text-[#1d4ed8] font-bold',
};

export const PrimariaAttendanceReport: React.FC<PrimariaAttendanceReportProps> = ({
    curso,
    cursoDocenteId,
    currentDate,
    courseStudents,
    userId,
}) => {
    const [vistaActiva, setVistaActiva] = useState<'todo' | 'mensual' | 'anual'>('todo');
    const [mostrarNombres, setMostrarNombres] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sesionesAnuales, setSesionesAnuales] = useState<Array<{ id: string; fecha: string }>>([]);
    const [excepcionesAnuales, setExcepcionesAnuales] = useState<
        Array<{ sesion_id: string; estudiante_id: number; estado: string }>
    >([]);

    // Garantizar que los estudiantes del curso estén hidratados desde caché / Supabase
    useEffect(() => {
        if (userId && curso?.id) {
            void ensureCourseStudentsSWR(userId, curso.centroId || null, curso.id);
        }
    }, [userId, curso?.id, curso?.centroId]);

    const anioEscolar = useMemo(() => obtenerAnioEscolarBounds(currentDate), [currentDate]);

    // Consulta de solo lectura de las sesiones del año escolar para el curso seleccionado
    useEffect(() => {
        if (!cursoDocenteId) return;
        let isCancelled = false;

        const cargarAsistenciaAnual = async () => {
            setIsLoading(true);
            try {
                const { data: sesData, error: sesError } = await supabase
                    .from('asistencia_sesiones')
                    .select('id, fecha')
                    .eq('curso_docente_id', cursoDocenteId)
                    .gte('fecha', anioEscolar.fetchStartIso)
                    .lte('fecha', anioEscolar.fetchEndIso)
                    .order('fecha', { ascending: true });

                if (isCancelled) return;
                if (sesError) throw sesError;

                const sesionesLimpias = (sesData || []) as Array<{ id: string; fecha: string }>;
                setSesionesAnuales(sesionesLimpias);

                if (sesionesLimpias.length > 0) {
                    const sessionIds = sesionesLimpias.map(s => s.id);
                    const { data: excData, error: excError } = await supabase
                        .from('asistencia_excepciones')
                        .select('sesion_id, estudiante_id, estado')
                        .in('sesion_id', sessionIds);

                    if (isCancelled) return;
                    if (excError) throw excError;
                    setExcepcionesAnuales(
                        (excData || []) as Array<{ sesion_id: string; estudiante_id: number; estado: string }>
                    );
                } else {
                    setExcepcionesAnuales([]);
                }
            } catch (err) {
                if (!isCancelled) {
                    console.error('Error al consultar asistencia de primaria:', err);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        void cargarAsistenciaAnual();
        return () => {
            isCancelled = true;
        };
    }, [cursoDocenteId, anioEscolar.fetchStartIso, anioEscolar.fetchEndIso]);

    // Deduplicación global por fecha
    const datosDeduplicados = useMemo(
        () => deduplicarSesionesPorFecha(sesionesAnuales, excepcionesAnuales),
        [sesionesAnuales, excepcionesAnuales]
    );

    // ── A. CÁLCULO DEL CONTROL MENSUAL (Mes seleccionado) ──
    const datosMensuales = useMemo(() => {
        const year = currentDate.getFullYear();
        const monthIndex = currentDate.getMonth();
        const mm = String(monthIndex + 1).padStart(2, '0');
        const prefijoMes = `${year}-${mm}-`;

        const semanas = construirSemanasMesPrimaria(year, monthIndex);
        const fechasTrabajadasMes = datosDeduplicados.fechasUnicas.filter(f => f.startsWith(prefijoMes));
        const diasTrabajadosMes = fechasTrabajadasMes.length;

        const filas: FilaMensualEstudiantePrimaria[] = courseStudents.map((est, idx) => {
            const numeroOrden = est.numeroLista != null ? est.numeroLista : idx + 1;
            const porFecha: Record<string, CodigoAsistenciaPrimaria> = {};
            let presente = 0;
            let tardanza = 0;
            let ausente = 0;
            let excusa = 0;

            for (const fecha of fechasTrabajadasMes) {
                const mapaEst = datosDeduplicados.estadoPorFechaYEstudiante.get(fecha);
                const codigo: CodigoAsistenciaPrimaria = mapaEst?.get(est.id) || 'P';
                porFecha[fecha] = codigo;

                if (codigo === 'P') presente++;
                else if (codigo === 'T') tardanza++;
                else if (codigo === 'A') ausente++;
                else if (codigo === 'E') excusa++;
            }

            return {
                estudiante: est,
                numeroOrden,
                porFecha,
                resumen: { presente, tardanza, ausente, excusa },
            };
        });

        return {
            nombreMes: MESES_NOMBRES[monthIndex] || '',
            year,
            semanas,
            diasTrabajadosMes,
            filas,
        };
    }, [currentDate, datosDeduplicados, courseStudents]);

    // ── B. CÁLCULO DEL RESUMEN ANUAL (Agosto a Febrero | Marzo a Junio) ──
    const datosAnuales = useMemo(() => {
        const mesesPagina1 = anioEscolar.mesesEscolares.filter(m => m.pagina === 1);
        const mesesPagina2 = anioEscolar.mesesEscolares.filter(m => m.pagina === 2);

        const fechasPorMes = new Map<string, string[]>();
        let totalDiasTrabajadosAnual = 0;

        for (const mes of anioEscolar.mesesEscolares) {
            const prefijo = `${mes.clave}-`;
            const fechasMes = datosDeduplicados.fechasUnicas.filter(f => f.startsWith(prefijo));
            fechasPorMes.set(mes.clave, fechasMes);
            totalDiasTrabajadosAnual += fechasMes.length;
        }

        const filas: FilaAnualEstudiantePrimaria[] = courseStudents.map((est, idx) => {
            const numeroOrden = est.numeroLista != null ? est.numeroLista : idx + 1;
            const porMes: FilaAnualEstudiantePrimaria['porMes'] = {};

            let totalAsistencia = 0;
            let totalTardanza = 0;
            let totalAusencia = 0;
            let totalExcusa = 0;

            for (const mes of anioEscolar.mesesEscolares) {
                const fechasMes = fechasPorMes.get(mes.clave) || [];
                let asistencia = 0;
                let tardanza = 0;
                let ausencia = 0;
                let excusa = 0;

                for (const fecha of fechasMes) {
                    const mapaEst = datosDeduplicados.estadoPorFechaYEstudiante.get(fecha);
                    const codigo: CodigoAsistenciaPrimaria = mapaEst?.get(est.id) || 'P';
                    if (codigo === 'P') asistencia++;
                    else if (codigo === 'T') tardanza++;
                    else if (codigo === 'A') ausencia++;
                    else if (codigo === 'E') excusa++;
                }

                porMes[mes.clave] = {
                    diasTrabajadosMes: fechasMes.length,
                    asistencia,
                    tardanza,
                    ausencia,
                    excusa,
                };

                totalAsistencia += asistencia;
                totalTardanza += tardanza;
                totalAusencia += ausencia;
                totalExcusa += excusa;
            }

            const porcentajeAnual = calcularPorcentajesAnualesPrimaria(
                totalAsistencia,
                totalAusencia,
                totalDiasTrabajadosAnual
            );

            return {
                estudiante: est,
                numeroOrden,
                porMes,
                resumenAnual: {
                    asistencia: totalAsistencia,
                    tardanza: totalTardanza,
                    ausencia: totalAusencia,
                    excusa: totalExcusa,
                },
                porcentajeAnual,
            };
        });

        return {
            mesesPagina1,
            mesesPagina2,
            totalDiasTrabajadosAnual,
            filas,
        };
    }, [anioEscolar, datosDeduplicados, courseStudents]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex justify-center items-center p-12 bg-white border border-[#e6e8e2] rounded-xl">
                <div className="w-8 h-8 border-4 border-[#689c63] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (courseStudents.length === 0) {
        return (
            <div className="flex-1 flex justify-center items-center p-12 text-center text-[#58625a] bg-white border border-[#e6e8e2] rounded-xl">
                No hay estudiantes registrados en este curso de primaria.
            </div>
        );
    }

    return (
        <div className="primaria-attendance-root flex-1 flex flex-col min-h-0">
            <style>{`
                .primaria-register-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1.5px solid #3f3f3f;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #1f2421;
                    table-layout: fixed;
                }
                .primaria-register-table th,
                .primaria-register-table td {
                    border: 1px solid #525252;
                    text-align: center;
                    vertical-align: middle;
                    padding: 1px 2px;
                }
                .primaria-vert-cell {
                    height: 78px;
                    padding: 4px 1px !important;
                    vertical-align: bottom !important;
                }
                .primaria-vert-label {
                    writing-mode: vertical-rl;
                    transform: rotate(180deg);
                    display: inline-block;
                    white-space: nowrap;
                    font-size: 10px;
                    line-height: 1;
                    letter-spacing: 0.1px;
                    color: #262626;
                }
                @media print {
                    @page {
                        size: landscape;
                        margin: 7mm;
                    }
                    *, *::before, *::after {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body > *:not(.cielo-attendance-report-portal) {
                        display: none !important;
                    }
                    .cielo-attendance-report-portal {
                        position: static !important;
                        inset: auto !important;
                        background: #ffffff !important;
                        padding: 0 !important;
                        display: block !important;
                        overflow: visible !important;
                    }
                    .cielo-attendance-report-modal-box {
                        max-width: none !important;
                        max-height: none !important;
                        width: 100% !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #ffffff !important;
                        overflow: visible !important;
                    }
                    .cielo-attendance-report-scroll {
                        overflow: visible !important;
                        padding: 0 !important;
                    }
                    .no-print-primaria {
                        display: none !important;
                    }
                    .primaria-print-page {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 2mm 0 !important;
                        margin: 0 !important;
                        page-break-after: always;
                        break-after: page;
                        page-break-inside: avoid;
                    }
                    .primaria-print-page:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                }
            `}</style>

            {/* Barra de herramientas del informe de Primaria (oculta en impresión) */}
            <div className="no-print-primaria flex flex-wrap items-center justify-between gap-2 pb-3 shrink-0">
                <div className="flex items-center gap-1.5 bg-[#f4f6f2] p-1 rounded-xl border border-[#e6e8e2]">
                    <button
                        type="button"
                        onClick={() => setVistaActiva('todo')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            vistaActiva === 'todo'
                                ? 'bg-white text-[#263128] shadow-2xs border border-[#dce2d8]'
                                : 'text-[#58625a] hover:text-[#263128]'
                        }`}
                    >
                        Control mensual + Resumen anual
                    </button>
                    <button
                        type="button"
                        onClick={() => setVistaActiva('mensual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            vistaActiva === 'mensual'
                                ? 'bg-white text-[#263128] shadow-2xs border border-[#dce2d8]'
                                : 'text-[#58625a] hover:text-[#263128]'
                        }`}
                    >
                        Control mensual
                    </button>
                    <button
                        type="button"
                        onClick={() => setVistaActiva('anual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            vistaActiva === 'anual'
                                ? 'bg-white text-[#263128] shadow-2xs border border-[#dce2d8]'
                                : 'text-[#58625a] hover:text-[#263128]'
                        }`}
                    >
                        Resumen anual (2 páginas)
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setMostrarNombres(prev => !prev)}
                        className="px-3 py-1.5 rounded-xl border border-[#e6e8e2] bg-white hover:bg-[#f9faf8] text-[#263128] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Mostrar u ocultar columna de referencia con el nombre del estudiante en pantalla"
                    >
                        {mostrarNombres ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span>{mostrarNombres ? 'Ocultar nombres' : 'Ver nombres'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-3.5 py-1.5 rounded-xl bg-[#263128] hover:bg-[#1b231c] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                        <Printer size={14} />
                        <span>Imprimir</span>
                    </button>
                </div>
            </div>

            {/* Contenedor de páginas del registro de Primaria */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-0.5">
                {/* ═══════════════════════════════════════════════════════════════
                    HOJA 1: CONTROL DE ASISTENCIA Y PUNTUALIDAD (MENSUAL)
                   ═══════════════════════════════════════════════════════════════ */}
                {(vistaActiva === 'todo' || vistaActiva === 'mensual') && (
                    <section
                        data-testid="primaria-control-mensual"
                        className="primaria-print-page bg-white border border-[#dcded8] rounded-xl p-5 sm:p-6 shadow-2xs overflow-x-auto"
                    >
                        <div className="min-w-205">
                            <h3 className="text-center text-lg sm:text-xl font-black text-[#1f2421] tracking-tight mb-3">
                                Control de asistencia y puntualidad
                            </h3>

                            <div className="flex items-end justify-between gap-6 mb-3 text-xs sm:text-sm text-[#262626]">
                                <div className="flex items-end flex-1">
                                    <span className="font-medium shrink-0 mr-1.5">Mes:</span>
                                    <span className="flex-1 border-b border-[#333] font-bold px-2 pb-0.5 capitalize">
                                        {datosMensuales.nombreMes} {datosMensuales.year}
                                    </span>
                                </div>
                                <div className="flex items-end flex-1">
                                    <span className="font-medium shrink-0 mr-1.5">Días trabajados:</span>
                                    <span className="flex-1 border-b border-[#333] font-bold px-2 pb-0.5">
                                        {datosMensuales.diasTrabajadosMes}
                                    </span>
                                </div>
                            </div>

                            <table className="primaria-register-table text-[11px]">
                                <colgroup>
                                    <col style={{ width: '34px' }} />
                                    {mostrarNombres && <col className="no-print-primaria" style={{ width: '145px' }} />}
                                    {datosMensuales.semanas.map(sem =>
                                        sem.dias.map((_, dIdx) => <col key={`col-w${sem.numero}-${dIdx}`} />)
                                    )}
                                    <col style={{ width: '28px' }} />
                                    <col style={{ width: '28px' }} />
                                    <col style={{ width: '28px' }} />
                                    <col style={{ width: '28px' }} />
                                </colgroup>
                                <thead>
                                    <tr className="bg-white">
                                        <th rowSpan={2} className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Nº de orden</span>
                                        </th>
                                        {mostrarNombres && (
                                            <th
                                                rowSpan={2}
                                                className="no-print-primaria text-left px-2 font-bold text-[11px] text-[#262626]"
                                            >
                                                Estudiante
                                            </th>
                                        )}
                                        {datosMensuales.semanas.map(sem => (
                                            <th
                                                key={`head-sem-${sem.numero}`}
                                                colSpan={5}
                                                className="py-1.5 text-[11px] font-bold text-[#262626]"
                                            >
                                                {sem.etiqueta}
                                            </th>
                                        ))}
                                        <th colSpan={4} className="py-1 px-1 text-[11px] font-bold text-[#262626] leading-tight">
                                            Resumen del
                                            <br />
                                            mes
                                        </th>
                                    </tr>
                                    <tr className="bg-white">
                                        {datosMensuales.semanas.map(sem =>
                                            sem.dias.map((diaSlot, dIdx) => (
                                                <th
                                                    key={`sub-sem-${sem.numero}-${dIdx}`}
                                                    className="primaria-vert-cell"
                                                >
                                                    <span className="primaria-vert-label font-normal">
                                                        {diaSlot.diaSemanaNombre}
                                                    </span>
                                                </th>
                                            ))
                                        )}
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-normal">Presente</span>
                                        </th>
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-normal">Tardanza</span>
                                        </th>
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-normal">Ausente</span>
                                        </th>
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-normal">Excusa</span>
                                        </th>
                                    </tr>
                                    {/* Fila Fecha */}
                                    <tr className="bg-white h-6">
                                        <th className="text-[9px] font-bold text-[#262626] px-0.5">Fecha</th>
                                        {mostrarNombres && <th className="no-print-primaria" />}
                                        {datosMensuales.semanas.map(sem =>
                                            sem.dias.map((diaSlot, dIdx) => (
                                                <th
                                                    key={`fecha-sem-${sem.numero}-${dIdx}`}
                                                    className="text-[10px] font-semibold text-[#333]"
                                                >
                                                    {diaSlot.diaMes ?? ''}
                                                </th>
                                            ))
                                        )}
                                        <th />
                                        <th />
                                        <th />
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {datosMensuales.filas.map((fila, idx) => {
                                        const isOddRow = idx % 2 === 0;
                                        const rowBg = isOddRow ? 'bg-[#efefef]' : 'bg-white';
                                        const fullName = `${fila.estudiante.nombre || ''} ${fila.estudiante.apellido || ''}`.trim();
                                        const hasMonthRecords = datosMensuales.diasTrabajadosMes > 0;

                                        return (
                                            <tr
                                                key={fila.estudiante.id}
                                                className={`${rowBg} h-6 hover:bg-[#e5efe3] transition-colors`}
                                                title={fullName}
                                            >
                                                <td className="font-semibold text-[#262626] text-[11px]">
                                                    {fila.numeroOrden}
                                                </td>
                                                {mostrarNombres && (
                                                    <td className="no-print-primaria text-left px-2 font-semibold text-[11px] text-[#263128] truncate">
                                                        {fullName}
                                                    </td>
                                                )}
                                                {datosMensuales.semanas.map(sem =>
                                                    sem.dias.map((diaSlot, dIdx) => {
                                                        const cod = diaSlot.fechaIso
                                                            ? fila.porFecha[diaSlot.fechaIso]
                                                            : undefined;
                                                        return (
                                                            <td
                                                                key={`cell-${fila.estudiante.id}-w${sem.numero}-${dIdx}`}
                                                                className={`text-[10.5px] ${cod ? codigoColorClass[cod] : ''}`}
                                                            >
                                                                {cod || ''}
                                                            </td>
                                                        );
                                                    })
                                                )}
                                                <td className="font-bold text-[#204a25]">
                                                    {hasMonthRecords ? fila.resumen.presente : ''}
                                                </td>
                                                <td className="font-bold text-[#b45309]">
                                                    {hasMonthRecords ? fila.resumen.tardanza : ''}
                                                </td>
                                                <td className="font-bold text-[#b91c1c]">
                                                    {hasMonthRecords ? fila.resumen.ausente : ''}
                                                </td>
                                                <td className="font-bold text-[#1d4ed8]">
                                                    {hasMonthRecords ? fila.resumen.excusa : ''}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    HOJA 2: RESUMEN ANUAL DE ASISTENCIA — PRIMERA PÁGINA (AGOSTO A FEBRERO)
                   ═══════════════════════════════════════════════════════════════ */}
                {(vistaActiva === 'todo' || vistaActiva === 'anual') && (
                    <section
                        data-testid="primaria-resumen-anual-pagina-1"
                        className="primaria-print-page bg-white border border-[#dcded8] rounded-xl p-5 sm:p-6 shadow-2xs overflow-x-auto"
                    >
                        <div className="min-w-205">
                            <h3 className="text-center text-lg sm:text-xl font-black text-[#1f2421] tracking-tight mb-3">
                                Resumen anual de asistencia
                            </h3>

                            <div className="flex items-end justify-between gap-6 mb-3 text-xs sm:text-sm text-[#262626]">
                                <div className="flex items-end max-w-md w-full">
                                    <span className="font-medium shrink-0 mr-1.5">Días trabajados:</span>
                                    <span className="flex-1 border-b border-[#333] font-bold px-2 pb-0.5">
                                        {datosAnuales.totalDiasTrabajadosAnual}
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold text-[#6b7280]">
                                    Página 1 · Agosto a Febrero ({anioEscolar.startYear}–{anioEscolar.endYear})
                                </span>
                            </div>

                            <table className="primaria-register-table text-[11px]">
                                <colgroup>
                                    <col style={{ width: '34px' }} />
                                    {mostrarNombres && <col className="no-print-primaria" style={{ width: '145px' }} />}
                                    {datosAnuales.mesesPagina1.map(m =>
                                        [0, 1, 2, 3].map(i => <col key={`col-p1-${m.clave}-${i}`} />)
                                    )}
                                </colgroup>
                                <thead>
                                    <tr className="bg-white">
                                        <th rowSpan={2} className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Nº de orden</span>
                                        </th>
                                        {mostrarNombres && (
                                            <th
                                                rowSpan={2}
                                                className="no-print-primaria text-left px-2 font-bold text-[11px] text-[#262626]"
                                            >
                                                Estudiante
                                            </th>
                                        )}
                                        {datosAnuales.mesesPagina1.map(mes => (
                                            <th
                                                key={`p1-head-${mes.clave}`}
                                                colSpan={4}
                                                className="py-1.5 text-[11.5px] font-normal text-[#262626]"
                                            >
                                                {mes.nombre}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="bg-white">
                                        {datosAnuales.mesesPagina1.map(mes => (
                                            <React.Fragment key={`p1-sub-${mes.clave}`}>
                                                <th className="primaria-vert-cell">
                                                    <span className="primaria-vert-label font-normal">Asistencia</span>
                                                </th>
                                                <th className="primaria-vert-cell">
                                                    <span className="primaria-vert-label font-normal">Tardanza</span>
                                                </th>
                                                <th className="primaria-vert-cell">
                                                    <span className="primaria-vert-label font-normal">Ausencia</span>
                                                </th>
                                                <th className="primaria-vert-cell">
                                                    <span className="primaria-vert-label font-normal">Excusa</span>
                                                </th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {datosAnuales.filas.map((fila, idx) => {
                                        const isOddRow = idx % 2 === 0;
                                        const rowBg = isOddRow ? 'bg-[#efefef]' : 'bg-white';
                                        const fullName = `${fila.estudiante.nombre || ''} ${fila.estudiante.apellido || ''}`.trim();

                                        return (
                                            <tr
                                                key={`p1-row-${fila.estudiante.id}`}
                                                className={`${rowBg} h-6 hover:bg-[#e5efe3] transition-colors`}
                                                title={fullName}
                                            >
                                                <td className="font-semibold text-[#262626] text-[11px]">
                                                    {fila.numeroOrden}
                                                </td>
                                                {mostrarNombres && (
                                                    <td className="no-print-primaria text-left px-2 font-semibold text-[11px] text-[#263128] truncate">
                                                        {fullName}
                                                    </td>
                                                )}
                                                {datosAnuales.mesesPagina1.map(mes => {
                                                    const mData = fila.porMes[mes.clave];
                                                    const activo = mData && mData.diasTrabajadosMes > 0;
                                                    return (
                                                        <React.Fragment key={`p1-cell-${fila.estudiante.id}-${mes.clave}`}>
                                                            <td className="font-medium text-[#204a25]">
                                                                {activo ? mData.asistencia : ''}
                                                            </td>
                                                            <td className="font-medium text-[#b45309]">
                                                                {activo ? mData.tardanza : ''}
                                                            </td>
                                                            <td className="font-medium text-[#b91c1c]">
                                                                {activo ? mData.ausencia : ''}
                                                            </td>
                                                            <td className="font-medium text-[#1d4ed8]">
                                                                {activo ? mData.excusa : ''}
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    HOJA 3: RESUMEN ANUAL DE ASISTENCIA — SEGUNDA PÁGINA
                    (MARZO A JUNIO + RESUMEN ANUAL + PORCENTAJE ANUAL)
                   ═══════════════════════════════════════════════════════════════ */}
                {(vistaActiva === 'todo' || vistaActiva === 'anual') && (
                    <section
                        data-testid="primaria-resumen-anual-pagina-2"
                        className="primaria-print-page bg-white border border-[#dcded8] rounded-xl p-5 sm:p-6 shadow-2xs overflow-x-auto"
                    >
                        <div className="min-w-190">
                            <h3 className="text-center text-lg sm:text-xl font-black text-[#1f2421] tracking-tight mb-3">
                                Resumen anual de asistencia
                            </h3>

                            <div className="flex items-end justify-between gap-6 mb-3 text-xs sm:text-sm text-[#262626]">
                                <div className="flex items-end max-w-md w-full">
                                    <span className="font-medium shrink-0 mr-1.5">Días trabajados:</span>
                                    <span className="flex-1 border-b border-[#333] font-bold px-2 pb-0.5">
                                        {datosAnuales.totalDiasTrabajadosAnual}
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold text-[#6b7280]">
                                    Página 2 · Marzo a Junio y Totales Anuales ({anioEscolar.startYear}–{anioEscolar.endYear})
                                </span>
                            </div>

                            <table className="primaria-register-table text-[11px]">
                                <colgroup>
                                    <col style={{ width: '34px' }} />
                                    {mostrarNombres && <col className="no-print-primaria" style={{ width: '145px' }} />}
                                    {datosAnuales.mesesPagina2.map(m =>
                                        [0, 1, 2, 3].map(i => <col key={`col-p2-${m.clave}-${i}`} />)
                                    )}
                                    <col style={{ width: '34px' }} />
                                    <col style={{ width: '34px' }} />
                                    <col style={{ width: '34px' }} />
                                    <col style={{ width: '34px' }} />
                                    <col style={{ width: '42px' }} />
                                    <col style={{ width: '42px' }} />
                                </colgroup>
                                <thead>
                                    <tr className="bg-white">
                                        <th rowSpan={2} className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Nº de orden</span>
                                        </th>
                                        {mostrarNombres && (
                                            <th
                                                rowSpan={2}
                                                className="no-print-primaria text-left px-2 font-bold text-[11px] text-[#262626]"
                                            >
                                                Estudiante
                                            </th>
                                        )}
                                        {datosAnuales.mesesPagina2.map(mes => (
                                            <th
                                                key={`p2-head-${mes.clave}`}
                                                colSpan={4}
                                                className="py-1.5 text-[11.5px] font-normal text-[#262626]"
                                            >
                                                {mes.nombre}
                                            </th>
                                        ))}
                                        <th colSpan={4} className="py-1.5 text-[11px] font-bold text-[#262626] leading-tight">
                                            Resumen
                                            <br />
                                            anual
                                        </th>
                                        <th colSpan={2} className="py-1.5 text-[11px] font-bold text-[#262626] leading-tight">
                                            Porcentaje
                                            <br />
                                            anual
                                        </th>
                                    </tr>
                                    <tr className="bg-white">
                                        {datosAnuales.mesesPagina2.map(mes => (
                                            <React.Fragment key={`p2-sub-${mes.clave}`}>
                                                <th className="primaria-vert-cell">
                                                    <span className="primaria-vert-label font-normal">Asistencia</span>
                                                </th>
                                                <th className="primaria-vert-cell">
                                                    <span className="primaria-vert-label font-normal">Tardanza</span>
                                                </th>
                                                <th className="primaria-vert-cell">
                                                    <span className="primaria-vert-label font-normal">Ausencia</span>
                                                </th>
                                                <th className="primaria-vert-cell">
                                                    <span className="primaria-vert-label font-normal">Excusa</span>
                                                </th>
                                            </React.Fragment>
                                        ))}
                                        {/* Subcolumnas de Resumen anual */}
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Asistencia</span>
                                        </th>
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Tardanza</span>
                                        </th>
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Ausencia</span>
                                        </th>
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Excusa</span>
                                        </th>
                                        {/* Subcolumnas de Porcentaje anual */}
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Asistencia</span>
                                        </th>
                                        <th className="primaria-vert-cell">
                                            <span className="primaria-vert-label font-semibold">Ausencia</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {datosAnuales.filas.map((fila, idx) => {
                                        const isOddRow = idx % 2 === 0;
                                        const rowBg = isOddRow ? 'bg-[#efefef]' : 'bg-white';
                                        const fullName = `${fila.estudiante.nombre || ''} ${fila.estudiante.apellido || ''}`.trim();
                                        const tieneAnual = datosAnuales.totalDiasTrabajadosAnual > 0;

                                        return (
                                            <tr
                                                key={`p2-row-${fila.estudiante.id}`}
                                                className={`${rowBg} h-6 hover:bg-[#e5efe3] transition-colors`}
                                                title={fullName}
                                            >
                                                <td className="font-semibold text-[#262626] text-[11px]">
                                                    {fila.numeroOrden}
                                                </td>
                                                {mostrarNombres && (
                                                    <td className="no-print-primaria text-left px-2 font-semibold text-[11px] text-[#263128] truncate">
                                                        {fullName}
                                                    </td>
                                                )}
                                                {datosAnuales.mesesPagina2.map(mes => {
                                                    const mData = fila.porMes[mes.clave];
                                                    const activo = mData && mData.diasTrabajadosMes > 0;
                                                    return (
                                                        <React.Fragment key={`p2-cell-${fila.estudiante.id}-${mes.clave}`}>
                                                            <td className="font-medium text-[#204a25]">
                                                                {activo ? mData.asistencia : ''}
                                                            </td>
                                                            <td className="font-medium text-[#b45309]">
                                                                {activo ? mData.tardanza : ''}
                                                            </td>
                                                            <td className="font-medium text-[#b91c1c]">
                                                                {activo ? mData.ausencia : ''}
                                                            </td>
                                                            <td className="font-medium text-[#1d4ed8]">
                                                                {activo ? mData.excusa : ''}
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                {/* Totales de Resumen anual */}
                                                <td className="font-bold text-[#204a25]">
                                                    {tieneAnual ? fila.resumenAnual.asistencia : ''}
                                                </td>
                                                <td className="font-bold text-[#b45309]">
                                                    {tieneAnual ? fila.resumenAnual.tardanza : ''}
                                                </td>
                                                <td className="font-bold text-[#b91c1c]">
                                                    {tieneAnual ? fila.resumenAnual.ausencia : ''}
                                                </td>
                                                <td className="font-bold text-[#1d4ed8]">
                                                    {tieneAnual ? fila.resumenAnual.excusa : ''}
                                                </td>
                                                {/* Porcentaje anual */}
                                                <td className="font-bold text-[#204a25]">
                                                    {fila.porcentajeAnual.asistencia !== null
                                                        ? `${fila.porcentajeAnual.asistencia}%`
                                                        : ''}
                                                </td>
                                                <td className="font-bold text-[#b91c1c]">
                                                    {fila.porcentajeAnual.ausencia !== null
                                                        ? `${fila.porcentajeAnual.ausencia}%`
                                                        : ''}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};
