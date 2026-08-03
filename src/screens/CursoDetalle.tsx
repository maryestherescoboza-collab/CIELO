import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useCursoDetalleData } from '../hooks/useCursoDetalleData';
import CursoDetalleHeader from '../components/curso-detalle/CursoDetalleHeader';
import GradeTable from '../components/curso-detalle/GradeTable';
import RubricModal from '../components/curso-detalle/RubricModal';
import VincularDocentesModal from '../components/curso-detalle/VincularDocentesModal';
import type { BCKey, Curso, Actividad, CalificacionActividad, RecuperacionBC, CursoDocente, Estudiante } from '../types';
import { BC_ICONS, BC_COLOR_THEMES } from '../constants/competencias';
import { getGradeClass } from '../utils/academic';
import { getAsignaturaNombre } from '../constants/asignaturas';

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
    onSaveCalificaciones?: (califs: CalificacionActividad[], recs: RecuperacionBC[], cursoId: number) => Promise<any>;
    onToggleDocenteCurso?: (cId: number, tUid: string, r: 'tutor'|'co-docente', a: string) => void;
}

export default function CursoDetalle(props: Props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const cursoId = Number(id) || props.cursoId || 0;
    
    const store = useAppStore();
    const state = store.state;

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
        bcSel,
        setBcSel,
        actividades,
        enhancedEstudiantes,
        setCalif,
        setRec,
        triggerAnimation,
        isDirty,
        setIsDirty,
        myAsignatura,
        sharedCourseId
    } = useCursoDetalleData({ state, cursoId, currentUserId, currentCourseRole, onSaveCalificaciones: props.onSaveCalificaciones });

    const [showVincular, setShowVincular] = useState(false);

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
            props.onAddActividad({
                nombre: `Actividad ${actividades.length + 1}`,
                cursoId,
                sharedCourseId,
                periodo: selectedPeriodo,
                asignatura: myAsignatura,
                bcAsignados: ['BC1'],
                userId: currentUserId,
                fecha: new Date().toISOString().split('T')[0]
            });
        }
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
        <div className={`fixed inset-0 z-50 flex flex-col bg-slate-50 transition-all duration-500 ${isFullScreen ? 'm-0' : 'm-4 rounded-3xl overflow-hidden shadow-2xl border border-slate-200'}`} onMouseDown={() => isPointMode && setIsDragging(true)}>
            <CursoDetalleHeader 
                curso={curso}
                buscar={buscar}
                setBuscar={setBuscar}
                isDirty={isDirty}
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
                onAddEstudiante={() => props.onAddEstudiante?.(cursoId, 'Nuevo', 'Estudiante')}
                onSetRubricTarget={setRubricTarget}
                getGradeClass={getGradeClass}
                BC_COLOR_THEMES={BC_COLOR_THEMES}
                BC_ICONS={BC_ICONS}
            />

            <RubricModal 
                targetEst={targetEst}
                rubricTarget={rubricTarget}
                onClose={() => setRubricTarget(null)}
                onSetRec={setRec}
                selectedPeriodo={selectedPeriodo}
                BC_COLOR_THEMES={BC_COLOR_THEMES}
                BC_ICONS={BC_ICONS}
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
        </div>
    );
}

