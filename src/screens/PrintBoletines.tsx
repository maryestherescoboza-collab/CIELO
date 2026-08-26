import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { AppState } from '../types';
import { computeStudentGrades } from '../utils/boletines';
import { estudiantesDelCurso, obtenerDocenteResponsable } from '../utils/aislamiento';
import { useAppStore } from '../store/appStore';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { CieloPill } from '../components/ui/CieloPill';
import { getBoletinCSSVariables } from '../utils/colorimetriaBoletines';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Import bulletin templates
import Boletin1ero from '../templates/boletines/Boletin1ero';
import Boletin2do from '../templates/boletines/Boletin2do';
import Boletin3ero from '../templates/boletines/Boletin3ero';
import Boletin4to from '../templates/boletines/Boletin4to';
import Boletin5to from '../templates/boletines/Boletin5to';
import Boletin6to from '../templates/boletines/Boletin6to';

interface PrintBoletinesProps {
    state: AppState;
    docenteNombre: string;
}

export default function PrintBoletines({ state }: PrintBoletinesProps) {
    const { cursoId: rawCursoId } = useParams<{ cursoId: string }>();
    const cursoId = Number(rawCursoId) || 0;
    const session = useAppStore(s => s.session);
    
    const { loadDashboardData } = useSupabaseData(true);
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const curso = useMemo(() => {
        return state.cursos.find(c => c.id === cursoId);
    }, [state.cursos, cursoId]);

    // Centro institucional del boletín: el del propio curso es la autoridad;
    // se cae al centro activo (panel) o al centro del perfil del docente.
    const centroId = useMemo(() =>
        curso?.centroId ||
        state.centroRolActual?.centro_id ||
        state.perfiles.find(p => p.userId === session?.user?.id)?.centro_id ||
        null,
        [curso, state.centroRolActual, state.perfiles, session?.user?.id]
    );

    const estudiantes = useMemo(() => {
        if (!curso) return [];
        return estudiantesDelCurso(state.cursos, state.estudiantes, curso, centroId);
    }, [state.cursos, state.estudiantes, curso, centroId]);

    // Automatically trigger browser print dialog once rendered
    useEffect(() => {
        if (estudiantes.length > 0) {
            // Small delay to ensure all images and styles are fully loaded
            const timer = setTimeout(() => {
                window.print();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [estudiantes]);

    // Helper to calculate grades for a student, a specific subject, and all periods + competencies
    const studentGrades = useMemo(() => computeStudentGrades(estudiantes, state, cursoId, curso, centroId), [estudiantes, state, cursoId, curso, centroId]);

    // Docente responsable REAL del curso (curso.userId → perfil). El usuario
    // que imprime puede ser un administrador o director; el boletín siempre
    // muestra al docente responsable del curso.
    const docenteResponsable = useMemo(
        () => obtenerDocenteResponsable(state.perfiles, curso),
        [state.perfiles, curso]
    );

    // Select the correct template based on course grade/degree (curso.grado)
    const TemplateComponent = useMemo(() => {
        if (!curso) return Boletin2do;
        const grado = (curso.grado || '').toLowerCase();
        if (grado.includes('1')) return Boletin1ero;
        if (grado.includes('2')) return Boletin2do;
        if (grado.includes('3')) return Boletin3ero;
        if (grado.includes('4')) return Boletin4to;
        if (grado.includes('5')) return Boletin5to;
        if (grado.includes('6')) return Boletin6to;
        return Boletin2do; // fallback default
    }, [curso]);

    if (!curso) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-slate-800 font-bold p-8">
                El curso seleccionado no existe o no tiene datos válidos.
            </div>
        );
    }

    if (estudiantes.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-800 p-8 text-center">
                <h2 className="text-xl font-bold">No hay estudiantes matriculados en este curso</h2>
                <p className="text-slate-400 mt-2">Agrega estudiantes antes de intentar imprimir boletines.</p>
            </div>
        );
    }

    return (
        <div className="boletines-print-layout">
            <style dangerouslySetInnerHTML={{ __html: `
                .print-floating-bar {
                  position: fixed;
                  bottom: 24px;
                  right: 24px;
                  background: #FDFBF7;
                  color: #2E3330;
                  padding: 10px 20px;
                  border-radius: 100px;
                  border: 1px solid rgba(46, 51, 48, 0.08);
                  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                  z-index: 100;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  font-family: system-ui, sans-serif;
                  font-size: 11px;
                  font-weight: bold;
                }
                .print-floating-bar button {
                  background: var(--primary);
                  border: none;
                  color: white;
                  padding: 6px 14px;
                  border-radius: 100px;
                  font-weight: bold;
                  cursor: pointer;
                  transition: background 0.2s;
                }
                .print-floating-bar button:hover {
                  background: #6C7E5C;
                }
                @media print {
                  *, *::before, *::after {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .no-print { display: none !important; }
                }
            ` }} />

            {/* FLOATING ACTION BAR FOR PREVIEW/MANUAL TRIGGER */}
            <div className="print-floating-bar no-print">
                <span>Preparado para imprimir ({estudiantes.length} boletines)</span>
                <CieloPill as="button" onClick={() => window.print()} variant="primary" className="h-8">Imprimir ahora</CieloPill>
            </div>

            <div style={getBoletinCSSVariables(curso?.grado)}>
                <ErrorBoundary>
                    <TemplateComponent
                        curso={curso}
                        estudiantes={estudiantes}
                        docenteNombre={docenteResponsable}
                        studentGrades={studentGrades}
                        state={state}
                    />
                </ErrorBoundary>
            </div>
        </div>
    );
}
