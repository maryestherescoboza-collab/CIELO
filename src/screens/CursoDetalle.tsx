import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useCursoDetalleData } from '../hooks/useCursoDetalleData';
import CursoDetalleHeader from '../components/curso-detalle/CursoDetalleHeader';
import GradeTable from '../components/curso-detalle/GradeTable';
import RecuperacionCotejoModal from '../components/curso-detalle/RecuperacionCotejoModal';
import VincularDocentesModal from '../components/curso-detalle/VincularDocentesModal';
import AgregarActividadModal from '../components/curso-detalle/AgregarActividadModal';
import ActivityWorkspace from '../components/curso-detalle/workspace/ActivityWorkspace';
import type { BCKey, Curso, Actividad, CalificacionActividad, RecuperacionBC, RecuperacionCotejo, ContextoRecuperacion, CursoDocente, Estudiante } from '../types';
import { BC_ICONS, BC_COLOR_THEMES } from '../constants/competencias';
import { getGradeClass } from '../utils/academic';
import { getAsignaturaNombre } from '../constants/asignaturas';

import { useSupabaseData } from '../hooks/useSupabaseData';

interface Props {
    currentCourseRole?: CursoDocente;
    cursoId?: number;
    currentUserId?: string;
    onSaveCurso?: (c: Curso) => void;
    onAddEstudiante?: (cursoId: number, nombre: string, apellido: string) => Promise<any>;
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
    const currentCourseRole = props.currentCourseRole || state.cursoDocentes.find((cd: CursoDocente) => cd.cursoId === cursoId && cd.userId === currentUserId);

    const {
        curso,
        selectedPeriodo,
        setSelectedPeriodo,
        buscar,
        setBuscar,
        isPointMode,
        setIsPointMode,
        showRecoveryOnly,
        setShowRecoveryOnly,
        activePaintColor,
        setActivePaintColor,
        rubricTarget,
        setRubricTarget,
        isSaving,
        setIsSaving,
        isDragging,
        setIsDragging,
        focusedCell,
        setFocusedCell,
        isFullScreen,
        setIsFullScreen,
        gradeAnimations,
        localCalifs,
        localRecs,
        localRecCotejo,
        setCotejoCelda,
        saveCotejo,
        discardCotejo,
        isSavingCotejo,
        bcSel,
        setBcSel,
        actividades,
        enhancedEstudiantes,
        setCalif,
        triggerAnimation,
        isDirty,
        isDirtyCotejo,
        setIsDirty,
        myAsignatura,
        sharedCourseId
    } = useCursoDetalleData({ state, cursoId, currentUserId, currentCourseRole, onSaveCalificaciones: props.onSaveCalificaciones, onSaveRecuperacionCotejo: props.onSaveRecuperacionCotejo });

    const [showVincular, setShowVincular] = useState(false);
    const [showAgregarActividad, setShowAgregarActividad] = useState(false);
    const [visibleActivityId, setVisibleActivityId] = useState<number | null>(null);

    const onSave = async () => {
        setIsSaving(true);
        try {
            if (props.onSaveCalificaciones) {
                await props.onSaveCalificaciones(localCalifs, localRecs, cursoId);
            }
            setIsDirty(false);
        } finally {
            setIsSaving(false);
        }
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
        <div className={`fixed inset-0 z-50 flex flex-col bg-(--background) transition-all duration-500 ${isFullScreen ? 'm-0' : 'm-4 rounded-(--radius-lg) overflow-hidden shadow-md border border-(--border-soft)'}`} onMouseDown={() => isPointMode && setIsDragging(true)}>
            <CursoDetalleHeader 
                curso={curso}
                buscar={buscar}
                setBuscar={setBuscar}
                isDirty={isDirty || isDirtyCotejo}
                isSaving={isSaving}
                onSave={onSave}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
                onBack={() => navigate('/cursos')}
                showRecoveryOnly={showRecoveryOnly}
                setShowRecoveryOnly={setShowRecoveryOnly}
                isPointMode={isPointMode}
                setIsPointMode={setIsPointMode}
                activePaintColor={activePaintColor}
                setActivePaintColor={setActivePaintColor}
                onShowVincular={() => setShowVincular(true)}
                onShowEliminarEstudiantes={() => { if(confirm('¿ELIMINAR TODOS LOS ESTUDIANTES?')) deleteEstudiantesCurso(cursoId); }}
                selectedPeriodo={selectedPeriodo}
                onPeriodoChange={setSelectedPeriodo}
                onAddActividad={onAddActividad}
                isTutor={!currentCourseRole || currentCourseRole.rol === 'tutor'}
            />

            <GradeTable 
                actividades={actividades}
                estudiantes={enhancedEstudiantes}
                bcSel={bcSel}
                isDragging={isDragging}
                isPointMode={isPointMode}
                activePaintColor={activePaintColor}
                focusedCell={focusedCell}
                gradeAnimations={gradeAnimations}
                onSetGrade={(estId, actId, val) => {
                    setCalif(estId, actId, val);
                    if (val !== null) triggerAnimation(estId, actId, val);
                }}
                onSetFocusedCell={setFocusedCell}
                onAddActividad={onAddActividad}
                onUpdateActividad={(id, act) => props.onUpdateActividad?.(id, act)}
                onUpdateEstudiante={(id, est) => props.onUpdateEstudiante?.(id, est)}
                onDeleteActividad={(actId) => props.onDeleteActividad?.(actId)}
                onToggleBc={onToggleBc}
                onAddEstudiante={(nombre = 'Nuevo', apellido = 'Estudiante') => props.onAddEstudiante?.(cursoId, nombre, apellido)}
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
        </div>
    );
}

