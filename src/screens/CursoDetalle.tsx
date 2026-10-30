import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useCursoDetalleData } from '../hooks/useCursoDetalleData';
import CursoDetalleHeader from '../components/curso-detalle/CursoDetalleHeader';
import GradeTable from '../components/curso-detalle/GradeTable';
import RecuperacionCotejoModal from '../components/curso-detalle/RecuperacionCotejoModal';
import VincularDocentesModal from '../components/curso-detalle/VincularDocentesModal';
import AgregarActividadModal from '../components/curso-detalle/AgregarActividadModal';
import ActivityWorkspace from '../components/curso-detalle/workspace/ActivityWorkspace';
import { CieloModal } from '../components/ui/CieloModal';
import { AlertTriangle } from 'lucide-react';
import type { BCKey, Curso, Actividad, CalificacionActividad, RecuperacionBC, RecuperacionCotejo, ContextoRecuperacion, CursoDocente, Estudiante } from '../types';
import { BC_ICONS, BC_COLOR_THEMES } from '../constants/competencias';
import { PRODUCTO_FINAL_NAME } from '../constants/productoFinal';
import { getGradeClass } from '../utils/academic';
import { getAsignaturaNombre } from '../constants/asignaturas';

import { useSupabaseData } from '../hooks/useSupabaseData';

interface Props {
    currentCourseRole?: CursoDocente;
    cursoId?: number;
    currentUserId?: string;
    onSaveCurso?: (c: Curso) => void;
    onAddEstudiante?: (cursoId: number, nombre: string, apellido: string, numeroLista?: number) => Promise<any>;
    onAddEstudianteEnPosicion?: (cursoId: number, nombre: string, apellido: string, posicion: number) => Promise<any>;
    onReordenarEstudiantePosicion?: (estudianteId: number, posicionDestino: number) => Promise<boolean>;
    onUpdateEstudiante?: (id: number, e: Partial<Estudiante>) => void;
    onDeleteEstudiante?: (id: number) => Promise<any>;
    onAddActividad?: (a: Omit<Actividad, 'id'>) => Promise<any>;
    onUpdateActividad?: (id: number, a: Partial<Actividad>) => Promise<any>;
    onDeleteActividad?: (id: number) => Promise<any>;
    onAddSecuencia?: (s: Omit<import('../types').Secuencia, 'id'>) => Promise<import('../types').Secuencia | null>;
    onUpdateSecuencia?: (s: import('../types').Secuencia) => Promise<void>;
    onSaveCalificaciones?: (califs: CalificacionActividad[], recs: RecuperacionBC[], cursoId: number) => Promise<any>;
    onSaveRecuperacionCotejo?: (detalle: RecuperacionCotejo[], cursoId: number, contextos?: ContextoRecuperacion[]) => Promise<void>;
    onToggleDocenteCurso?: (cId: number, tUid: string, r: 'tutor'|'co-docente', a: string) => void;
}

