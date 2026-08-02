import { useState, useEffect } from 'react';

import { useSimulatorStore } from '../../store/useSimulatorStore';
import { useCursoDetalleData } from '../../../../hooks/useCursoDetalleData';
import CursoDetalleHeader from './SimCursoDetalleHeader';
import GradeTable from './SimGradeTable';
import RubricModal from './SimRubrica';
import VincularDocentesModal from '../../../../components/curso-detalle/VincularDocentesModal';
import type { BCKey, Estudiante } from '../../../../types';
import { BC_ICONS, BC_COLOR_THEMES } from '../../../../constants/competencias';
import { getGradeClass } from '../../../../utils/academic';
import { getAsignaturaNombre } from '../../../../constants/asignaturas';
import SimTutorialOverlay from './SimTutorialOverlay';

// Props removed

export default function CursoDetalle() {
    const cursoId = 999;
    
    const store = useSimulatorStore();
    const state = store.state;

    const currentUserId = "demo";
    const currentCourseRole = state.cursoDocentes[0];

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
    } = useCursoDetalleData({ state, cursoId, currentUserId, currentCourseRole });

    const [showVincular, setShowVincular] = useState(false);

    const onSave = async () => {
        setIsSaving(true);
        try {
            if (true) {
                await store.saveCalificaciones(localCalifs, localRecs, cursoId);
            }
            setIsDirty(false);
        } finally {
            setIsSaving(false);
        }
    };

    const onAddActividad = () => {
        if ((undefined as any)?. onAddActividad) {
            (undefined as any)?. onAddActividad({
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
        
        if ((undefined as any)?. onUpdateActividad) {
            (undefined as any)?. onUpdateActividad(actId, { bcAsignados: Array.from(next) });
        }
    };

    const deleteEstudiantesCurso = async (cId: number) => {
        if ((undefined as any)?. onDeleteEstudiante) {
            const studentsToDelete = state.estudiantes.filter((e: Estudiante) => e.cursoId === cId);
            for (const est of studentsToDelete) {
                await (undefined as any)?. onDeleteEstudiante(est.id);
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
        <div className="relative w-full h-full flex flex-col bg-slate-50 overflow-hidden" onMouseDown={() => isPointMode && setIsDragging(true)}>
            <CursoDetalleHeader 
                curso={curso}
                buscar={buscar}
                setBuscar={setBuscar}
                isDirty={isDirty}
                isSaving={isSaving}
                onSave={onSave}
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
                onUpdateActividad={(id, act) => (undefined as any)?. onUpdateActividad?.(id, act)}
                onUpdateEstudiante={(id, est) => (undefined as any)?. onUpdateEstudiante?.(id, est)}
                onDeleteActividad={(actId) => (undefined as any)?. onDeleteActividad?.(actId)}
                onToggleBc={onToggleBc}
                onAddEstudiante={() => (undefined as any)?. onAddEstudiante?.(cursoId, 'Nuevo', 'Estudiante')}
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
                onToggleDocenteCurso={(cId, tUid, r, a) => (undefined as any)?. onToggleDocenteCurso?.(cId, tUid, r, a)}
                getAsignaturaNombre={getAsignaturaNombre}
            />
        <SimTutorialOverlay /></div>
    );
}

