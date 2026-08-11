import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { AppState, Curso } from '../../types';
import { computeStudentGrades } from '../../utils/boletines';

import Boletin1ero from '../../templates/boletines/Boletin1ero';
import Boletin2do from '../../templates/boletines/Boletin2do';
import Boletin3ero from '../../templates/boletines/Boletin3ero';
import Boletin4to from '../../templates/boletines/Boletin4to';
import Boletin5to from '../../templates/boletines/Boletin5to';
import Boletin6to from '../../templates/boletines/Boletin6to';

interface Props {
    curso: Curso;
    state: AppState;
    docenteNombre: string;
    onClose: () => void;
}

// Overlay de impresión de boletines. Renderiza todos los boletines del curso
// en la misma ventana y dispara el diálogo de impresión (guardar como PDF).
export default function BoletinesPrintOverlay({ curso, state, docenteNombre, onClose }: Props) {
    const estudiantes = useMemo(() =>
        state.estudiantes
            .filter(e => e.cursoId === curso.id || (curso.sharedCourseId && e.sharedCourseId === curso.sharedCourseId))
            .sort((a, b) => (a.numeroLista || 0) - (b.numeroLista || 0)),
        [state.estudiantes, curso]
    );

    const studentGrades = useMemo(
        () => computeStudentGrades(estudiantes, state, curso.id, curso),
        [estudiantes, state, curso]
    );

    const TemplateComponent = useMemo(() => {
        const grado = (curso.grado || '').toLowerCase();
        if (grado.includes('1')) return Boletin1ero;
        if (grado.includes('2')) return Boletin2do;
        if (grado.includes('3')) return Boletin3ero;
        if (grado.includes('4')) return Boletin4to;
        if (grado.includes('5')) return Boletin5to;
        if (grado.includes('6')) return Boletin6to;
        return Boletin2do;
    }, [curso]);

    useEffect(() => {
        const timer = setTimeout(() => window.print(), 1200);
        const afterPrint = () => onClose();
        window.addEventListener('afterprint', afterPrint);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('afterprint', afterPrint);
        };
    }, [onClose]);

    const content = (
        <div className="boletines-print-overlay fixed inset-0 z-[9999] overflow-y-auto bg-white">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body > *:not(.boletines-print-overlay) { display: none !important; }
                    .boletines-print-overlay { position: static !important; inset: auto !important; overflow: visible !important; height: auto !important; }
                    .print-toolbar { display: none !important; }
                }
            ` }} />
            <div className="print-toolbar fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-[rgba(46,51,48,0.08)] rounded-full px-5 py-3 shadow-xl">
                <span className="text-xs font-bold text-[#2E3330]">
                    {estudiantes.length} boletines · {curso.grado} {curso.seccion}
                </span>
                <button
                    onClick={() => window.print()}
                    className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-[#6C7E5C] transition-colors"
                >
                    Imprimir
                </button>
                <button
                    onClick={onClose}
                    className="text-[#5F665E] px-3 py-1.5 rounded-full text-xs font-bold border border-[rgba(46,51,48,0.08)] hover:bg-[#F9F8F6] transition-colors"
                >
                    Cerrar
                </button>
            </div>
            <TemplateComponent
                curso={curso}
                estudiantes={estudiantes}
                docenteNombre={docenteNombre}
                studentGrades={studentGrades}
                state={state}
            />
        </div>
    );

    return createPortal(content, document.body);
}
