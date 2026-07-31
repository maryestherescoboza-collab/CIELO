import { useCallback } from 'react';
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
    onSaveCurso?: (c: Curso) => void;
    onToggleDocenteCurso?: (cursoId: number, userId: string, rol: 'tutor' | 'co-docente', asignatura: string) => void;
}

export default function Cursos({
    onAddCurso,
    onDeleteCurso,
    selectedCursoId,
    onSelectCurso,
    onSaveCurso,
    onToggleDocenteCurso
}: Props) {
    const state = useAppStore(s => s.state);
    const navigate = useNavigate();
    
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
        if (!form.nombre.trim() || isSaving) return;
        setIsSaving(true);
        try {
            const result = await onAddCurso({ ...form });
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
        if (!onSaveCurso) return;
        const newDias = curso.diasSemana.includes(d)
            ? curso.diasSemana.filter(x => x !== d)
            : [...curso.diasSemana, d];
        onSaveCurso({ ...curso, diasSemana: newDias });
    }, [onSaveCurso]);

    const handleToggleLinkTeacher = useCallback((cursoId: number, userId: string, teacherSubject: string) => {
        if (onToggleDocenteCurso) {
            onToggleDocenteCurso(cursoId, userId, 'co-docente', teacherSubject);
        }
    }, [onToggleDocenteCurso]);

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#FDFBF7]">
            <div className="flex-1 overflow-y-auto px-6 py-10 md:px-12 scroll-smooth scrollbar-hide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-4xl font-black text-[#1E293B] tracking-tight mb-3 font-notion-title">
                            Gestión Académica
                        </h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            Administra tus aulas, estudiantes y registros de evaluación.
                        </p>
                    </div>
                    <button
                        className="h-14 px-8 rounded-2xl bg-turf-green-base text-white text-sm font-black uppercase tracking-widest shadow-2xl shadow-turf-green-base/20 hover:bg-turf-green-base/90 hover:-translate-y-1 transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 focus-visible:ring-offset-2 flex items-center gap-3 shrink-0"
                        onClick={() => setShowModal(true)}
                    >
                        <Plus size={20} strokeWidth={3} />
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
                                    onDelete={onDeleteCurso}
                                    onSelect={handleSelectCurso}
                                    onEditDias={setEditingDiasId}
                                    onSaveDias={handleSaveDias}
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
