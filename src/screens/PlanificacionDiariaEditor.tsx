import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, X, Plus, Paintbrush, BookOpen, FileDown } from 'lucide-react';
import type { AppState, Secuencia, Curso, Centro } from '../types';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { getValidSecuencia, saveSecuencia } from '../cache/secuenciaCache';
import { getValidCentro, saveCentroCache } from '../cache/centroCache';
import { getValidPerfil } from '../cache/perfilCache';
import { estudiantesDelCurso } from '../utils/aislamiento';
import { getAIAIProvider, isProviderConfigured, providerDisplayName, saveAIKey } from '../lib/aiConfig';
import { getPlanificacionDiariaTemplate, determinarCiclo } from '../templates/planificacion-diaria';
import {
    extraerContextoPlanificacion,
    contextoSuficiente,
    generarSugerenciasPedagogicas,
    asignarIdsDeCeldas,
    celdaRequiereConfirmacion,
    escribirEnCelda,
    PLACEHOLDERS_PLANTILLA,
    type CategoriaSugerencia as CategoriaSugerenciaType
} from '../lib/aiPlanificacion';
import { useCombinacionesCurriculares } from '../hooks/useCombinacionesCurriculares';
import { useCurriculumPeriodo } from '../hooks/useCurriculumPeriodo';
import type { ItemCurricular } from '../hooks/useCurriculumPeriodo';
import { useActividadesPeriodo } from '../hooks/useActividadesPeriodo';
import { PERIODOS_ACADEMICOS } from '../cache/academicCache';
import { getAsignaturaNombre } from '../constants/asignaturas';
import PanelCurricular from '../components/planificacion/PanelCurricular';
import ModalActividadesContexto from '../components/planificacion/ModalActividadesContexto';
import { descargarPlanificacionDocx } from '../utils/planificacionDocx';
import type { CombinacionCurricular } from '../types/especificaciones';

interface Props {
    state: AppState;
    docenteNombre?: string;
    currentUserProfile?: any;
    session?: any;
    onUpdateSecuencia?: (seq: Secuencia) => Promise<{ success: boolean; error?: any } | void> | void;
    onAddSecuencia?: (seq: Omit<Secuencia, 'id'>) => Promise<Secuencia | null>;
}

function limpiarExpresionesPlantilla(html: string, context?: {
    docente?: string;
    centro?: string;
    codigoCentro?: string;
    asignatura?: string;
    grado?: string;
    seccion?: string;
    fecha?: string;
}): string {
    if (!html) return html;
    let res = html;
    if (context?.docente) {
        res = res.replace(/\$\{data\.docente\}/g, context.docente);
    }
    if (context?.centro) {
        res = res.replace(/\$\{data\.centro\}/g, context.centro);
    }
    if (context?.codigoCentro) {
        res = res.replace(/\$\{data\.codigoCentro\}/g, context.codigoCentro);
    }
    if (context?.asignatura) {
        res = res.replace(/\$\{data\.asignatura\}/g, context.asignatura);
    }
    if (context?.fecha) {
        res = res.replace(/\$\{data\.fecha\}/g, context.fecha);
    }
    res = res.replace(/\$\{data\.grado\}/g, context?.grado || '');
    res = res.replace(/\$\{data\.seccion\}/g, context?.seccion || '');
    res = res.replace(/\$\{data\.[a-zA-Z]+\}/g, '');
    return res;
}

function getCursoLabel(curso?: Curso) {
    if (!curso) return 'Curso sin asignar';
    return `${curso.grado} ${curso.seccion} • ${curso.nombre}`;
}

interface SeccionSugerenciasProps {
    titulo: string;
    items: string[];
    prefijoClave: string;
    insertadas: Set<string>;
    onInsertar: (clave: string, sugerencia: CategoriaSugerenciaType) => void;
    construir: (texto: string) => CategoriaSugerenciaType;
}

function SeccionSugerencias({ titulo, items, prefijoClave, insertadas, onInsertar, construir }: SeccionSugerenciasProps) {
    return (
        <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">{titulo}</h4>
            {items.map((item, i) => {
                const clave = `${prefijoClave}-${i}`;
                return (
                    <ItemSugerencia
                        key={clave}
                        texto={item}
                        insertada={insertadas.has(clave)}
                        onInsertar={() => onInsertar(clave, construir(item))}
                    />
                );
            })}
        </div>
    );
}

interface ItemSugerenciaProps {
    texto: string;
    insertada: boolean;
    onInsertar: () => void;
}

function ItemSugerencia({ texto, insertada, onInsertar }: ItemSugerenciaProps) {
    return (
        <div className={`group flex items-start gap-2 p-3 rounded-xl border transition-colors ${insertada ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-(--border-soft) hover:border-(--primary)/40'}`}>
            <p className="flex-1 text-[11px] font-medium text-(--ink) leading-relaxed">{texto}</p>
            {insertada ? (
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 shrink-0 pt-0.5">Insertada</span>
            ) : (
                <button
                    type="button"
                    onClick={onInsertar}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-(--linen)/50 border border-(--border-soft) text-[9px] font-black uppercase tracking-widest text-(--ink-soft) hover:border-(--primary) hover:text-(--primary) transition-colors"
                    title="Activa la brocha para aplicar esta sugerencia en la celda que elijas"
                >
                    <Plus size={11} /> Insertar
                </button>
            )}
        </div>
    );
}

