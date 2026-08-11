import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ASIGNATURAS_CATALOGO } from '../../constants/asignaturas';
import { X, CheckCircle, AlertTriangle, Loader2, BookOpen } from 'lucide-react';
import type { UserProfile } from '../../types';

interface Props {
    session: any;
    currentUserProfile: UserProfile | null;
    onRefresh: () => void;
}

export default function InvitationModal({ session, currentUserProfile, onRefresh }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [curso, setCurso] = useState<any>(null);
    const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const vincularId = params.get('vincular');
        const exp = params.get('exp');

        if (vincularId && session?.user?.id && currentUserProfile) {
            setIsOpen(true);
            validateInvitation(Number(vincularId), exp);
        }
    }, [session, currentUserProfile]);

    const validateInvitation = async (courseId: number, expParam: string | null) => {
        setChecking(true);
        setError(null);

        // 1. Validar expiración
        if (expParam && Date.now() > Number(expParam)) {
            setError('El enlace de invitación ha expirado.');
            setChecking(false);
            return;
        }

        try {
            // 2. Validar existencia del curso
            const { data: courseData, error: courseError } = await supabase
                .from('cursos')
                .select('*')
                .eq('id', courseId)
                .maybeSingle();

            if (courseError || !courseData) {
                setError('El curso de destino no existe o fue eliminado.');
                setChecking(false);
                return;
            }
            setCurso(courseData);

            // 3. Validar pertenencia al mismo centro
            if (courseData.centro_id && currentUserProfile?.centro_id !== courseData.centro_id) {
                setError('No perteneces al mismo centro educativo de este curso.');
                setChecking(false);
                return;
            }

            // 4. Validar vinculación previa
            const { data: previousLinks } = await supabase
                .from('curso_docentes')
                .select('*')
                .eq('curso_id', courseId)
                .eq('docente_id', session.user.id);

            if (previousLinks && previousLinks.length > 0) {
                setError('Ya te encuentras vinculado a este curso.');
                setChecking(false);
                return;
            }

            // 5. Encontrar asignaturas disponibles
            const { data: takenLinks } = await supabase
                .from('curso_docentes')
                .select('asignatura')
                .eq('curso_id', courseId);

            const takenSet = new Set(takenLinks?.map(l => l.asignatura) || []);
            const available = ASIGNATURAS_CATALOGO.filter(a => !takenSet.has(a.id));
            setAvailableSubjects(available);

            if (available.length === 0) {
                setError('No hay asignaturas disponibles para vincularse en este curso.');
            }

        } catch (err: any) {
            setError('Error al procesar la invitación: ' + err.message);
        } finally {
            setChecking(false);
        }
    };

    const handleAccept = async () => {
        if (!selectedSubject) return;
        setLoading(true);
        try {
            const { error: insertError } = await supabase
                .from('curso_docentes')
                .insert([{
                    curso_id: curso.id,
                    docente_id: session.user.id,
                    rol: 'co-docente',
                    es_tutor: false,
                    asignatura: selectedSubject
                }]);

            if (insertError) throw insertError;

            setSuccess(true);
            setTimeout(() => {
                handleClose(true);
            }, 2000);
        } catch (err: any) {
            setError('No se pudo completar la vinculación: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (shouldRefresh = false) => {
        setIsOpen(false);
        // Limpiar URL query params
        const url = new URL(window.location.href);
        url.searchParams.delete('vincular');
        url.searchParams.delete('exp');
        window.history.replaceState({}, '', url.pathname + url.search);
        if (shouldRefresh) {
            onRefresh();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-none shadow-2xl border border-slate-200 p-8 flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div className="flex items-center gap-2">
                        <BookOpen className="text-emerald-600" size={20} />
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Invitación de Co-docente</h2>
                    </div>
                    {!loading && !success && (
                        <button className="text-slate-400 hover:text-slate-600" onClick={() => handleClose(false)}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                {checking ? (
                    <div className="flex flex-col items-center py-10">
                        <Loader2 className="animate-spin text-emerald-600 mb-3" size={32} />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Validando enlace de invitación...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-4">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mb-2">Error de Invitación</h3>
                        <p className="text-xs text-slate-500 mb-6">{error}</p>
                        <button onClick={() => handleClose(false)} className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all">
                            Cerrar
                        </button>
                    </div>
                ) : success ? (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                            <CheckCircle size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mb-2">¡Vinculación Exitosa!</h3>
                        <p className="text-xs text-slate-500">Te has vinculado correctamente al curso {curso?.grado} {curso?.seccion}.</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-xs font-medium text-slate-600 mb-4 leading-relaxed">
                            Has sido invitado a formar parte del curso <strong className="text-slate-900">{curso?.grado} {curso?.seccion}</strong>.
                            Selecciona la asignatura que vas a impartir para completar tu vinculación:
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Asignatura</label>
                                <select 
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none focus:border-slate-950 transition-all"
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                >
                                    <option value="">Selecciona una asignatura...</option>
                                    {availableSubjects.map(asig => (
                                        <option key={asig.id} value={asig.id}>
                                            {asig.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleClose(false)}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                            >
                                Rechazar
                            </button>
                            <button 
                                onClick={handleAccept}
                                disabled={!selectedSubject || loading}
                                className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={12} className="animate-spin" />}
                                Vincularse
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
