import { useCallback, useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import type { Curso } from '../types';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { useCursosData } from '../hooks/useCursosData';
import { CourseCard } from '../components/courses/CourseCard';
import { NewCourseModal } from '../components/courses/NewCourseModal';
import { LinkTeacherModal } from '../components/courses/LinkTeacherModal';

interface Props {
    onAddCurso: (c: Omit<Curso, 'id' | 'grupoId'>) => Promise<any>;
    onDeleteCurso: (id: number) => void;
    selectedCursoId: number | null;
    onSelectCurso: (id: number) => void;
    onSaveAsignatura?: (cursoId: number, asignatura: string) => void;
    onSaveDias?: (cursoId: number, dias: string[]) => void;
    onToggleDocenteCurso?: (cursoId: number, userId: string, rol: 'tutor' | 'co-docente', asignatura: string) => void;
}

export default function Cursos({
    onAddCurso,
    onDeleteCurso,
    selectedCursoId,
    onSelectCurso,
    onSaveAsignatura,
    onSaveDias,
    onToggleDocenteCurso
}: Props) {
    const state = useAppStore(s => s.state);
    const session = useAppStore(s => s.session);
    const navigate = useNavigate();
    const [editingAsignaturaId, setEditingAsignaturaId] = useState<number | null>(null);
    
    const {
        showModal,
        setShowModal,
        editingDiasId,
        setEditingDiasId,
        linkingCourseId,
        setLinkingCourseId,
        teacherSearch,
        setTeacherSearch,
        isSaving,
        setIsSaving,
        form,
        setForm,
        resetForm,
        cursosWithCounts,
        filteredPerfiles
    } = useCursosData(state);

    const handleCreate = useCallback(async () => {
        if (!form.seccion.trim() || isSaving) return;
        setIsSaving(true);
        try {
            const generatedNombre = `${form.grado} de Secundaria - Sección ${form.seccion}`;
            const result = await onAddCurso({
                nombre: generatedNombre,
                grado: form.grado,
                seccion: form.seccion,
                asignatura: form.asignatura,
                diasSemana: form.diasSemana,
                isTutorOficial: form.isTutorOficial,
                periodo: 'P1',
                color: '#ADC762',
                configuracionEvaluacion: {}
            });
            if (result) {
                setShowModal(false);
                resetForm();
            }
        } catch (error) {
            console.error('Error creating course:', error);
        } finally {
            setIsSaving(false);
        }
    }, [form, onAddCurso, isSaving, setShowModal, resetForm, setIsSaving]);

    const handleSelectCurso = useCallback((id: number, path: string = `/curso-detalle/${id}`) => {
        onSelectCurso(id);
        navigate(path);
    }, [onSelectCurso, navigate]);

    const handleSaveDias = useCallback((curso: Curso, d: string) => {
        if (!onSaveDias) return;
        const newDias = curso.diasSemana.includes(d)
            ? curso.diasSemana.filter(x => x !== d)
            : [...curso.diasSemana, d];
        onSaveDias(curso.id, newDias);
    }, [onSaveDias]);

    const handleSaveAsignatura = useCallback((curso: Curso, newAsignatura: string) => {
        if (!onSaveAsignatura) return;
        onSaveAsignatura(curso.id, newAsignatura);
    }, [onSaveAsignatura]);

    const handleToggleLinkTeacher = useCallback((cursoId: number, userId: string, teacherSubject: string) => {
        if (onToggleDocenteCurso) {
            onToggleDocenteCurso(cursoId, userId, 'co-docente', teacherSubject);
        }
    }, [onToggleDocenteCurso]);

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#FDFBF7]">
            <div className="flex-1 overflow-y-auto px-6 py-10 md:px-12 scroll-smooth scrollbar-hide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-3xl font-black text-[#2E3330] tracking-tight mb-2.5 font-notion-title">
                            Gestión Académica
                        </h1>
                        <p className="text-[10px] font-bold text-[#5F665E] uppercase tracking-[0.08em]">
                            Administra tus aulas, estudiantes y registros de evaluación.
                        </p>
                    </div>
                     <button
                        id="btn-nuevo-curso"
                        className="px-6 rounded-full bg-[#ADC762] text-white text-xs font-black uppercase tracking-[0.08em] shadow-sm hover:bg-[#6C7E5C] hover:-translate-y-0.5 transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#ADC762]/50 flex items-center justify-center gap-2.5 shrink-0"
                        style={{ height: '36px' }}
                        onClick={() => setShowModal(true)}
                    >
                        <Plus size={16} strokeWidth={3} />
                        Nuevo Curso
                    </button>
                </div>

                <div className="max-w-350 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
                    {cursosWithCounts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-8 border-2 border-dashed border-slate-300 rounded-4xl bg-white/50 text-center shadow-sm">
                            <div className="w-20 h-20 bg-slate-100/80 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-200/50">
                                <BookOpen size={40} className="text-slate-400" />
                            </div>
                            <h2 className="text-2xl font-black text-[#1E293B] tracking-tight font-notion-title mb-2">No hay cursos registrados</h2>
                            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed text-sm">
                                Comienza configurando tu primer curso para empezar a llevar el control de tus evaluaciones por competencias.
                            </p>
                            <button
                                className="mt-8 h-12 px-8 rounded-2xl bg-[#1E293B] text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 flex items-center gap-2"
                                onClick={() => setShowModal(true)}
                            >
                                Crear mi primer curso
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {cursosWithCounts.map(c => (
                                <CourseCard 
                                    key={c.id}
                                    curso={c}
                                    isSelected={c.id === selectedCursoId}
                                    state={state}
                                    editingDiasId={editingDiasId}
                                    editingAsignaturaId={editingAsignaturaId}
                                    currentUserId={session?.user?.id}
                                    onHide={onDeleteCurso}
                                    onSelect={handleSelectCurso}
                                    onEditDias={setEditingDiasId}
                                    onEditAsignatura={setEditingAsignaturaId}
                                    onSaveDias={handleSaveDias}
                                    onSaveAsignatura={handleSaveAsignatura}
                                    onOpenLinkModal={setLinkingCourseId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <NewCourseModal 
                show={showModal}
                onClose={() => setShowModal(false)}
                form={form}
                setForm={setForm}
                isSaving={isSaving}
                onConfirm={handleCreate}
            />

            <LinkTeacherModal 
                courseId={linkingCourseId}
                onClose={() => setLinkingCourseId(null)}
                state={state}
                teacherSearch={teacherSearch}
                setTeacherSearch={setTeacherSearch}
                filteredPerfiles={filteredPerfiles}
                onToggleLink={handleToggleLinkTeacher}
            />
        </div>
    );
}
