import React, { useState } from 'react';
import type { Post, ComunidadUIState, ResourceData } from '../../types';
import { CheckCircle2, ShieldAlert, Activity } from 'lucide-react';
import Rubrica from '../../screens/Rubrica';
import Cotejo from '../../screens/Cotejo';
import Planificacion from '../../screens/Planificacion';

interface Props {
    uiState: ComunidadUIState;
    setUiState: React.Dispatch<React.SetStateAction<ComunidadUIState>>;
    posts: Post[];
    onImportResource: (tipo: Post['tipo'], resourceData: ResourceData) => void;
    onReportPost: (postId: number, razon: string, comentario?: string) => Promise<void>;
    showSuccessToast: boolean;
    setShowSuccessToast: (show: boolean) => void;
}

const getTipoLabel = (tipo: Post['tipo']) => {
    switch (tipo) {
        case 'rubrica': return 'Rúbrica';
        case 'cotejo': return 'Cotejo';
        case 'secuencia': return 'Planificación';
        default: return 'General';
    }
};

const getTagStyles = (tipo: Post['tipo']) => {
    switch (tipo) {
        case 'rubrica': return 'bg-[#FDF2F2] text-[#E02424] border-transparent';
        case 'cotejo': return 'bg-[#FFFBEB] text-[#D97706] border-transparent';
        case 'secuencia': return 'bg-[#ECFDF5] text-[#059669] border-transparent';
        default: return 'bg-slate-100 text-slate-600 border-transparent';
    }
};

export default function ModalsManager({ 
    uiState, setUiState, posts, onImportResource, 
    onReportPost, showSuccessToast, setShowSuccessToast 
}: Props) {
    const selectedPost = posts.find(p => p.id === uiState.selectedPostId);
    
    // Internal states for Report Modal and Preview Modal
    const [reportReason, setReportReason] = useState<string>('');
    const [reportComment, setReportComment] = useState<string>('');
    const [isReporting, setIsReporting] = useState(false);

    if (!uiState.activeModal || !selectedPost) return (
        <>
            {showSuccessToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-200 animate-in slide-in-from-top-10">
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
                        <CheckCircle2 size={20} className="text-emerald-400" />
                        <span className="font-bold text-[11px] uppercase tracking-widest">Recurso añadido a tu biblioteca</span>
                    </div>
                </div>
            )}
        </>
    );

    const handleClose = () => {
        setUiState({ activeModal: null, selectedPostId: null });
    };

    const handleConfirmReport = async () => {
        if (!uiState.selectedPostId || reportReason === '' || isReporting) return;
        setIsReporting(true);
        try {
            await onReportPost(uiState.selectedPostId, reportReason, reportComment);
            setUiState({ activeModal: null, selectedPostId: null });
            setReportReason('');
            setReportComment('');
        } catch (error) {
            console.error('Error al reportar el post:', error);
        } finally {
            setIsReporting(false);
        }
    };

    const handleUseResource = () => {
        if (!selectedPost.recursoDatos) return;
        onImportResource(selectedPost.tipo, selectedPost.recursoDatos);
        setUiState({ activeModal: null, selectedPostId: null });
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };



    return (
        <>
            {uiState.activeModal === 'preview' && selectedPost && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
                    <div className="bg-white rounded-none w-full max-w-7xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center border shadow-sm ${getTagStyles(selectedPost.tipo)}`}>
                                    <span className="material-symbols-outlined text-2xl">
                                        {selectedPost.tipo === 'rubrica' ? 'table_chart' : selectedPost.tipo === 'cotejo' ? 'fact_check' : 'list_alt'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 leading-snug">
                                        {selectedPost.recursoDatos?.nombre || selectedPost.recursoDatos?.titulo || 'Recurso Pedagógico'}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{getTipoLabel(selectedPost.tipo)}</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-slate-50/30">
                            {selectedPost.tipo === 'rubrica' && (
                                <Rubrica
                                    readOnly={true}
                                    initialDatos={selectedPost.recursoDatos as any}
                                />
                            )}
                            {selectedPost.tipo === 'cotejo' && (
                                <Cotejo
                                    readOnly={true}
                                    initialDatos={selectedPost.recursoDatos as any}
                                />
                            )}
                            {selectedPost.tipo === 'secuencia' && (
                                <Planificacion
                                    readOnly={true}
                                    initialDatos={selectedPost.recursoDatos as any}
                                />
                            )}
                        </div>

                        <div className="px-10 py-6.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <button
                                onClick={handleClose}
                                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-100 hover:text-slate-700 transition-all outline-none"
                            >
                                Cerrar
                            </button>

                            <button
                                onClick={() => setUiState({ activeModal: 'import', selectedPostId: selectedPost.id })}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2 outline-none"
                            >
                                <span className="material-symbols-outlined text-[16px]">cloud_download</span>
                                <span>Incorporar a mis recursos</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Confirmation Modal */}
            {uiState.activeModal === 'import' && (
                <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
                    <div className="bg-white rounded-none w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-emerald-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-4xl text-emerald-500">cloud_download</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">¿Añadir recurso?</h3>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                Se guardará <span className="text-slate-900 font-bold">"{selectedPost.recursoDatos?.nombre || selectedPost.recursoDatos?.titulo || 'este recurso'}"</span> en tu biblioteca personal para usar en tus cursos.
                            </p>
                        </div>
                        <div className="p-8 bg-slate-50/50 flex flex-col gap-3">
                            <button
                                onClick={handleUseResource}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all"
                            >
                                Confirmar y guardar
                            </button>
                            <button
                                onClick={() => setUiState({ activeModal: null, selectedPostId: null })}
                                className="w-full py-4 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {uiState.activeModal === 'report' && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-none w-full max-w-md overflow-hidden shadow-2xl animate-scale-up border border-slate-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-rose-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
                                <ShieldAlert size={40} className="text-rose-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Reportar contenido</h3>
                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                                ¿Deseas reportar este instrumento pedagógico por contenido inapropiado o plagio? Nuestro equipo lo revisará en breve.
                            </p>
                        </div>
                        <div className="p-8 bg-slate-50/50 flex flex-col gap-4">
                            <div className="space-y-4">
                                <select 
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                                >
                                    <option value="">Selecciona una razón...</option>
                                    <option value="plagio">Plagio / Contenido copiado</option>
                                    <option value="inapropiado">Contenido inapropiado</option>
                                    <option value="error">Error técnico en recurso</option>
                                    <option value="otro">Otro</option>
                                </select>
                                <textarea
                                    value={reportComment}
                                    onChange={(e) => setReportComment(e.target.value)}
                                    placeholder="Comentarios adicionales (opcional)..."
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none min-h-25 resize-none shadow-sm transition-all"
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    disabled={!reportReason || isReporting}
                                    onClick={handleConfirmReport}
                                    className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    {isReporting && <Activity size={16} className="animate-spin" />}
                                    {isReporting ? 'ENVIANDO REPORTE...' : 'CONFIRMAR REPORTE'}
                                </button>
                                <button
                                    onClick={() => setUiState({ activeModal: null, selectedPostId: null })}
                                    className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em]"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-200 animate-in slide-in-from-top-10">
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
                        <CheckCircle2 size={20} className="text-emerald-400" />
                        <span className="font-bold text-[11px] uppercase tracking-widest">Recurso añadido a tu biblioteca</span>
                    </div>
                </div>
            )}
        </>
    );
}