export default function CursoDetalle(props: Props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const cursoId = Number(id) || props.cursoId || 0;
    
    const store = useAppStore();
    const state = store.state;
    const { loadCursoData } = useSupabaseData(true);

    useEffect(() => {
        if (cursoId) {
            loadCursoData(cursoId);
        }
    }, [cursoId, loadCursoData]);

    const currentUserId = props.currentUserId || store.session?.user?.id || '';

    // Leer el parámetro asignatura de la URL para identificar el contexto correcto
    const searchParams = new URLSearchParams(window.location.search);
    const urlAsignatura = searchParams.get('asignatura');

    const currentCourseRole = props.currentCourseRole || state.cursoDocentes.find((cd: CursoDocente) => 
        cd.cursoId === cursoId && 
        cd.userId === currentUserId &&
        (!urlAsignatura || cd.asignatura === urlAsignatura)
    ) || (urlAsignatura ? undefined : state.cursoDocentes.find((cd: CursoDocente) => cd.cursoId === cursoId && cd.userId === currentUserId));

    const {
        curso,
        selectedPeriodo,
        setSelectedPeriodo,
        buscar,
        setBuscar,
        evalMode,
        setEvalMode,
        showRecoveryOnly,
        setShowRecoveryOnly,
        activePaintColor,
        setActivePaintColor,
        rubricTarget,
        setRubricTarget,
        isSaving,
        saveStatus,
        saveError,
        saveCalifs,
        flushSave,
        retrySave,
        restoredFromBackupCount,
        academicWarnings,
        isDragging,
        setIsDragging,
        focusedCell,
        setFocusedCell,
        isFullScreen,
        setIsFullScreen,
        gradeAnimations,
        localCalifs,
        localRecCotejo,
        setCotejoCelda,
        saveCotejo,
        discardCotejo,
        isSavingCotejo,
        bcSel,
        setBcSel,
        actividades,
        enhancedEstudiantes,
        allCourseStudents,
        setCalif,
        setCalifsBatch,
        triggerAnimation,
        isDirty,
        isDirtyCotejo,
        myAsignatura,
        sharedCourseId
    } = useCursoDetalleData({ state, cursoId, currentUserId, currentCourseRole, onSaveCalificaciones: props.onSaveCalificaciones, onSaveRecuperacionCotejo: props.onSaveRecuperacionCotejo });

    const [showVincular, setShowVincular] = useState(false);
    const [showAgregarActividad, setShowAgregarActividad] = useState(false);
    const [visibleActivityId, setVisibleActivityId] = useState<number | null>(null);
    const [showWarningsModal, setShowWarningsModal] = useState(false);
    const [periodLoading, setPeriodLoading] = useState(false);
    const [periodError, setPeriodError] = useState<string | null>(null);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportExcel = async () => {
        if (periodLoading || isExportingExcel) return;
        setIsExportingExcel(true);
        try {
            const { exportarRegistroAcademicoExcel } = await import('../utils/excelExport');
            await exportarRegistroAcademicoExcel({
                curso,
                periodo: selectedPeriodo,
                estudiantes: allCourseStudents || enhancedEstudiantes
            });
        } catch (error) {
            console.error('[CursoDetalle] Error exportando registro a Excel:', error);
            alert('No se pudo generar el archivo Excel. Por favor, intenta de nuevo.');
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handlePeriodoChange = async (p: string) => {
        if (p === selectedPeriodo) return;
        if (isDirty) {
            try {
                await flushSave();
            } catch (err) {
                console.error("Error guardando antes de cambiar período:", err);
            }
        }
        setSelectedPeriodo(p);
        setPeriodLoading(true);
        setPeriodError(null);
        try {
            await loadCursoData(cursoId, p);
        } catch (err: any) {
            console.error(`Error al cargar datos del período ${p}:`, err);
            setPeriodError(`No se pudieron sincronizar los datos de ${p}. Conservando datos existentes.`);
        } finally {
            setPeriodLoading(false);
        }
    };

    const handleBack = async () => {
        if (isDirty) {
            const saved = await flushSave();
            if (!saved) {
                const proceed = window.confirm(
                    'No se pudieron confirmar todas las calificaciones en el servidor. Si sales ahora, algunas modificaciones recientes podrían no guardarse. ¿Deseas salir de todas formas?'
                );
                if (!proceed) return;
            }
        }
        navigate('/cursos');
    };

    // Candado para evitar creación concurrente por React Strict Mode o doble petición del usuario.
    const creatingPFRef = useRef<string | null>(null);

    // Auto-crear Producto Final si no existe para este curso+asignatura+periodo
    useEffect(() => {
        if (!curso || !currentUserId || !selectedPeriodo) return;
        
        const exists = state.actividades.some(a => 
            a.cursoId === cursoId && 
            a.nombre === PRODUCTO_FINAL_NAME && 
            a.periodo === selectedPeriodo &&
            (!a.asignatura || a.asignatura === myAsignatura) &&
            (a.userId === currentUserId || !a.userId)
        );
        
        const pfKey = `${cursoId}-${selectedPeriodo}-${myAsignatura}`;

        if (!exists && props.onAddActividad && creatingPFRef.current !== pfKey) {
            creatingPFRef.current = pfKey;
            
            Promise.resolve(props.onAddActividad({
                nombre: PRODUCTO_FINAL_NAME,
                cursoId,
                sharedCourseId,
                periodo: selectedPeriodo,
                asignatura: myAsignatura,
                bcAsignados: ['BC1'],
                userId: currentUserId,
                fecha: new Date().toISOString().split('T')[0],
                isProductoFinal: true
            })).catch((err) => {
                const isUniqueViolation = err?.code === '23505' || 
                                          err?.message?.includes('duplicate key') || 
                                          err?.message?.includes('unique constraint');
                if (isUniqueViolation) {
                    console.log('[CursoDetalle] Producto Final ya existe (conflicto de unicidad capturado).');
                } else {
                    throw err;
                }
            }).finally(() => {
                setTimeout(() => { creatingPFRef.current = null; }, 1000);
            });
        }
    }, [curso, cursoId, currentUserId, selectedPeriodo, state.actividades, props.onAddActividad, myAsignatura, sharedCourseId]);

    const onSave = async () => {
        await saveCalifs();
    };

    const onAddActividad = () => {
        if (props.onAddActividad) {
            setShowAgregarActividad(true);
        }
    };

    const confirmAgregarActividad = async (indicador: string, producto: string): Promise<boolean> => {
        if (!curso || !props.onAddActividad) return false;
        const result = await props.onAddActividad({
            nombre: `Actividad ${actividades.length + 1}`,
            cursoId,
            sharedCourseId,
            periodo: selectedPeriodo,
            asignatura: myAsignatura,
            bcAsignados: ['BC1'],
            userId: currentUserId,
            fecha: new Date().toISOString().split('T')[0],
            indicador,
            producto
        });
        return !!result;
    };

    const onToggleBc = (actId: number, bc: BCKey) => {
        const current = bcSel[actId] || new Set();
        const next = new Set(current);
        if (next.has(bc)) {
            if (next.size > 1) next.delete(bc);
        } else {
            next.add(bc);
        }
        
        setBcSel(prev => ({ ...prev, [actId]: next }));
        
        if (props.onUpdateActividad) {
            props.onUpdateActividad(actId, { bcAsignados: Array.from(next) });
        }
    };

    const deleteEstudiantesCurso = async (cId: number) => {
        if (props.onDeleteEstudiante) {
            const studentsToDelete = state.estudiantes.filter((e: Estudiante) => e.cursoId === cId);
            for (const est of studentsToDelete) {
                await props.onDeleteEstudiante(est.id);
            }
        }
    };

    const targetEst = enhancedEstudiantes.find(e => e.id === rubricTarget?.estId);

    useEffect(() => {
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [setIsDragging]);

    if (!curso) return null;

    return (
        <div className={`fixed inset-0 z-50 flex flex-col bg-(--background) transition-all duration-500 ${isFullScreen ? 'm-0' : 'm-4 rounded-(--radius-lg) overflow-hidden shadow-md border border-(--border-soft)'}`} onMouseDown={() => evalMode === 'pincel' && setIsDragging(true)}>
            <CursoDetalleHeader 
                curso={curso}
                buscar={buscar}
                setBuscar={setBuscar}
                isDirty={isDirty || isDirtyCotejo}
                isSaving={isSaving}
                saveStatus={saveStatus}
                saveError={saveError}
                onRetrySave={retrySave}
                onSave={onSave}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
                onBack={handleBack}
                showRecoveryOnly={showRecoveryOnly}
                setShowRecoveryOnly={setShowRecoveryOnly}
                evalMode={evalMode}
                setEvalMode={setEvalMode}
                activePaintColor={activePaintColor}
                setActivePaintColor={setActivePaintColor}
                onShowVincular={() => setShowVincular(true)}
                onShowEliminarEstudiantes={() => { if(confirm('¿ELIMINAR TODOS LOS ESTUDIANTES?')) deleteEstudiantesCurso(cursoId); }}
                selectedPeriodo={selectedPeriodo}
                onPeriodoChange={handlePeriodoChange}
                periodLoading={periodLoading}
                periodError={periodError}
                academicWarningsCount={academicWarnings.length}
                onShowWarnings={() => setShowWarningsModal(true)}
                onAddActividad={onAddActividad}
                isTutor={!currentCourseRole || currentCourseRole.rol === 'tutor'}
                onExportExcel={handleExportExcel}
                isExporting={isExportingExcel}
            />

            {restoredFromBackupCount > 0 && (
                <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs text-emerald-800 font-medium">
                    <span>
                        ✓ Se recuperaron exitosamente {restoredFromBackupCount} calificación{restoredFromBackupCount > 1 ? 'es' : ''} no guardada{restoredFromBackupCount > 1 ? 's' : ''} de una sesión previa.
                    </span>
                    <button
                        onClick={onSave}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                        Guardar ahora
                    </button>
                </div>
            )}

            <GradeTable 
                actividades={actividades}
                estudiantes={enhancedEstudiantes}
                estudiantesRealesCurso={state.estudiantes.filter(e => Number(e.cursoId) === cursoId)}
                bcSel={bcSel}
                isDragging={isDragging}
                evalMode={evalMode}
                activePaintColor={activePaintColor}
                focusedCell={focusedCell}
                gradeAnimations={gradeAnimations}
                onSetGrade={(estId, actId, val) => {
                    setCalif(estId, actId, val);
                    if (val !== null) triggerAnimation(estId, actId, val);
                }}
                onSetGradesBatch={(updates) => {
                    setCalifsBatch(updates);
                    updates.forEach(u => {
                        if (u.val !== null) triggerAnimation(u.estId, u.actId, u.val);
                    });
                }}
                onSetFocusedCell={setFocusedCell}
                onAddActividad={onAddActividad}
                onUpdateActividad={(id, act) => props.onUpdateActividad?.(id, act)}
                onUpdateEstudiante={(id, est) => props.onUpdateEstudiante?.(id, est)}
                onDeleteActividad={(actId) => props.onDeleteActividad?.(actId)}
                onToggleBc={onToggleBc}
                onAddEstudiante={(nombre = 'Nuevo', apellido = 'Estudiante', numeroLista) => props.onAddEstudiante?.(cursoId, nombre, apellido, numeroLista)}
                onAddEstudianteEnPosicion={async (nombre, apellido, posicion) => {
                    if (!props.onAddEstudianteEnPosicion) return null;
                    const result = await props.onAddEstudianteEnPosicion(cursoId, nombre, apellido, posicion);
                    if (result) {
                        loadCursoData(cursoId);
                    }
                    return result;
                }}
                onReordenarEstudiante={async (id, pos) => {
                    if (!props.onReordenarEstudiantePosicion) return false;
                    const ok = await props.onReordenarEstudiantePosicion(id, pos);
                    if (ok) {
                        loadCursoData(cursoId);
                    }
                    return ok;
                }}
                onDeleteEstudiante={(id) => props.onDeleteEstudiante?.(id)}
                onSetRubricTarget={setRubricTarget}
                getGradeClass={getGradeClass}
                BC_COLOR_THEMES={BC_COLOR_THEMES}
                BC_ICONS={BC_ICONS}
                openActivityId={visibleActivityId}
                onOpenActivityView={setVisibleActivityId}
            />

            {visibleActivityId !== null && (() => {
                const selectedAct = actividades.find(a => a.id === visibleActivityId);
                if (!selectedAct) return null;
                return (
                    <ActivityWorkspace
                        key={selectedAct.id}
                        activity={selectedAct}
                        actividades={actividades}
                        bcSel={bcSel}
                        onClose={() => setVisibleActivityId(null)}
                        onUpdateActividad={(id, patch) => props.onUpdateActividad?.(id, patch)}
                        onAddSecuencia={props.onAddSecuencia}
                        onUpdateSecuencia={props.onUpdateSecuencia}
                        onToggleBc={onToggleBc}
                    />
                );
            })()}

            <RecuperacionCotejoModal 
                targetEst={targetEst}
                target={rubricTarget}
                onClose={() => {
                    discardCotejo();
                    setRubricTarget(null);
                }}
onSetCelda={setCotejoCelda}
                   onSave={(contextos) => saveCotejo(contextos)}
                isSaving={isSavingCotejo}
                isDirty={isDirtyCotejo}
                selectedPeriodo={selectedPeriodo}
                BC_COLOR_THEMES={BC_COLOR_THEMES}
                BC_ICONS={BC_ICONS}
                celdas={localRecCotejo}
                actividades={actividades}
                calificaciones={localCalifs}
            />

            <VincularDocentesModal 
                show={showVincular}
                onClose={() => setShowVincular(false)}
                state={state}
                cursoId={cursoId}
                currentUserId={currentUserId!}
                onToggleDocenteCurso={(cId, tUid, r, a) => props.onToggleDocenteCurso?.(cId, tUid, r, a)}
                getAsignaturaNombre={getAsignaturaNombre}
            />

            <AgregarActividadModal
                show={showAgregarActividad}
                onClose={() => setShowAgregarActividad(false)}
                onConfirm={confirmAgregarActividad}
            />

            {showWarningsModal && (
                <CieloModal
                    isOpen={showWarningsModal}
                    onClose={() => setShowWarningsModal(false)}
                    title="Control de Integridad Pedagógica"
                >
                    <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                        <p className="text-sm text-[#5F665E]">
                            Se han detectado situaciones en las actividades que pueden afectar el cómputo de los promedios. Ninguna calificación ha sido eliminada. Puedes revisarlas o corregirlas a continuación:
                        </p>
                        {academicWarnings.length === 0 ? (
                            <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                ✓ Todas las actividades evaluadas están correctamente vinculadas y participando en los promedios.
                            </p>
                        ) : (
                            academicWarnings.map((w, idx) => (
                                <div key={idx} className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                                            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                                            {w.actividadNombre}
                                        </h4>
                                        <p className="text-xs text-amber-800 leading-relaxed">
                                            {w.mensaje}
                                        </p>
                                    </div>
                                    {w.tipo === 'sin_competencia' && (
                                        <button
                                            onClick={() => {
                                                onToggleBc(w.actividadId, 'BC1');
                                            }}
                                            className="shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                                        >
                                            {w.accionTexto}
                                        </button>
                                    )}
                                    {w.tipo === 'periodo_inconsistente' && props.onUpdateActividad && (
                                        <button
                                            onClick={() => {
                                                props.onUpdateActividad?.(w.actividadId, { periodo: selectedPeriodo });
                                            }}
                                            className="shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                                        >
                                            Asignar {selectedPeriodo}
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setShowWarningsModal(false)}
                                className="px-4 py-2 bg-[#2E3330] text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-black transition-all cursor-pointer"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </CieloModal>
            )}
        </div>
    );
}

