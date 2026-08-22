import React from 'react';
import { X, Camera, Pencil, Settings, AlertTriangle } from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';

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
    getAvatarSrc: (isOwn: boolean) => string | null;
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
        <div className="fixed inset-0 bg-(--ink)/40 backdrop-blur-[2px] z-100 flex justify-center md:justify-end p-0 md:p-0" onClick={() => setShowProfile(false)}>
        <div
                className="w-full max-w-sm h-full bg-(--background) shadow-md flex flex-col animate-in slide-in-from-right duration-300 md:rounded-l-(--radius-lg) overflow-hidden border-l border-(--border-soft)"
                onClick={e => e.stopPropagation()}
            >
                <div className="h-40 bg-linear-to-br from-(--herb-garden) to-(--ink) relative shrink-0">
                    <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                    <div className="absolute -bottom-12 left-8">
                        <div className="relative w-24 h-24 rounded-(--radius-sm) border border-(--border-soft) shadow-sm overflow-hidden bg-white">
                            <UserAvatar src={getAvatarSrc(isOwnProfile)} name={activeProfile.nombre} className="w-full h-full rounded-none!" />
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

                <div className="mt-16 p-6 flex-1 overflow-y-auto custom-scrollbar-minimal">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-2xl font-black text-(--ink) tracking-tight">{activeProfile.nombre}</h1>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-(--primary) animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--tag-emerald-bg) text-xs font-black text-(--tag-emerald-text) uppercase tracking-widest border border-(--border-soft)">
                                {activeProfile.materias}
                            </div>
                        </div>
                    </div>

                    <div className="mb-5 p-4 rounded-(--radius-sm) bg-(--linen)/50 border border-(--border-soft) relative">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest">Sobre mí</h3>
                            {isOwnProfile && !editingProfile && (
                                <button onClick={() => setEditingProfile(true)} className="text-(--ink-soft) hover:text-(--primary) transition-colors">
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>
                        
                        {isOwnProfile && editingProfile ? (
                            <div className="space-y-4">
                                <textarea 
                                    className="w-full p-4 bg-white border border-(--border-soft) rounded-(--radius-sm) text-sm font-medium focus:border-(--primary) outline-none min-h-25" 
                                    value={localBio} 
                                    onChange={e => setLocalBio(e.target.value)} 
                                    placeholder="Cuéntanos sobre ti..." 
                                />
                                <div className="flex gap-2">
                                    <button className="flex-1 px-4 py-2 bg-white border border-(--border-soft) rounded-(--radius-sm) text-xs font-bold text-(--ink-soft) hover:bg-(--linen)/30" onClick={() => setEditingProfile(false)}>Cancelar</button>
                                    <button className="flex-1 px-4 py-2 bg-(--primary) rounded-(--radius-sm) text-xs font-bold text-white hover:opacity-90 transition-opacity" onClick={saveBio} disabled={bioSaving}>
                                        {bioSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-(--ink)/90 leading-relaxed font-medium">
                                {activeProfile.descripcion || 'Docente innovador comprometido con el desarrollo pedagógico.'}
                            </p>
                        )}
                    </div>

                    <div className="mb-5 p-4 rounded-(--radius-sm) bg-(--linen)/50 border border-(--border-soft)">
                        <h3 className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mb-4">Logros pedagógicos</h3>
                        <div className="space-y-3.5 text-sm">
                            <p className="text-(--ink-soft) font-medium"><span className="font-black text-(--ink)">{logros?.estudiantesEvaluados || 0}</span> estudiantes evaluados</p>
                            <p className="text-(--ink-soft) font-medium"><span className="font-black text-(--ink)">{logros?.actividadesAplicadas || 0}</span> actividades aplicadas</p>
                            <p className="text-(--ink-soft) font-medium"><span className="font-black text-(--ink)">{logros?.actividadesRubricas || 0}</span> actividades evaluadas con rúbricas</p>
                            <p className="text-(--ink-soft) font-medium"><span className="font-black text-(--ink)">{logros?.actividadesCotejo || 0}</span> actividades evaluadas con lista de cotejo</p>
                            <p className="text-(--ink-soft) font-medium"><span className="font-black text-(--ink)">{logros?.actividadesIndicadores || 0}</span> actividades evaluadas por indicadores de logro</p>
                        </div>
                    </div>


                </div>

                {isOwnProfile && (
                    <div className="p-6 border-t border-(--border-soft) space-y-3 bg-(--linen)/20">
                        {onOpenSettings && (
                            <button onClick={() => { setShowProfile(false); onOpenSettings(); }} className="w-full py-2.5 bg-white border border-(--border-soft) rounded-(--radius-sm) text-sm font-bold text-(--ink) hover:bg-(--linen)/30 flex items-center justify-center gap-2 transition-all shadow-sm">
                                <Settings size={18} />
                                Configuración
                            </button>
                        )}
                        {onOpenSuscripcion && (
                            <button onClick={() => { setShowProfile(false); onOpenSuscripcion(); }} className="w-full py-2.5 bg-(--primary) border border-(--border-soft) rounded-(--radius-sm) text-sm font-bold text-white hover:opacity-90 flex items-center justify-center gap-2 transition-all shadow-sm">
                                Planes y Suscripción
                            </button>
                        )}
                        <button
                            onClick={() => setShowResetModal(true)}
                            className="w-full py-2.5 bg-(--tag-rose-bg) hover:bg-rose-100/50 text-(--tag-rose-text) rounded-(--radius-sm) text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border border-(--border-soft)"
                        >
                            <div className="w-6 h-6 bg-(--danger) text-white rounded-(--radius-sm) flex items-center justify-center shadow-sm">
                                <AlertTriangle size={14} />
                            </div>
                            Reiniciar año escolar
                        </button>
                        {onLogout && (
                            <button onClick={() => { if (window.confirm('¿Deseas cerrar sesión?')) onLogout(); }} className="w-full py-2.5 text-(--ink-soft) hover:text-(--ink) text-xs font-black uppercase tracking-widest transition-all">
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
