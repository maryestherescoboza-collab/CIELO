import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';

interface ResetModalProps {
    showResetModal: boolean;
    setShowResetModal: (val: boolean) => void;
    confirmKeyword: string;
    setConfirmKeyword: (val: string) => void;
    onResetSchoolYear: () => void;
    setShowProfile: (val: boolean) => void;
}

const ResetModal: React.FC<ResetModalProps> = ({
    showResetModal, setShowResetModal, confirmKeyword, setConfirmKeyword, onResetSchoolYear, setShowProfile
}) => {
    if (!showResetModal) return null;

    return (
        <CieloModal
            isOpen={showResetModal}
            onClose={() => { setShowResetModal(false); setConfirmKeyword(''); }}
            hideCloseButton
            maxWidth="md"
        >
            <div className="-m-6 mb-6 bg-rose-600 p-8 text-white text-center relative rounded-t-[24px]">
                <button 
                    onClick={() => { setShowResetModal(false); setConfirmKeyword(''); }}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-black tracking-tight uppercase">¡Atención Crítica!</h2>
                <p className="text-rose-100 text-xs font-bold mt-2 uppercase tracking-widest opacity-80">Acción irreversible</p>
            </div>
                
                <div className="p-10">
                    <p className="text-slate-600 text-sm leading-relaxed mb-8">
                        Estás a punto de <strong>eliminar permanentemente</strong> todos tus datos académicos asociados a este año escolar: cursos, estudiantes, actividades, calificaciones e incidencias.
                        <br /><br />
                        <span className="text-rose-600 font-bold uppercase text-xs tracking-wider">
                            Nota: Los datos de otros docentes o cursos compartidos no se verán afectados.
                        </span>
                    </p>

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                                Escribe <span className="text-slate-900">REINICIAR TODO</span> para confirmar
                            </p>
                            <input 
                                type="text" 
                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-lg focus:border-rose-600 focus:bg-white outline-none transition-all placeholder:text-slate-200"
                                placeholder="Escribir aquí..."
                                value={confirmKeyword}
                                onChange={e => setConfirmKeyword(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => { setShowResetModal(false); setConfirmKeyword(''); }}
                                className="flex-1 h-12 rounded-full text-xs font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
                            >
                                CANCELAR
                            </button>
                            <button 
                                disabled={confirmKeyword !== 'REINICIAR TODO'}
                                onClick={() => {
                                    onResetSchoolYear();
                                    setShowResetModal(false);
                                    setConfirmKeyword('');
                                    setShowProfile(false);
                                }}
                                className="flex-2 h-12 bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full text-xs font-black shadow-md shadow-rose-900/10 hover:bg-rose-700 transition-all transform active:scale-95 uppercase tracking-widest"
                            >
                                REINICIAR AÑO
                            </button>
                        </div>
                    </div>
                </div>
        </CieloModal>
    );
};

export default ResetModal;