function obtenerCeldaDestino(target: HTMLElement | null): HTMLElement | null {
    if (!target?.closest) return null;
    const conId = target.closest<HTMLElement>('[data-field-id]');
    if (conId instanceof HTMLElement) return conId;
    const editable = target.closest<HTMLElement>('td.editable, span.editable, [contenteditable="true"]');
    if (editable instanceof HTMLElement) {
        const txt = (editable.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (['inicio', 'desarrollo', 'cierre'].includes(txt)) return null;
        return editable;
    }
    return null;
}

const CURSOR_BROCHA = 'url("/icons/brocha.svg") 8 25, copy';

function escapeHtml(str: string): string {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Formatea contenidos agrupados por su tema/unidad padre, con viñetas */
function formatearContenidosPorUnidad(items: ItemCurricular[]): string {
    if (!items || items.length === 0) return '';

    // Agrupar items por contenidoPadre preservando el orden de inserción
    const mapa = new Map<string, string[]>();
    for (const it of items) {
        const padre = (it.contenidoPadre || '').trim();
        const texto = (it.texto || '').trim();
        if (!texto) continue;

        const clave = padre || '__sin_padre__';
        const lista = mapa.get(clave) ?? [];
        lista.push(texto);
        mapa.set(clave, lista);
    }

    const bloques: string[] = [];

    for (const [padre, lista] of mapa.entries()) {
        if (lista.length === 0) continue;

        // Si la lista tiene un solo item y es idéntico al título del padre (unidad sin desglose)
        if (padre !== '__sin_padre__' && lista.length === 1 && lista[0].toLowerCase() === padre.toLowerCase()) {
            bloques.push(`• ${escapeHtml(lista[0])}`);
            continue;
        }

        const lineasViñetas = lista
            .map((t) => (t.startsWith('•') || t.startsWith('-') ? escapeHtml(t) : `• ${escapeHtml(t)}`))
            .join('<br>');

        if (padre !== '__sin_padre__' && padre.length > 0) {
            const tituloLimpio = padre.replace(/:$/, '');
            bloques.push(`<strong>${escapeHtml(tituloLimpio)}:</strong><br>${lineasViñetas}`);
        } else {
            bloques.push(lineasViñetas);
        }
    }

    return bloques.join('<br><br>');
}

/** Texto aplicable sobre una celda (sugerencia de IA o elemento curricular). */
type SugerenciaAplicable = { tipo: CategoriaSugerenciaType['tipo']; texto: string };

export default function PlanificacionDiariaEditor({
    state,
    docenteNombre: docenteNombreProp,
    currentUserProfile: currentUserProfileProp,
    session: sessionProp,
    onUpdateSecuencia,
    onAddSecuencia
}: Props) {
    const { id } = useParams<{ id: string }>();
    const esPlantilla = id === 'plantilla';
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [seq, setSeq] = useState<Secuencia | null>(null);
    const [localTitulo, setLocalTitulo] = useState('');
    const [localCursoId, setLocalCursoId] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [descargandoWord, setDescargandoWord] = useState(false);
    const [wordError, setWordError] = useState<string | null>(null);
    const sessionStore = useAppStore(s => s.session);
    const session = sessionProp || sessionStore;

    // Respaldo de datos institucionales autónomos desde Supabase
    const [directDocenteNombre, setDirectDocenteNombre] = useState<string>('');
    const [directCentro, setDirectCentro] = useState<Centro | null>(null);

    /* ---------------- Período, currículo y actividades ---------------- */
    const [periodoSel, setPeriodoSel] = useState<string>('P1');
    const [asignaturaSel, setAsignaturaSel] = useState<string>('');
    const [panelCurricular, setPanelCurricular] = useState(false);
    const [modalActividades, setModalActividades] = useState(false);
    const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState<Set<number>>(new Set());
    const [contextoExtra, setContextoExtra] = useState('');

    const combinaciones = useCombinacionesCurriculares();

    /** Cursos realmente vinculados al usuario (curso_docentes ⨝ cursos). */
    const opcionesCurso = useMemo(() => {
        if (combinaciones.length > 0) {
            const mapa = new Map<number, string>();
            for (const c of combinaciones) {
                if (!mapa.has(c.cursoId)) {
                    mapa.set(c.cursoId, `${c.grado} ${c.seccion} • ${c.asignaturaNombre || c.asignatura}`);
                }
            }
            return Array.from(mapa.entries()).map(([id, label]) => ({ id, label }));
        }
        return state.cursos.map(c => ({ id: c.id, label: getCursoLabel(c) }));
    }, [combinaciones, state.cursos]);

    /** Combinaciones (curso + asignatura) del curso seleccionado. */
    const combinacionesCurso = useMemo(
        () => combinaciones.filter(c => c.cursoId === localCursoId),
        [combinaciones, localCursoId]
    );

    /** Combinación legada: curso propio sin vínculo en `curso_docentes`. */
    const comboLegado = useMemo<CombinacionCurricular | null>(() => {
        if (!localCursoId) return null;
        const curso = state.cursos.find(c => c.id === localCursoId);
        if (!curso) return null;
        const asignatura = curso.asignatura || '';
        return {
            key: `${curso.id}|${asignatura}`,
            cursoId: curso.id,
            cursoDocenteId: null,
            grado: curso.grado || '',
            seccion: curso.seccion || '',
            cursoNombre: curso.nombre || `${curso.grado} ${curso.seccion}`,
            asignatura,
            asignaturaNombre: getAsignaturaNombre(asignatura),
        };
    }, [localCursoId, state.cursos]);

    const comboActual = useMemo<CombinacionCurricular | null>(() => {
        if (!localCursoId) return null;
        const encontrada = combinacionesCurso.find(c => c.asignatura === asignaturaSel) ?? combinacionesCurso[0];
        return encontrada ?? comboLegado;
    }, [combinacionesCurso, asignaturaSel, comboLegado, localCursoId]);

    const curriculo = useCurriculumPeriodo(comboActual, periodoSel);
    const actividadesEstado = useActividadesPeriodo(localCursoId, periodoSel, modalActividades);

    // Al cambiar de curso o período, la selección de actividades deja de ser válida.
    useEffect(() => {
        setActividadesSeleccionadas(new Set());
    }, [localCursoId, periodoSel]);

    // La asignatura se reinicia al cambiar de curso: cada curso puede tener otras.
    useEffect(() => {
        setAsignaturaSel('');
    }, [localCursoId]);

    /** Curso físico seleccionado actualmente. */
    const curso = useMemo(() => {
        return localCursoId > 0 ? state.cursos.find(c => c.id === localCursoId) : undefined;
    }, [state.cursos, localCursoId]);

    const asignaturaNombre = useMemo(() => {
        return comboActual?.asignaturaNombre || comboActual?.asignatura || curso?.asignatura || '';
    }, [comboActual, curso]);

    const gradoSeccion = useMemo(() => {
        if (curso) {
            return [curso.grado, curso.seccion].filter(Boolean).join(' ');
        }
        if (comboActual) {
            return [comboActual.grado, comboActual.seccion].filter(Boolean).join(' ');
        }
        return '';
    }, [curso, comboActual]);

    const cicloCalculado = useMemo(() => {
        return determinarCiclo(curso?.grado || comboActual?.grado || '');
    }, [curso, comboActual]);

    /* ---------------- Datos institucionales (Centro y Docente) ---------------- */
    const [fetchedCentro, setFetchedCentro] = useState<Centro | null>(null);

    // Carga autónoma desde Supabase para garantizar que el nombre del usuario y el centro
    // estén disponibles incluso en recargas directas o si Zustand no ha completado la hidratación
    useEffect(() => {
        let isMounted = true;
        (async () => {
            let userId = session?.user?.id || sessionProp?.user?.id;
            let metadata = session?.user?.user_metadata || sessionProp?.user?.user_metadata;
            if (!userId) {
                const { data: authData } = await supabase.auth.getUser();
                if (!isMounted || !authData?.user) return;
                userId = authData.user.id;
                metadata = authData.user.user_metadata;
            }

            const metaNombre = (metadata?.nombre_docente || metadata?.full_name || metadata?.nombre || metadata?.name || '').trim();
            if (metaNombre && isMounted) {
                setDirectDocenteNombre(metaNombre);
            }

            const { data: perfilRow } = await supabase
                .from('perfiles')
                .select('user_id, nombre, nombre_docente, centro_id, telefono')
                .eq('user_id', userId)
                .maybeSingle();

            if (!isMounted) return;

            const dbNombre = (perfilRow?.nombre || perfilRow?.nombre_docente || '').trim();
            if (dbNombre) {
                setDirectDocenteNombre(dbNombre);
            }

            const cId = perfilRow?.centro_id || metadata?.centro_id;
            if (cId) {
                const { data: centroRow } = await supabase
                    .from('centros')
                    .select('*')
                    .eq('id', cId)
                    .maybeSingle();

                if (isMounted && centroRow) {
                    const c: Centro = {
                        id: centroRow.id,
                        nombre: centroRow.nombre || '',
                        codigoCentro: centroRow.codigo_centro || '',
                        tanda: centroRow.tanda || 'Jornada Extendida',
                        telefono: centroRow.telefono || '',
                        distritoEducativo: centroRow.distrito_educativo || '',
                        regionalEducacion: centroRow.regional_educacion || '',
                        provincia: centroRow.provincia || '',
                        municipio: centroRow.municipio || '',
                        createdBy: centroRow.created_by,
                        createdAt: centroRow.created_at,
                        updatedAt: centroRow.updated_at,
                        estado: centroRow.estado || 'activo',
                        afiliado: centroRow.afiliado || false
                    };
                    saveCentroCache(c);
                    setDirectCentro(c);
                }
            }
        })();
        return () => { isMounted = false; };
    }, [session?.user?.id, sessionProp?.user?.id]);

    const userCentroId = useMemo(() => {
        const effectiveUserId = session?.user?.id || sessionProp?.user?.id;
        const miPerfil = effectiveUserId ? state.perfiles.find(p => p.userId === effectiveUserId) : undefined;
        const perfilCache = effectiveUserId ? getValidPerfil(effectiveUserId) : null;
        return (
            currentUserProfileProp?.centro_id ||
            currentUserProfileProp?.centro?.id ||
            miPerfil?.centro_id ||
            perfilCache?.centro_id ||
            state.centroRolActual?.centro_id ||
            curso?.centroId ||
            ''
        );
    }, [currentUserProfileProp, state.perfiles, session?.user?.id, sessionProp?.user?.id, state.centroRolActual, curso?.centroId]);

    const resolvedCentro = useMemo<Centro | null>(() => {
        if (currentUserProfileProp?.centro) return currentUserProfileProp.centro;
        const effectiveUserId = session?.user?.id || sessionProp?.user?.id;
        const miPerfil = effectiveUserId ? state.perfiles.find(p => p.userId === effectiveUserId) : undefined;
        if (userCentroId) {
            const cached = getValidCentro(userCentroId);
            if (cached) return cached;
            const fromState = state.centros?.find(c => c.id === userCentroId);
            if (fromState) return fromState;
        }
        if (miPerfil?.centro) return miPerfil.centro;
        if (directCentro) return directCentro;
        if (curso?.centroId) {
            const cached = getValidCentro(curso.centroId);
            if (cached) return cached;
            const fromState = state.centros?.find(c => c.id === curso.centroId);
            if (fromState) return fromState;
        }
        return fetchedCentro;
    }, [currentUserProfileProp, userCentroId, state.centros, state.perfiles, session?.user?.id, sessionProp?.user?.id, directCentro, curso?.centroId, fetchedCentro]);

    // Carga bajo demanda del centro únicamente si no está en caché ni en el estado
    useEffect(() => {
        const idToFetch = userCentroId || curso?.centroId;
        if (!idToFetch || resolvedCentro) return;

        let isMounted = true;
        supabase.from('centros').select('*').eq('id', idToFetch).maybeSingle().then(({ data }) => {
            if (!isMounted || !data) return;
            const c: Centro = {
                id: data.id,
                nombre: data.nombre,
                codigoCentro: data.codigo_centro || '',
                tanda: data.tanda || 'Jornada Extendida',
                telefono: data.telefono || '',
                distritoEducativo: data.distrito_educativo || '',
                regionalEducacion: data.regional_educacion || '',
                provincia: data.provincia || '',
                municipio: data.municipio || '',
                createdBy: data.created_by,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                estado: data.estado || 'activo',
                afiliado: data.afiliado || false
            };
            saveCentroCache(c);
            setFetchedCentro(c);
        });
        return () => { isMounted = false; };
    }, [userCentroId, curso?.centroId, resolvedCentro]);

    const docenteNombre = useMemo(() => {
        // En docente se debe poner el nombre del usuario autenticado de forma lógica y priorizada
        const fromProp = (docenteNombreProp && docenteNombreProp !== 'Docente' ? docenteNombreProp : '').trim();
        const fromCurrentProp = (currentUserProfileProp?.nombreDocente || currentUserProfileProp?.nombre || currentUserProfileProp?.nombre_docente || '').trim();
        const effectiveUserId = session?.user?.id || sessionProp?.user?.id;
        const miPerfil = effectiveUserId ? state.perfiles.find(p => p.userId === effectiveUserId) : undefined;
        const fromStatePerfil = (miPerfil?.nombreDocente || (miPerfil as any)?.nombre || (miPerfil as any)?.nombre_docente || '').trim();
        const fromDirect = (directDocenteNombre || '').trim();
        const perfilCache = effectiveUserId ? getValidPerfil(effectiveUserId) : null;
        const fromCache = (perfilCache?.nombre_docente || perfilCache?.nombre || '').trim();
        const fromState = (state.nombreDocente && state.nombreDocente !== 'Docente' ? state.nombreDocente : '').trim();
        const metadata = session?.user?.user_metadata || sessionProp?.user?.user_metadata;
        const fromMeta = (metadata?.nombre_docente || metadata?.full_name || metadata?.nombre || metadata?.name || '').trim();

        return (
            fromProp ||
            fromCurrentProp ||
            fromStatePerfil ||
            fromDirect ||
            fromCache ||
            fromState ||
            fromMeta ||
            ''
        ).trim();
    }, [
        docenteNombreProp,
        currentUserProfileProp,
        state.perfiles,
        session?.user,
        sessionProp?.user,
        directDocenteNombre,
        state.nombreDocente
    ]);

    const centroNombre = useMemo(() => {
        const fromCurrentProp = (currentUserProfileProp?.centro?.nombre || currentUserProfileProp?.institucion || currentUserProfileProp?.instituto || '').trim();
        const fromResolved = (resolvedCentro?.nombre || '').trim();
        const fromDirect = (directCentro?.nombre || '').trim();
        const effectiveUserId = session?.user?.id || sessionProp?.user?.id;
        const miPerfil = effectiveUserId ? state.perfiles.find(p => p.userId === effectiveUserId) : undefined;
        const fromMiPerfil = (miPerfil?.centro?.nombre || miPerfil?.instituto || miPerfil?.institucion || '').trim();
        const fromInstituto = (state.instituto && state.instituto !== 'Instituto Central' ? state.instituto : '').trim();
        const fromCurso = (curso?.centroId ? (state.centros?.find(c => c.id === curso.centroId)?.nombre || getValidCentro(curso.centroId)?.nombre || '') : '').trim();
        const metadata = session?.user?.user_metadata || sessionProp?.user?.user_metadata;
        const fromMeta = (metadata?.centro_nombre || metadata?.centro || metadata?.institucion || '').trim();
        const finalFallback = (state.instituto || '').trim();

        return (
            fromCurrentProp ||
            fromResolved ||
            fromDirect ||
            fromMiPerfil ||
            fromInstituto ||
            fromCurso ||
            fromMeta ||
            finalFallback
        ).trim();
    }, [
        currentUserProfileProp,
        resolvedCentro?.nombre,
        directCentro?.nombre,
        state.perfiles,
        session?.user,
        sessionProp?.user,
        state.instituto,
        curso?.centroId,
        state.centros
    ]);

    const codigoCentro = useMemo(() => {
        const fromCurrentProp = (currentUserProfileProp?.centro?.codigoCentro || currentUserProfileProp?.centro?.codigo_centro || '').trim();
        const fromResolved = (resolvedCentro?.codigoCentro || (resolvedCentro as any)?.codigo_centro || '').trim();
        const fromDirect = (directCentro?.codigoCentro || (directCentro as any)?.codigo_centro || '').trim();
        const effectiveUserId = session?.user?.id || sessionProp?.user?.id;
        const miPerfil = effectiveUserId ? state.perfiles.find(p => p.userId === effectiveUserId) : undefined;
        const fromMiPerfil = (miPerfil?.centro?.codigoCentro || (miPerfil?.centro as any)?.codigo_centro || '').trim();
        const centroCurso = curso?.centroId ? (state.centros?.find(c => c.id === curso.centroId) || getValidCentro(curso.centroId)) : null;
        const fromCurso = (centroCurso?.codigoCentro || (centroCurso as any)?.codigo_centro || '').trim();
        const metadata = session?.user?.user_metadata || sessionProp?.user?.user_metadata;
        const fromMeta = (metadata?.codigo_centro || metadata?.codigoCentro || '').trim();

        return (
            fromCurrentProp ||
            fromResolved ||
            fromDirect ||
            fromMiPerfil ||
            fromCurso ||
            fromMeta ||
            ''
        ).trim();
    }, [
        currentUserProfileProp,
        resolvedCentro,
        directCentro,
        state.perfiles,
        session?.user,
        sessionProp?.user,
        curso?.centroId,
        state.centros
    ]);

    const telefonoCentro = useMemo(() => {
        const fromCurrentProp = (currentUserProfileProp?.centro?.telefono || currentUserProfileProp?.telefono || '').trim();
        const fromResolved = (resolvedCentro?.telefono || '').trim();
        const fromDirect = (directCentro?.telefono || '').trim();
        const effectiveUserId = session?.user?.id || sessionProp?.user?.id;
        const miPerfil = effectiveUserId ? state.perfiles.find(p => p.userId === effectiveUserId) : undefined;
        const fromMiPerfil = (miPerfil?.centro?.telefono || miPerfil?.telefono || '').trim();
        const centroCurso = curso?.centroId ? (state.centros?.find(c => c.id === curso.centroId) || getValidCentro(curso.centroId)) : null;
        const fromCurso = (centroCurso?.telefono || '').trim();
        const metadata = session?.user?.user_metadata || sessionProp?.user?.user_metadata;
        const fromMeta = (metadata?.telefono || '').trim();

        return (
            fromCurrentProp ||
            fromResolved ||
            fromDirect ||
            fromMiPerfil ||
            fromCurso ||
            fromMeta ||
            ''
        ).trim();
    }, [
        currentUserProfileProp,
        resolvedCentro,
        directCentro,
        state.perfiles,
        session?.user,
        sessionProp?.user,
        curso?.centroId,
        state.centros
    ]);

    /* ---------------- Cantidad real de estudiantes del curso ---------------- */
    const estudiantesCurso = useMemo(() => {
        if (!curso) return [];
        return estudiantesDelCurso(state.cursos, state.estudiantes, curso, userCentroId || curso.centroId);
    }, [curso, state.cursos, state.estudiantes, userCentroId]);

    const [countFallback, setCountFallback] = useState<number | null>(null);

    useEffect(() => {
        if (!curso) {
            setCountFallback(null);
            return;
        }
        if (estudiantesCurso.length > 0) {
            setCountFallback(null);
            return;
        }
        if (state.estudiantes.length > 0) {
            setCountFallback(0);
            return;
        }
        let isMounted = true;
        supabase
            .from('estudiantes')
            .select('id', { count: 'exact', head: true })
            .eq('curso_id', curso.id)
            .eq('activo', true)
            .then(({ count, error }) => {
                if (!isMounted) return;
                if (!error && typeof count === 'number') {
                    setCountFallback(count);
                }
            });
        return () => { isMounted = false; };
    }, [curso?.id, estudiantesCurso.length, state.estudiantes.length]);

    const cantEstudiantes = useMemo(() => {
        if (!curso) return '';
        if (estudiantesCurso.length > 0) return estudiantesCurso.length;
        if (countFallback !== null) return countFallback;
        if (state.estudiantes.length > 0) return 0;
        return '';
    }, [curso, estudiantesCurso.length, countFallback, state.estudiantes.length]);

    // Si aún no hay curso seleccionado pero hay cursos disponibles, preseleccionar el primero
    useEffect(() => {
        if (localCursoId === 0 && opcionesCurso.length > 0) {
            setLocalCursoId(opcionesCurso[0].id);
        }
    }, [localCursoId, opcionesCurso]);

    // Actualiza el título si no ha sido personalizado manualmente por el docente
    useEffect(() => {
        if (localCursoId > 0 && asignaturaNombre) {
            setLocalTitulo(prev => {
                if (!prev || prev.startsWith('Planificación -')) {
                    return 'Planificación - ' + (asignaturaNombre || 'Clase');
                }
                return prev;
            });
        }
    }, [localCursoId, asignaturaNombre]);

    const [panelIA, setPanelIA] = useState(false);
    const [iaCargando, setIaCargando] = useState(false);
    const [iaError, setIaError] = useState<string | null>(null);
    const [sugerencias, setSugerencias] = useState<Awaited<ReturnType<typeof generarSugerenciasPedagogicas>> | null>(null);
    const [insertadas, setInsertadas] = useState<Set<string>>(new Set());
    const [necesitaKey, setNecesitaKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const abortRef = useRef<AbortController | null>(null);
    const badgeTimersRef = useRef<Record<string, number>>({});
    const [brocha, setBrocha] = useState<{ clave: string; sugerencia: SugerenciaAplicable } | null>(null);
    const [celdaPendiente, setCeldaPendiente] = useState<{ celda: HTMLElement; clave: string; texto: string } | null>(null);
    const celdasBrochaRef = useRef<HTMLElement[]>([]);
    const hoverCellRef = useRef<HTMLElement | null>(null);
    const workspaceRef = useRef<HTMLDivElement | null>(null);

    // En pantallas estrechas los paneles se apilan sobre el documento: al abrirlos
    // se带回 el workspace al inicio para que el panel quede a la vista.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.innerWidth >= 1280) return;
        if (!panelCurricular && !panelIA) return;
        workspaceRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [panelCurricular, panelIA]);

    const marcarInsertada = (clave: string) => {
        setInsertadas(prev => new Set(prev).add(clave));
        window.clearTimeout(badgeTimersRef.current[clave]);
        badgeTimersRef.current[clave] = window.setTimeout(() => {
            setInsertadas(prev => {
                if (!prev.has(clave)) return prev;
                const next = new Set(prev);
                next.delete(clave);
                return next;
            });
        }, 1800);
    };

    const limpiarEstiloCelda = (el: HTMLElement) => {
        el.style.outline = '';
        el.style.background = '';
        el.style.cursor = '';
        el.title = '';
    };

    const finalizarBrocha = useCallback(() => {
        celdasBrochaRef.current.forEach(limpiarEstiloCelda);
        celdasBrochaRef.current = [];
        if (hoverCellRef.current) {
            limpiarEstiloCelda(hoverCellRef.current);
            hoverCellRef.current = null;
        }
        setCeldaPendiente(null);
        setBrocha(null);
    }, []);

    const activarBrocha = (clave: string, sugerencia: SugerenciaAplicable) => {
        setCeldaPendiente(null);
        setBrocha({ clave, sugerencia });
        requestAnimationFrame(() => {
            const contenedor = document.getElementById('template-editor-container');
            if (!contenedor) return;
            celdasBrochaRef.current = Array.from(contenedor.querySelectorAll<HTMLElement>('[data-field-id]'))
                .filter(el => !((el.dataset.fieldId || '').endsWith('-momento')));
            celdasBrochaRef.current.forEach(el => {
                el.style.cursor = CURSOR_BROCHA;
                el.style.background = 'rgba(59,130,246,0.06)';
            });
        });
    };

    const aplicarBrocha = (celda: HTMLElement, clave: string, texto: string) => {
        const contenedor = document.getElementById('template-editor-container');
        escribirEnCelda(celda, texto);
        if (contenedor) {
            const htmlActualizado = contenedor.innerHTML;
            setSeq(prev => (prev ? { ...prev, contenidoHtml: htmlActualizado } : prev));
        }
        marcarInsertada(clave);
        finalizarBrocha();
    };

    const handleClicPlantilla = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!brocha) return;
        const target = e.target as HTMLElement | null;
        const celda = obtenerCeldaDestino(target);
        if (!celda) return;
        const id = celda.dataset.fieldId || '';
        if (id.endsWith('-momento')) return;
        if (celdaRequiereConfirmacion(celda)) {
            setCeldaPendiente({ celda, clave: brocha.clave, texto: brocha.sugerencia.texto });
            return;
        }
        aplicarBrocha(celda, brocha.clave, brocha.sugerencia.texto);
    };

    const handleOverPlantilla = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!brocha) return;
        const target = e.target as HTMLElement | null;
        const celda = target?.closest?.('[data-field-id]') ?? null;
        if (!(celda instanceof HTMLElement) || (celda.dataset.fieldId || '').endsWith('-momento')) return;
        if (hoverCellRef.current && hoverCellRef.current !== celda) {
            limpiarEstiloCelda(hoverCellRef.current);
        }
        if (hoverCellRef.current !== celda) {
            hoverCellRef.current = celda;
            celda.style.outline = '2px dashed var(--primary)';
            celda.style.background = 'rgba(59,130,246,0.12)';
            celda.style.cursor = CURSOR_BROCHA;
            celda.title = 'Aplicar sugerencia de IA aquí';
        }
    };

    const handleLeavePlantilla = () => {
        if (hoverCellRef.current) {
            limpiarEstiloCelda(hoverCellRef.current);
            hoverCellRef.current = null;
        }
    };

    useEffect(() => () => abortRef.current?.abort(), []);

    useEffect(() => {
        if (esPlantilla) return;
        const numId = Number(id);
        if (!numId) return;

        let isMounted = true;
        const found = state.secuencias.find(s => s.id === numId);

        if (found) {
            setLocalTitulo(found.titulo);
            setLocalCursoId(found.cursoId);

            // Si ya tiene contenidoHtml, usarlo directamente
            if (found.contenidoHtml) {
                setSeq(found);
                setLoading(false);
                return;
            }

            // Si no tiene contenidoHtml, intentar leer de secuenciaCache o Supabase bajo demanda
            const cached = getValidSecuencia(session?.user?.id, found.cursoId, numId);
            if (cached?.contenidoHtml) {
                setSeq(cached);
                setLoading(false);
                return;
            }

            // Descarga puntual exclusiva del contenidoHtml de esta secuencia
            void (async () => {
                const { data } = await supabase
                    .from('secuencias')
                    .select('id, contenido_html, recursos')
                    .eq('id', numId)
                    .single();

                if (!isMounted) return;

                const rawHtml = data?.contenido_html || found.contenidoHtml || '';
                const fullSeq: Secuencia = {
                    ...found,
                    contenidoHtml: limpiarExpresionesPlantilla(rawHtml, {
                        docente: docenteNombre,
                        centro: centroNombre,
                        codigoCentro,
                        asignatura: asignaturaNombre,
                        fecha: found.fechaInicio
                    }),
                    recursos: data?.recursos ? (Array.isArray(data.recursos) ? data.recursos : (() => { try { return JSON.parse(data.recursos); } catch { return []; } })()) : found.recursos
                };

                setSeq(fullSeq);
                setLoading(false);
                if (session?.user?.id) {
                    saveSecuencia(session.user.id, fullSeq);
                }
                useAppStore.getState().setAppState(s => ({
                    ...s,
                    secuencias: s.secuencias.map(item => item.id === numId ? fullSeq : item)
                }));
            })();
        } else {
            // Si no está en state.secuencias, intentar cargarlo directamente de Supabase
            void (async () => {
                try {
                    const { data } = await supabase
                        .from('secuencias')
                        .select('*')
                        .eq('id', numId)
                        .single();

                    if (!isMounted) return;
                    if (data) {
                        const fetchedSeq: Secuencia = {
                            id: data.id,
                            titulo: data.titulo,
                            cursoId: data.curso_id,
                            fechaInicio: data.fecha_inicio,
                            contenidoHtml: limpiarExpresionesPlantilla(data.contenido_html || '', {
                                docente: docenteNombre,
                                centro: centroNombre,
                                codigoCentro,
                                asignatura: asignaturaNombre,
                                fecha: data.fecha_inicio
                            }),
                            estado: data.estado,
                            userId: data.user_id,
                            archivoUrl: data.archivo_url,
                            archivoNombre: data.archivo_nombre,
                            archivoSize: data.archivo_size,
                            archivoTipo: data.archivo_tipo,
                            archivoFechaCarga: data.archivo_fecha_carga,
                            recursos: Array.isArray(data.recursos) ? data.recursos : (() => { try { return JSON.parse(data.recursos); } catch { return []; } })()
                        };
                        setSeq(fetchedSeq);
                        setLocalTitulo(fetchedSeq.titulo);
                        setLocalCursoId(fetchedSeq.cursoId);
                        if (session?.user?.id) {
                            saveSecuencia(session.user.id, fetchedSeq);
                        }
                    }
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            })();
        }

        return () => {
            isMounted = false;
        };
    }, [id, state.secuencias, esPlantilla, session?.user?.id]);

    useEffect(() => {
        if (!esPlantilla) return;
        if (seq) return;

        const qs = new URLSearchParams(window.location.search);
        const cursoIdParam = Number(qs.get('cursoId')) || 0;
        const initialCursoId = cursoIdParam > 0 ? cursoIdParam : (localCursoId > 0 ? localCursoId : (opcionesCurso[0]?.id || 0));
        const cursoInit = initialCursoId > 0 ? state.cursos.find(c => c.id === initialCursoId) : undefined;

        const fecha = qs.get('fecha') || new Date().toISOString().slice(0, 10);
        const asignatura = (qs.get('asignatura') || comboActual?.asignaturaNombre || cursoInit?.asignatura || '').trim();
        const grado = (qs.get('grado') || cursoInit?.grado || comboActual?.grado || '').trim();
        const seccion = (qs.get('seccion') || cursoInit?.seccion || comboActual?.seccion || '').trim();
        const titulo = 'Planificación - ' + (asignatura || 'Clase');

        const initialEstudiantes = cursoInit ? estudiantesDelCurso(state.cursos, state.estudiantes, cursoInit, userCentroId || cursoInit.centroId).length : '';
        const initialCantEst = qs.get('estudiantes') || (initialEstudiantes !== '' ? String(initialEstudiantes) : '');

        setLocalTitulo(titulo);
        setLocalCursoId(initialCursoId);
        setSeq({
            id: 0,
            titulo,
            cursoId: initialCursoId,
            fechaInicio: fecha,
            contenidoHtml: getPlanificacionDiariaTemplate({
                centro: qs.get('centro') || centroNombre,
                codigoCentro: qs.get('codigo') || codigoCentro,
                docente: qs.get('docente') || docenteNombre,
                asignatura,
                grado,
                seccion,
                fecha,
                cantidadEstudiantes: initialCantEst,
                telefono: qs.get('telefono') || telefonoCentro,
                ciclo: determinarCiclo(grado)
            }),
            estado: 'Pendiente',
            recursos: []
        });
        setLoading(false);
    }, [
        esPlantilla,
        seq,
        state.cursos,
        state.perfiles,
        state.centros,
        state.estudiantes,
        session,
        opcionesCurso,
        localCursoId,
        comboActual,
        centroNombre,
        codigoCentro,
        docenteNombre,
        telefonoCentro,
        userCentroId
    ]);

    useEffect(() => {
        const win = window as unknown as {
            addSession?: () => void;
            removeSession?: (btn: HTMLElement) => void;
            renumberSessions?: () => void;
        };

        win.addSession = () => {
            const tpl = document.getElementById('session-template') as HTMLTemplateElement | null;
            const container = document.getElementById('sessions-container');
            if (tpl && container) {
                const clone = document.importNode(tpl.content, true);
                container.appendChild(clone);
                win.renumberSessions?.();
                asignarIdsDeCeldas();
            }
        };

        win.removeSession = (btn: HTMLElement) => {
            const block = btn.closest('.session-block');
            if (block) {
                block.remove();
                win.renumberSessions?.();
                asignarIdsDeCeldas();
            }
        };

        win.renumberSessions = () => {
            const container = document.getElementById('sessions-container');
            if (!container) return;
            const blocks = container.querySelectorAll('.session-block');
            blocks.forEach((block, i) => {
                const title = block.querySelector('.session-title');
                if (title) {
                    title.textContent = 'Plan de clase' + (blocks.length > 1 ? ' — Sección ' + (i + 1) : '');
                }
            });
        };

        return () => {
            delete win.addSession;
            delete win.removeSession;
            delete win.renumberSessions;
        };
    }, []);

    // Initial session auto-creation if container is empty
    useEffect(() => {
        if (!loading && seq) {
            const timer = setTimeout(() => {
                const container = document.getElementById('sessions-container');
                if (container && container.children.length === 0) {
                    const win = window as unknown as { addSession?: () => void };
                    win.addSession?.();
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [loading, seq]);

    // Identifica cada celda editable (general-*, curricular-*, contenido-*, seccion-N-*)
    useEffect(() => {
        if (!loading && seq) {
            asignarIdsDeCeldas();
        }
    }, [loading, seq]);

    // Sincroniza automáticamente los datos institucionales y del curso en el encabezado del documento HTML
    useEffect(() => {
        if (loading || !seq) return;
        const contenedor = document.getElementById('template-editor-container');
        if (!contenedor) return;

        asignarIdsDeCeldas();

        let huboCambios = false;

        const syncInstitutional = (fieldId: string, nuevoTexto: string) => {
            const celda = contenedor.querySelector<HTMLElement>(`[data-field-id="${fieldId}"]`);
            if (!celda) return;
            const textoActual = (celda.textContent || '').trim();
            const limpioNuevo = (nuevoTexto || '').trim();

            const esPlaceholderOInvalido =
                textoActual === '' ||
                textoActual.toLowerCase() === 'docente' ||
                textoActual.toLowerCase() === 'mi centro' ||
                textoActual.toLowerCase() === 'instituto central' ||
                textoActual.toLowerCase() === 'undefined' ||
                textoActual.toLowerCase() === 'null' ||
                textoActual.startsWith('${') ||
                textoActual.includes('${data.') ||
                celda.classList.contains('placeholder');

            // Si el nuevo texto está vacío pero la celda muestra una expresión corrupta (${data...), limpiarla
            if (!limpioNuevo) {
                if (textoActual.startsWith('${') || textoActual.includes('${data.') || textoActual.toLowerCase() === 'undefined' || textoActual.toLowerCase() === 'null') {
                    celda.textContent = '';
                    celda.classList.remove('placeholder');
                    huboCambios = true;
                }
                return;
            }

            const esAutollenadoOPlantilla =
                esPlantilla ||
                celda.dataset.autofilled === 'true' ||
                esPlaceholderOInvalido;

            if (esAutollenadoOPlantilla && textoActual !== limpioNuevo) {
                celda.textContent = limpioNuevo;
                celda.classList.remove('placeholder');
                celda.dataset.autofilled = 'true';
                huboCambios = true;
            }
        };

        const syncCourseField = (fieldId: string, nuevoTexto: string) => {
            const celda = contenedor.querySelector<HTMLElement>(`[data-field-id="${fieldId}"]`);
            if (!celda) return;
            const textoActual = (celda.textContent || '').trim();
            const limpioNuevo = (nuevoTexto || '').trim();

            const esPlaceholderOInvalido =
                textoActual.startsWith('${') ||
                textoActual.includes('${data.') ||
                textoActual.toLowerCase() === 'undefined' ||
                textoActual.toLowerCase() === 'null';

            if (textoActual !== limpioNuevo || esPlaceholderOInvalido) {
                celda.textContent = limpioNuevo;
                celda.classList.remove('placeholder');
                celda.dataset.autofilled = 'true';
                huboCambios = true;
            }
        };

        // Campos institucionales del usuario autenticado
        if (centroNombre) syncInstitutional('general-centro', centroNombre);
        if (docenteNombre) syncInstitutional('general-docente', docenteNombre);
        syncInstitutional('general-codigo', codigoCentro);
        syncInstitutional('general-telefono', telefonoCentro);

        // Campos del curso seleccionado (actualizados de inmediato al cambiar de curso)
        if (curso) {
            syncCourseField('general-asignatura', asignaturaNombre);
            syncCourseField('general-grado', gradoSeccion);
            if (cicloCalculado) syncCourseField('general-ciclo', cicloCalculado);
            syncCourseField('general-estudiantes', cantEstudiantes !== '' ? String(cantEstudiantes) : '');
        } else if (localCursoId === 0) {
            syncCourseField('general-asignatura', '');
            syncCourseField('general-grado', '');
            syncCourseField('general-ciclo', '');
            syncCourseField('general-estudiantes', '');
        }

        if (huboCambios) {
            const htmlActualizado = contenedor.innerHTML;
            setSeq(prev => (prev ? { ...prev, contenidoHtml: htmlActualizado } : prev));
        }
    }, [
        loading,
        seq?.id,
        esPlantilla,
        localCursoId,
        curso,
        asignaturaNombre,
        gradoSeccion,
        cicloCalculado,
        cantEstudiantes,
        centroNombre,
        docenteNombre,
        codigoCentro,
        telefonoCentro
    ]);

    // Auto-llenado automático de Conceptual, Procedimental y Actitudes y valores en el HTML
    useEffect(() => {
        if (loading || curriculo.cargando) return;
        if (!seq) return;

        const contenedor = document.getElementById('template-editor-container');
        if (!contenedor) return;

        asignarIdsDeCeldas();

        const celdaConc = contenedor.querySelector<HTMLElement>('[data-field-id="contenido-conceptual"]');
        const celdaProc = contenedor.querySelector<HTMLElement>('[data-field-id="contenido-procedimental"]');
        const celdaAct = contenedor.querySelector<HTMLElement>('[data-field-id="contenido-actitudes"]');

        if (!celdaConc && !celdaProc && !celdaAct) return;

        const contenidoEsPlaceholderOAutollenado = (celda: HTMLElement | null): boolean => {
            if (!celda) return false;
            if (celda.dataset.autofilled === 'true') return true;
            if (celda.classList.contains('placeholder')) return true;
            const txt = (celda.textContent || '').replace(/\s+/g, ' ').trim();
            if (!txt) return true;
            return PLACEHOLDERS_PLANTILLA.some(
                (p) => p.replace(/\s+/g, ' ').trim().toLowerCase() === txt.toLowerCase()
            );
        };

        let huboCambios = false;

        if (celdaConc && contenidoEsPlaceholderOAutollenado(celdaConc) && curriculo.datos.conceptuales.length > 0) {
            const nuevoHtml = formatearContenidosPorUnidad(curriculo.datos.conceptuales);
            if (celdaConc.innerHTML !== nuevoHtml) {
                celdaConc.innerHTML = nuevoHtml;
                celdaConc.classList.remove('placeholder');
                celdaConc.dataset.autofilled = 'true';
                huboCambios = true;
            }
        }

        if (celdaProc && contenidoEsPlaceholderOAutollenado(celdaProc) && curriculo.datos.procedimentales.length > 0) {
            const nuevoHtml = formatearContenidosPorUnidad(curriculo.datos.procedimentales);
            if (celdaProc.innerHTML !== nuevoHtml) {
                celdaProc.innerHTML = nuevoHtml;
                celdaProc.classList.remove('placeholder');
                celdaProc.dataset.autofilled = 'true';
                huboCambios = true;
            }
        }

        if (celdaAct && contenidoEsPlaceholderOAutollenado(celdaAct) && curriculo.datos.actitudinales.length > 0) {
            const nuevoHtml = formatearContenidosPorUnidad(curriculo.datos.actitudinales);
            if (celdaAct.innerHTML !== nuevoHtml) {
                celdaAct.innerHTML = nuevoHtml;
                celdaAct.classList.remove('placeholder');
                celdaAct.dataset.autofilled = 'true';
                huboCambios = true;
            }
        }

        if (huboCambios) {
            const htmlActualizado = contenedor.innerHTML;
            setSeq((prev) => (prev ? { ...prev, contenidoHtml: htmlActualizado } : prev));
        }
    }, [
        loading,
        curriculo.cargando,
        curriculo.datos.conceptuales,
        curriculo.datos.procedimentales,
        curriculo.datos.actitudinales,
        periodoSel,
        localCursoId,
        seq?.id,
    ]);

    // Esc cancela el modo brocha
    useEffect(() => {
        if (!brocha) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') finalizarBrocha();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [brocha, finalizarBrocha]);

    const handleSave = async () => {
        if (!seq) return;
        const container = document.getElementById('template-editor-container');
        if (!container) return;

        setSaving(true);
        const updatedHtml = container.innerHTML;

        if (esPlantilla) {
            const nueva: Omit<Secuencia, 'id'> = {
                titulo: localTitulo,
                cursoId: localCursoId,
                fechaInicio: seq.fechaInicio,
                contenidoHtml: updatedHtml,
                estado: 'Pendiente',
                recursos: []
            };
            let creada: Secuencia | null = null;
            if (onAddSecuencia) {
                creada = (await onAddSecuencia(nueva)) || null;
            }
            if (creada?.id) {
                navigate(`/planificacion-diaria/${creada.id}`, { replace: true });
            }
            setSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
            return;
        }

        const updatedSeq: Secuencia = {
            ...seq,
            titulo: localTitulo,
            cursoId: localCursoId,
            contenidoHtml: updatedHtml
        };

        if (onUpdateSecuencia) {
            const result = await onUpdateSecuencia(updatedSeq);
            if (result && result.success === false) {
                setSaving(false);
                alert(`Error al guardar en base de datos. Los cambios se mantienen en pantalla.\n\nDetalle técnico:\n${result.error?.message || JSON.stringify(result.error) || 'Error desconocido'}`);
                return;
            }
        }
        setSeq(updatedSeq);
        setSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    /** Texto de las actividades seleccionadas, listo para el prompt. */
    const lineasActividades = useMemo(() => {
        const ids = new Set(actividadesSeleccionadas);
        return actividadesEstado.actividades
            .filter(a => ids.has(a.id))
            .map(a => {
                const partes = [`Actividad: ${a.nombre || 'Sin nombre'}`];
                if (a.fecha) partes.push(`fecha ${a.fecha}`);
                if (a.indicador) partes.push(`indicador ${a.indicador}`);
                if (a.producto) partes.push(`producto ${a.producto}`);
                if (a.descripcion) partes.push(`descripción: ${a.descripcion}`);
                return partes.join(' | ');
            });
    }, [actividadesEstado.actividades, actividadesSeleccionadas]);

    /** Currículo vigente del período, listo para el prompt (contexto mínimo). */
    const contextoCurriculo = useMemo(() => ({
        periodo: periodoSel,
        competencias: curriculo.datos.competencias
            .slice(0, 8)
            .map(c => (c.texto ? `${c.codigo}: ${c.texto}` : c.codigo))
            .filter(Boolean),
        indicadores: curriculo.datos.indicadores
            .slice(0, 12)
            .map(i => (i.codigo ? `${i.codigo}: ${i.texto}` : i.texto))
            .filter(Boolean),
        contenidos: curriculo.datos.contenidos.slice(0, 15).map(c => c.texto).filter(Boolean),
        conceptuales: curriculo.datos.conceptuales.slice(0, 8).map(c => c.texto).filter(Boolean),
        procedimentales: curriculo.datos.procedimentales.slice(0, 8).map(c => c.texto).filter(Boolean),
        actitudinales: curriculo.datos.actitudinales.slice(0, 8).map(c => c.texto).filter(Boolean),
    }), [curriculo.datos, periodoSel]);

    const handleClickSugerir = () => {
        const userId = session?.user?.id;
        if (!userId) { setIaError('Sesión de usuario no válida.'); return; }
        if (!isProviderConfigured(userId, getAIAIProvider(userId))) { setNecesitaKey(true); setPanelIA(true); return; }

        setContextoExtra('');
        setModalActividades(true);
    };

    const handleGenerarSugerencias = async (textoContextoAdicional?: string) => {
        if (!seq || iaCargando) return;
        setModalActividades(false);
        const contenedor = document.getElementById('template-editor-container');
        if (!contenedor) return;

        const userId = session?.user?.id;
        if (!userId) { setIaError('Sesión de usuario no válida.'); return; }

        if (!isProviderConfigured(userId, getAIAIProvider(userId))) { setNecesitaKey(true); setPanelIA(true); return; }

        const base = extraerContextoPlanificacion(contenedor);
        const contexto = {
            ...base,
            ...(lineasActividades.length > 0 ? { actividades: lineasActividades } : {}),
            curriculum: contextoCurriculo,
        };

        if (!textoContextoAdicional && !contextoSuficiente(contexto)) {
            setPanelIA(true);
            setIaError('Escribe primero el desarrollo de tu clase o proporciona un contexto para que la IA pueda analizarlo.');
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setPanelIA(true);
        setIaError(null);
        setIaCargando(true);
        setInsertadas(new Set());
        finalizarBrocha();

        try {
            const resultado = await generarSugerenciasPedagogicas(userId, contexto, textoContextoAdicional, controller.signal);
            setSugerencias(resultado);
        } catch (err: unknown) {
            if ((err as Error)?.name !== 'AbortError') {
                setIaError((err as Error)?.message || 'Error inesperado al generar sugerencias.');
                setSugerencias(null);
            }
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
                setIaCargando(false);
            }
        }
    };

    const handleGuardarApiKeyIA = async () => {
        const userId = session?.user?.id;
        if (!userId || !apiKeyInput.trim()) return;
        saveAIKey(userId, getAIAIProvider(userId), apiKeyInput);
        setApiKeyInput('');
        setNecesitaKey(false);
        // Con la clave lista se abre el selector de actividades: la IA siempre
        // recibe el contexto real del curso antes de sugerir.
        setContextoExtra('');
        setModalActividades(true);
    };

    const handleInsertar = (clave: string, sugerencia: CategoriaSugerenciaType) => {
        activarBrocha(clave, sugerencia);
    };

    /** Llena automáticamente las columnas Conceptual, Procedimental y Actitudes en la tabla de CONTENIDOS */
    const handleLlenarTablaContenidos = useCallback(() => {
        const contenedor = document.getElementById('template-editor-container');
        if (!contenedor) return;

        asignarIdsDeCeldas();

        const celdaConc = contenedor.querySelector<HTMLElement>('[data-field-id="contenido-conceptual"]');
        const celdaProc = contenedor.querySelector<HTMLElement>('[data-field-id="contenido-procedimental"]');
        const celdaAct = contenedor.querySelector<HTMLElement>('[data-field-id="contenido-actitudes"]');

        if (!celdaConc && !celdaProc && !celdaAct) {
            alert('No se encontró la tabla de CONTENIDOS en el documento.');
            return;
        }

        let cambios = false;

        if (celdaConc && curriculo.datos.conceptuales.length > 0) {
            celdaConc.innerHTML = formatearContenidosPorUnidad(curriculo.datos.conceptuales);
            celdaConc.classList.remove('placeholder');
            celdaConc.dataset.autofilled = 'true';
            cambios = true;
        }

        if (celdaProc && curriculo.datos.procedimentales.length > 0) {
            celdaProc.innerHTML = formatearContenidosPorUnidad(curriculo.datos.procedimentales);
            celdaProc.classList.remove('placeholder');
            celdaProc.dataset.autofilled = 'true';
            cambios = true;
        }

        if (celdaAct && curriculo.datos.actitudinales.length > 0) {
            celdaAct.innerHTML = formatearContenidosPorUnidad(curriculo.datos.actitudinales);
            celdaAct.classList.remove('placeholder');
            celdaAct.dataset.autofilled = 'true';
            cambios = true;
        }

        if (cambios) {
            const htmlActualizado = contenedor.innerHTML;
            setSeq((prev) => (prev ? { ...prev, contenidoHtml: htmlActualizado } : prev));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        }
    }, [curriculo.datos]);

    const handleInputPlantilla = (e: React.FormEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null;
        if (target && target.dataset?.autofilled) {
            delete target.dataset.autofilled;
        }
    };

    /** Inserta un elemento curricular con el mismo pincel: el docente elige la celda. */
    const handleInsertarCurricular = (item: ItemCurricular) => {
        const texto = item.codigo ? `${item.codigo}: ${item.texto}` : item.texto;
        if (!texto.trim()) return;
        activarBrocha(item.id, { tipo: 'desarrollo', texto });
    };

    /** Exporta el documento tal como se ve en el editor (incluye cambios sin guardar). */
    const handleDescargarWord = async () => {
        const contenedor = document.getElementById('template-editor-container');
        if (!contenedor) {
            setWordError('No se encontró el documento de la planificación.');
            return;
        }

        setDescargandoWord(true);
        setWordError(null);
        try {
            await descargarPlanificacionDocx(contenedor, {
                asignatura: asignaturaNombre || undefined,
                curso: gradoSeccion || undefined,
                periodo: periodoSel,
                titulo: localTitulo,
                docente: docenteNombre || undefined,
                centro: centroNombre || undefined,
            });
        } catch (err) {
            setWordError((err as Error)?.message || 'No se pudo generar el archivo Word.');
        } finally {
            setDescargandoWord(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando Planificación...</p>
                </div>
            </div>
        );
    }

    if (!seq) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 text-center p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">No se encontró la planificación</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">El documento solicitado no existe o no tiene permisos para acceder.</p>
                <button
                    onClick={() => navigate('/planificacion')}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90"
                >
                    Volver a Secuencias
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-100 bg-(--background) flex flex-col w-full h-full print:static print:z-auto print:h-auto print:min-h-0 print:overflow-visible">
            <div className="bg-white border-b border-(--border-soft) px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/planificacion')}
                        className="p-2 rounded-full border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/30 transition-all outline-none"
                        title="Volver"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Título de la Planificación</label>
                        <input 
                            className="px-3 py-1.5 text-xs font-bold border border-(--border-soft) bg-(--linen)/15 text-(--ink) rounded-lg outline-none focus:border-(--primary) w-full sm:w-72 transition-colors"
                            value={localTitulo}
                            onChange={e => setLocalTitulo(e.target.value)}
                            placeholder="Ej. Unidad 1 - Comprensión lectora"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Curso Vinculado</label>
                        <select 
                            className="px-3 py-1.5 text-xs font-bold border border-(--border-soft) bg-(--linen)/15 text-(--ink) rounded-lg outline-none focus:border-(--primary) w-full sm:w-64 transition-colors cursor-pointer"
                            value={localCursoId}
                            onChange={e => setLocalCursoId(Number(e.target.value))}
                        >
                            <option value={0}>Selecciona un curso</option>
                            {opcionesCurso.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>

                    {combinacionesCurso.length > 1 && (
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Asignatura</label>
                            <select
                                className="px-3 py-1.5 text-xs font-bold border border-(--border-soft) bg-(--linen)/15 text-(--ink) rounded-lg outline-none focus:border-(--primary) w-full sm:w-40 transition-colors cursor-pointer"
                                value={comboActual?.asignatura || ''}
                                onChange={e => setAsignaturaSel(e.target.value)}
                            >
                                {combinacionesCurso.map(c => (
                                    <option key={c.asignatura} value={c.asignatura}>{c.asignaturaNombre || c.asignatura}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Período</label>
                        <select
                            className="px-3 py-1.5 text-xs font-bold border border-(--border-soft) bg-(--linen)/15 text-(--ink) rounded-lg outline-none focus:border-(--primary) w-full sm:w-24 transition-colors cursor-pointer"
                            value={periodoSel}
                            onChange={e => setPeriodoSel(e.target.value)}
                        >
                            {PERIODOS_ACADEMICOS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>


                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPanelCurricular(v => !v)}
                            disabled={!localCursoId}
                            title="Ver el currículo aplicado en el período"
                            className={`h-9 px-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm transition-all outline-none flex items-center gap-1.5 disabled:opacity-50 ${panelCurricular ? 'bg-(--primary) text-white' : 'bg-white border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/30'}`}
                        >
                            <BookOpen size={14} /> Currículo
                        </button>
                        <button
                            type="button"
                            onClick={handleClickSugerir}
                            disabled={iaCargando}
                            className={`h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm transition-all outline-none flex items-center gap-1.5 disabled:opacity-50 ${iaCargando ? 'bg-(--linen)/40 border border-(--border-soft) text-(--ink-soft)' : 'bg-white border border-(--primary)/40 text-(--primary) hover:bg-(--linen)/30 active:scale-95'}`}
                        >
                            {iaCargando ? <span className="w-3.5 h-3.5 border-2 border-(--primary) border-t-transparent rounded-full animate-spin" /> : <Sparkles size={14} />}
                            {iaCargando ? 'Analizando...' : 'Sugerir mejoras con IA'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDescargarWord()}
                            disabled={descargandoWord}
                            title="Descargar la planificación como documento Word (.docx)"
                            className="h-9 px-4 rounded-xl bg-white border border-(--border-soft) text-(--ink-soft) text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-(--linen)/30 transition-all outline-none flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <FileDown size={14} /> {descargandoWord ? 'Generando...' : 'Descargar Word'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="h-9 px-5 rounded-xl bg-(--primary) text-white text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 active:scale-95 transition-all outline-none flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Espacio de trabajo: columna curricular (izq) + documento + asistente IA (der).
                Los paneles son columnas en flujo con scroll propio: nunca tapan el documento.
                En pantallas estrechas se apilan sobre el documento con altura limitada. */}
            <div ref={workspaceRef} className="flex-1 min-h-0 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden bg-(--linen)/20 relative print:overflow-visible">
                {panelCurricular && comboActual && (
                    <div className="order-1 xl:order-1 w-full xl:w-[320px] 2xl:w-[360px] shrink-0 bg-white border-b xl:border-b-0 xl:border-r border-(--border-soft) print:hidden flex flex-col min-h-0 max-h-[26vh] xl:max-h-none">
                        <PanelCurricular
                            periodo={periodoSel}
                            grado={comboActual.grado}
                            seccion={comboActual.seccion}
                            asignatura={comboActual.asignaturaNombre || comboActual.asignatura}
                            cargando={curriculo.cargando}
                            error={curriculo.error}
                            tieneEspecificacion={curriculo.datos.tieneEspecificacion}
                            tienePeriodo={curriculo.datos.tienePeriodo}
                            competencias={curriculo.datos.competencias}
                            indicadores={curriculo.datos.indicadores}
                            contenidos={curriculo.datos.contenidos}
                            conceptuales={curriculo.datos.conceptuales}
                            procedimentales={curriculo.datos.procedimentales}
                            actitudinales={curriculo.datos.actitudinales}
                            insertados={insertadas}
                            onInsertar={handleInsertarCurricular}
                            onInsertarTodoContenidos={handleLlenarTablaContenidos}
                            onCerrar={() => setPanelCurricular(false)}
                        />
                    </div>
                )}

                <div className="order-3 xl:order-2 flex-none xl:flex-1 w-full min-w-0 min-h-0 overflow-visible xl:overflow-y-auto p-4 md:p-8 flex justify-center print:overflow-visible print:p-0">
                    <div className="w-full max-w-6xl bg-white shadow-sm border border-(--border-soft) p-8 rounded-(--radius-md) print:max-w-none print:border-0 print:shadow-none print:p-0">
                        <div 
                            id="template-editor-container"
                            className="prose prose-slate max-w-none prose-sm w-full"
                            dangerouslySetInnerHTML={{ __html: seq.contenidoHtml }}
                            onClick={handleClicPlantilla}
                            onMouseOver={handleOverPlantilla}
                            onMouseLeave={handleLeavePlantilla}
                            onInput={handleInputPlantilla}
                        />
                    </div>
                </div>

                {brocha && !celdaPendiente && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-(--primary) text-white shadow-2xl">
                        <Paintbrush size={15} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Brocha activa — haz clic en una celda para insertar</span>
                        <button
                            type="button"
                            onClick={finalizarBrocha}
                            className="ml-1 text-[10px] font-black uppercase tracking-widest underline hover:opacity-80"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {celdaPendiente && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-[min(92vw,420px)] px-4 py-3 rounded-xl bg-white border border-(--border-soft) shadow-2xl">
                        <p className="text-[11px] font-bold text-(--ink) leading-relaxed mb-2">
                            Este campo ya contiene información. ¿Deseas reemplazarla con la sugerencia de IA?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setCeldaPendiente(null)}
                                className="px-3 py-1.5 rounded-lg border border-(--border-soft) text-[10px] font-black uppercase tracking-widest text-(--ink-soft) hover:bg-(--linen)/30"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (celdaPendiente) aplicarBrocha(celdaPendiente.celda, celdaPendiente.clave, celdaPendiente.texto);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-(--primary) text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90"
                            >
                                Reemplazar
                            </button>
                        </div>
                    </div>
                )}

                {saveSuccess && (
                    <div className="fixed bottom-6 right-6 z-70 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-300">
                        Cambios guardados correctamente
                    </div>
                )}

                {wordError && (
                    <div className="fixed bottom-6 right-6 z-70 max-w-xs px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg text-xs font-bold leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {wordError}
                    </div>
                )}

                {/* Modal de actividades reales + contexto para la IA */}
                {modalActividades && (
                    <ModalActividadesContexto
                        periodo={periodoSel}
                        cursoLabel={comboActual ? `${comboActual.grado} ${comboActual.seccion}` : getCursoLabel(state.cursos.find(c => c.id === localCursoId))}
                        actividades={actividadesEstado.actividades}
                        cargando={actividadesEstado.cargando}
                        error={actividadesEstado.error}
                        seleccionados={actividadesSeleccionadas}
                        resumenCurriculo={{
                            competencias: contextoCurriculo.competencias.length,
                            indicadores: contextoCurriculo.indicadores.length,
                            contenidos: contextoCurriculo.contenidos.length,
                        }}
                        contexto={contextoExtra}
                        onContexto={setContextoExtra}
                        onAlternar={id => setActividadesSeleccionadas(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                        })}
                        onTodas={() => setActividadesSeleccionadas(new Set(actividadesEstado.actividades.map(a => a.id)))}
                        onNinguna={() => setActividadesSeleccionadas(new Set())}
                        onConfirmar={() => void handleGenerarSugerencias(contextoExtra.trim())}
                        onCerrar={() => setModalActividades(false)}
                    />
                )}

                {panelIA && (
                    <aside className="order-2 xl:order-3 w-full xl:w-[340px] 2xl:w-[400px] shrink-0 bg-white border-t xl:border-t-0 xl:border-l border-(--border-soft) print:hidden flex flex-col min-h-0 max-h-[26vh] xl:max-h-none">
                        <div className="px-5 py-4 border-b border-(--border-soft) flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-(--primary)" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-(--ink)">Asistente pedagógico</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPanelIA(false)}
                                className="p-1.5 rounded-full text-(--ink-soft) hover:bg-(--linen)/40 transition-colors"
                                title="Cerrar"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                            {necesitaKey && (
                                <div className="space-y-2.5 p-4 rounded-xl border border-(--border-soft) bg-(--linen)/20">
                                    <p className="text-[11px] font-bold text-(--ink)">Configura tu API Key de {providerDisplayName(getAIAIProvider(session?.user?.id))} para recibir sugerencias.</p>
                                    <input
                                        type="password"
                                        value={apiKeyInput}
                                        onChange={e => setApiKeyInput(e.target.value)}
                                        placeholder={`Ingresa tu clave de ${providerDisplayName(getAIAIProvider(session?.user?.id))}...`}
                                        className="w-full px-3 py-2 text-xs font-medium border border-(--border-soft) rounded-lg outline-none focus:border-(--primary)"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGuardarApiKeyIA}
                                        disabled={!apiKeyInput.trim()}
                                        className="w-full h-8 rounded-lg bg-(--primary) text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                    >
                                        Guardar y generar
                                    </button>
                                </div>
                            )}

                            {iaError && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold leading-relaxed">
                                    {iaError}
                                </div>
                            )}

                            {(lineasActividades.length > 0 || contextoCurriculo.indicadores.length > 0) && (
                                <div className="p-3 rounded-xl border border-(--border-soft) bg-(--linen)/20 space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Contexto enviado</p>
                                    <p className="text-[11px] text-(--ink) leading-relaxed">
                                        {lineasActividades.length > 0
                                            ? `${lineasActividades.length} actividad(es) real(es) del curso`
                                            : 'Sin actividades seleccionadas'}
                                        {' · '}Currículo {periodoSel}: {contextoCurriculo.indicadores.length} indicador(es),
                                        {' '}{contextoCurriculo.contenidos.length} contenido(s).
                                    </p>
                                </div>
                            )}

                            {iaCargando && (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                    <span className="w-8 h-8 border-4 border-(--primary) border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[10px] font-bold text-(--ink-soft) uppercase tracking-widest">Analizando tu planificación...</p>
                                </div>
                            )}

                            {!iaCargando && sugerencias && (
                                <>
                                    {sugerencias.inicio && sugerencias.inicio.length > 0 && (
                                        <SeccionSugerencias titulo="Inicio sugerido" items={sugerencias.inicio} prefijoClave="ini" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerenciaType => ({ tipo: 'inicio', texto: t })} />
                                    )}
                                    {sugerencias.desarrollo && sugerencias.desarrollo.length > 0 && (
                                        <SeccionSugerencias titulo="Desarrollo sugerido" items={sugerencias.desarrollo} prefijoClave="des" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerenciaType => ({ tipo: 'desarrollo', texto: t })} />
                                    )}
                                    {sugerencias.cierre && sugerencias.cierre.length > 0 && (
                                        <SeccionSugerencias titulo="Cierre sugerido" items={sugerencias.cierre} prefijoClave="cie" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerenciaType => ({ tipo: 'cierre', texto: t })} />
                                    )}
                                    {sugerencias.recursos.length > 0 && (
                                        <SeccionSugerencias titulo="Recursos sugeridos" items={sugerencias.recursos} prefijoClave="rec" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerenciaType => ({ tipo: 'recursos', texto: t })} />
                                    )}
                                    {sugerencias.estrategiaInclusiva.length > 0 && (
                                        <SeccionSugerencias titulo="Estrategia inclusiva" items={sugerencias.estrategiaInclusiva} prefijoClave="inc" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerenciaType => ({ tipo: 'estrategia', texto: t })} />
                                    )}
                                    {sugerencias.evidencias.length > 0 && (
                                        <SeccionSugerencias titulo="Evidencias del aprendizaje" items={sugerencias.evidencias} prefijoClave="evi" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerenciaType => ({ tipo: 'evidencia', texto: t })} />
                                    )}
                                    {(sugerencias.evaluacion.tecnica || sugerencias.evaluacion.instrumento || sugerencias.evaluacion.sugerencia) && (
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Evaluación</h4>
                                            {sugerencias.evaluacion.tecnica && (
                                                <ItemSugerencia texto={`Técnica: ${sugerencias.evaluacion.tecnica}`} insertada={insertadas.has('eva-tec')} onInsertar={() => handleInsertar('eva-tec', { tipo: 'tecnica', texto: sugerencias.evaluacion.tecnica })} />
                                            )}
                                            {sugerencias.evaluacion.instrumento && (
                                                <ItemSugerencia texto={`Instrumento: ${sugerencias.evaluacion.instrumento}`} insertada={insertadas.has('eva-ins')} onInsertar={() => handleInsertar('eva-ins', { tipo: 'instrumento', texto: sugerencias.evaluacion.instrumento })} />
                                            )}
                                            {sugerencias.evaluacion.sugerencia && (
                                                <p className="text-[11px] text-(--ink-soft) italic leading-relaxed pl-3 border-l-2 border-(--border-soft)">
                                                    Sugerencia: {sugerencias.evaluacion.sugerencia}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {sugerencias.metacognicion.length > 0 && (
                                        <SeccionSugerencias titulo="Metacognición" items={sugerencias.metacognicion} prefijoClave="met" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerenciaType => ({ tipo: 'metacognicion', texto: t })} />
                                    )}
                                    <p className="text-[10px] text-(--ink-soft)/70 leading-relaxed pt-2 border-t border-(--border-soft)">
                                        Recomendaciones independientes de tu texto original. Inserta solo lo que consideres útil; tu desarrollo no se modifica automáticamente.
                                    </p>
                                </>
                            )}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
