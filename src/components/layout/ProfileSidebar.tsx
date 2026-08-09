import React from 'react';
import { X, Camera, Pencil, Settings, AlertTriangle } from 'lucide-react';

interface ProfileSidebarProps {
    showProfile: boolean;
    setShowProfile: (val: boolean) => void;
    activeProfile: {
        nombre: string;
        avatar?: string;
        materias?: string;
        descripcion?: string;
        stats?: { cursos?: string };
        isOwn?: boolean;
    } | null;
    isOwnProfile: boolean;
    getAvatarSrc: (isOwn: boolean) => string;
    uploadingAvatar: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    editingProfile: boolean;
    setEditingProfile: (val: boolean) => void;
    localBio: string;
    setLocalBio: (val: string) => void;
    saveBio: () => void;
    bioSaving?: boolean;
    onOpenSettings?: () => void;
    onOpenSuscripcion?: () => void;
    setShowResetModal: (val: boolean) => void;
    onLogout?: () => void;
    logros?: {
        estudiantesEvaluados: number;
        actividadesAplicadas: number;
        actividadesRubricas: number;
        actividadesCotejo: number;
        actividadesIndicadores: number;
    };
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
    showProfile, setShowProfile,
    activeProfile, isOwnProfile, getAvatarSrc,
    uploadingAvatar, fileInputRef, handleAvatarChange,
    editingProfile, setEditingProfile, localBio, setLocalBio,
    saveBio, bioSaving, onOpenSettings, onOpenSuscripcion, setShowResetModal, onLogout,
    logros
}) => {
    if (!showProfile || !activeProfile) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-100 flex justify-center md:justify-end p-0 md:p-0" onClick={() => setShowProfile(false)}>
        <div
                className="w-full max-w-sm h-full bg-[#FDFBF7] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 md:rounded-l-[4px] overflow-hidden border-l border-[#2E3330]/35"
                onClick={e => e.stopPropagation()}
            >
                <div className="h-40 bg-linear-to-br from-slate-800 to-slate-950 relative shrink-0">
                    <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                    <div className="absolute -bottom-12 left-8">
                        <div className="relative w-24 h-24 rounded-[4px] border-2 border-[#2E3330]/30 shadow-md overflow-hidden bg-white">
                            <img src={getAvatarSrc(isOwnProfile)} alt={activeProfile.nombre} className="w-full h-full object-cover" />
                            {isOwnProfile && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                >
                                    {uploadingAvatar ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Camera size={20} className="text-white" />
                                    )}
                                </button>
                            )}
                        </div>
                        {isOwnProfile && <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />}
                    </div>
                </div>

                <div className="mt-20 p-8 flex-1 overflow-y-auto custom-scrollbar-minimal">
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-2xl font-black text-[#2E3330] tracking-tight">{activeProfile.nombre}</h1>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-[#ADC762] animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[#BFC9A6]/20 text-[10px] font-black text-[#475438] uppercase tracking-widest border border-[#BFC9A6]/60">
                                {activeProfile.materias}
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 p-5 rounded-[4px] bg-[#FAF6F0] border border-[#2E3330]/20 relative">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-bold text-[#5F665E] uppercase tracking-widest">Sobre mí</h3>
                            {isOwnProfile && !editingProfile && (
                                <button onClick={() => setEditingProfile(true)} className="text-[#5F665E] hover:text-[#ADC762] transition-colors">
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>
                        
                        {isOwnProfile && editingProfile ? (
                            <div className="space-y-4">
                                <textarea 
                                    className="w-full p-4 bg-white border border-[#2E3330]/25 rounded-[4px] text-sm font-medium focus:border-[#ADC762] outline-none min-h-25" 
                                    value={localBio} 
                                    onChange={e => setLocalBio(e.target.value)} 
                                    placeholder="Cuéntanos sobre ti..." 
                                />
                                <div className="flex gap-2">
                                    <button className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-[4px] text-xs font-bold text-slate-600 hover:bg-slate-50" onClick={() => setEditingProfile(false)}>Cancelar</button>
                                    <button className="flex-1 px-4 py-2 bg-[#ADC762] rounded-[4px] text-xs font-bold text-white hover:bg-[#6C7E5C]" onClick={saveBio} disabled={bioSaving}>
                                        {bioSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-[#2E3330]/90 leading-relaxed font-medium">
                                {activeProfile.descripcion || 'Docente innovador comprometido con el desarrollo pedagógico.'}
                            </p>
                        )}
                    </div>

                    <div className="mb-6 p-5 rounded-[4px] bg-[#FAF6F0] border border-[#2E3330]/20">
                        <h3 className="text-[10px] font-bold text-[#5F665E] uppercase tracking-widest mb-4">Logros pedagógicos</h3>
                        <div className="space-y-3.5 text-sm">
                            <p className="text-[#5F665E] font-medium"><span className="font-black text-[#2E3330]">{logros?.estudiantesEvaluados || 0}</span> estudiantes evaluados</p>
                            <p className="text-[#5F665E] font-medium"><span className="font-black text-[#2E3330]">{logros?.actividadesAplicadas || 0}</span> actividades aplicadas</p>
                            <p className="text-[#5F665E] font-medium"><span className="font-black text-[#2E3330]">{logros?.actividadesRubricas || 0}</span> actividades evaluadas con rúbricas</p>
                            <p className="text-[#5F665E] font-medium"><span className="font-black text-[#2E3330]">{logros?.actividadesCotejo || 0}</span> actividades evaluadas con lista de cotejo</p>
                            <p className="text-[#5F665E] font-medium"><span className="font-black text-[#2E3330]">{logros?.actividadesIndicadores || 0}</span> actividades evaluadas por indicadores de logro</p>
                        </div>
                    </div>


                </div>

                {isOwnProfile && (
                    <div className="p-8 border-t border-[#EAE4DA] space-y-3 bg-[#FAF6F0]/40">
                        {onOpenSettings && (
                            <button onClick={() => { setShowProfile(false); onOpenSettings(); }} className="w-full py-3 bg-white border border-[#2E3330]/20 rounded-[4px] text-sm font-bold text-[#2E3330] hover:bg-slate-50 flex items-center justify-center gap-2 transition-all">
                                <Settings size={18} />
                                Configuración
                            </button>
                        )}
                        {onOpenSuscripcion && (
                            <button onClick={() => { setShowProfile(false); onOpenSuscripcion(); }} className="w-full py-3 bg-[#ADC762] border border-[#6C7E5C] rounded-[4px] text-sm font-bold text-white hover:bg-[#6C7E5C] flex items-center justify-center gap-2 transition-all">
                                Planes y Suscripción
                            </button>
                        )}
                        <button
                            onClick={() => setShowResetModal(true)}
                            className="w-full py-3 bg-rose-50 hover:bg-rose-100/80 text-rose-800 rounded-[4px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border border-rose-350"
                        >
                            <div className="w-8 h-8 bg-rose-600 text-white rounded-[4px] flex items-center justify-center shadow-lg shadow-rose-650/20">
                                <AlertTriangle size={16} />
                            </div>
                            Reiniciar año escolar
                        </button>
                        {onLogout && (
                            <button onClick={() => { if (window.confirm('¿Deseas cerrar sesión?')) onLogout(); }} className="w-full py-3 text-slate-450 hover:text-slate-800 text-[11px] font-black uppercase tracking-widest transition-all">
                                Cerrar sesión
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileSidebar;
