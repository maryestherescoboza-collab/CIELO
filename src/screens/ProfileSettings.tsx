import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  User, Briefcase, Shield, Palette,
  X, Camera, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Session } from '@supabase/supabase-js';
// ── Types ──
interface ProfileSettingsProps {
  session: Session | null;
  docenteNombre: string;
  perfilBio: string;
  perfilAvatarUrl: string;
  instituto: string;
  tipoInstitucion?: 'publica' | 'privada';
  asignaturas: string[];
  onUploadAvatar: (file: File) => Promise<string | null>;
  onUpdateCentro: (centroId: string, data: any) => Promise<any>;
  onCreateCentro: (data: any) => Promise<any>;
  onUpdatePerfilProfesional: (tipoInstitucion: 'publica' | 'privada', asignaturas: string[], centroId?: string | null) => Promise<void>;
  onUpdateFullProfile?: (nombreDocente: string, bio: string) => Promise<void>;
  onUpdateAvatarColor: (color: string) => Promise<void>;
  perfilAvatarColor: string;
  onResetSchoolYear: () => void;
  onLogout?: () => void;
  onChangeCentro?: (nuevoCentroId: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onClose: () => void;
  centro?: any;
  centroId?: string;
  centroNombre?: string;
}

type SectionId = 'perfil' | 'profesional' | 'seguridad' | 'apariencia';

const AVATAR_COLORS = [
  '#2D3436', '#D03817', '#E6991F', '#0F753D', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#f43f5e', '#a855f7',
];

// ── Main Component ──
export default function ProfileSettings({
  session,
  docenteNombre,
  perfilBio,
  perfilAvatarUrl,
  instituto,
  tipoInstitucion,
  asignaturas,
  onUploadAvatar,
  onUpdateCentro: _onUpdateCentro,
  onCreateCentro: _onCreateCentro,
  onUpdatePerfilProfesional,
  onUpdateFullProfile,
  onUpdateAvatarColor,
  perfilAvatarColor,
  onResetSchoolYear,
  onChangeCentro,
  onClose,
  centro,
  centroId,
  centroNombre,
  onLogout
}: ProfileSettingsProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('perfil');
  const contentRef = useRef<HTMLDivElement>(null);

  const extractedBio = useMemo(() => {
    try {
      if (perfilBio && perfilBio.startsWith('{')) {
        const parsed = JSON.parse(perfilBio);
        return parsed.bio || '';
      }
    } catch (e) {
      // ignore
    }
    return perfilBio || '';
  }, [perfilBio]);

  const handleSaveInformacionGeneral = useCallback(async (nombreDocente: string, newBio: string) => {
    if (!onUpdateFullProfile) return;
    await onUpdateFullProfile(nombreDocente, newBio);
  }, [onUpdateFullProfile]);

  const handleSaveDatosProfesionales = useCallback(async (formData: {
    instituto: string;
    codigoCentro: string;
    tipoInstitucion: 'publica' | 'privada';
    tanda: string;
    telefonoCentro: string;
    distrito: string;
    regional: string;
    provincia: string;
    municipio: string;
  }) => {
    // Para docentes, no permitimos editar ni crear el centro educativo desde esta sección.
    // La fuente de verdad del centro es public.centros. Guardamos únicamente los datos propios del perfil.
    const currentCentroId = centro?.id || null;
    await onUpdatePerfilProfesional(formData.tipoInstitucion, asignaturas, currentCentroId);
  }, [asignaturas, centro?.id, onUpdatePerfilProfesional]);

  const handleSectionChange = useCallback((id: SectionId) => {
    setActiveSection(id);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div 
        className="relative w-full h-dvh md:h-auto md:max-h-[85vh] md:max-w-5xl bg-[#FDFBF7] md:rounded-[20px] border border-[rgba(46,51,48,0.08)] shadow-sm flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <Sidebar 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          docenteNombre={docenteNombre}
          userEmail={session?.user?.email || ''}
          avatarUrl={perfilAvatarUrl}
          avatarColor={perfilAvatarColor}
          onResetSchoolYear={onResetSchoolYear}
          onLogout={onLogout || (() => supabase.auth.signOut())}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-[#FDFBF7]">
          <Header activeSection={activeSection} onClose={onClose} />
          
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
             <div className="max-w-2xl mx-auto space-y-8">
               {activeSection === 'perfil' && (
                  <InformacionGeneralTab 
                    docenteNombre={docenteNombre} 
                    userEmail={session?.user?.email || ''} 
                    bio={extractedBio}
                    onSave={handleSaveInformacionGeneral}
                  />
                )}
                
                {activeSection === 'profesional' && (
                   <DatosProfesionalesTab 
                     instituto={instituto}
                     tipoInstitucion={tipoInstitucion}
                     centro={centro}
                     centroId={centroId}
                     onSave={handleSaveDatosProfesionales}
                   />
                 )}
                
                {activeSection === 'seguridad' && (
                  <SeguridadTab 
                    centroId={centroId}
                    centroNombre={centroNombre}
                    onChangeCentro={onChangeCentro}
                  />
                )}
                
                {activeSection === 'apariencia' && (
                  <AparienciaTab 
                    docenteNombre={docenteNombre}
                    avatarUrl={perfilAvatarUrl}
                    avatarColor={perfilAvatarColor}
                    onUpload={onUploadAvatar}
                    onColorSelect={onUpdateAvatarColor}
                  />
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Sidebar = React.memo(function Sidebar({ 
  activeSection, 
  onSectionChange, 
  docenteNombre, 
  userEmail, 
  avatarUrl, 
  avatarColor,
  onResetSchoolYear,
  onLogout
}: { 
  activeSection: SectionId; 
  onSectionChange: (id: SectionId) => void;
  docenteNombre: string;
  userEmail: string;
  avatarUrl: string;
  avatarColor: string;
  onResetSchoolYear: () => void;
  onLogout: () => void;
}) {
  const avatarSrc = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(docenteNombre)}&background=f8fafc&color=0f172a&bold=true&size=128`;

  const NavItem = ({ id, label, icon }: { id: SectionId; label: string; icon: React.ReactNode }) => {
    const selected = activeSection === id;
    return (
      <button
        onClick={() => onSectionChange(id)}
        className={`w-full flex items-center gap-3 px-4 py-2 rounded-full transition-all text-xs font-bold ${
          selected 
            ? 'bg-primary text-[#2E3330] shadow-sm' 
            : 'text-[#5F665E] hover:bg-[#D4CCBE] hover:text-[#2E3330]'
        }`}
        style={{ height: '36px' }}
      >
        <span className={`${selected ? 'text-[#2E3330]' : 'text-slate-400'}`}>
          {icon}
        </span>
        {label}
      </button>
    );
  };

  return (
    <aside className="w-full md:w-70 shrink-0 flex flex-col bg-[#F9F8F6] border-b md:border-b-0 md:border-r border-[rgba(46,51,48,0.08)]">
      <div className="p-6 border-b border-[rgba(46,51,48,0.08)] flex items-center gap-4 bg-[#F9F8F6]/25">
         <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm" style={{ background: avatarColor || 'white' }}>
            {!avatarColor ? (
              <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-semibold text-xl">
                {docenteNombre?.charAt(0).toUpperCase() || 'D'}
              </div>
            )}
         </div>
         <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#2E3330] truncate tracking-tight">{docenteNombre}</h2>
            <p className="text-xs text-[#5F665E] truncate">{userEmail}</p>
         </div>
      </div>

      <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto">
        <NavItem id="perfil" label="Información general" icon={<User size={16} />} />
        <NavItem id="profesional" label="Datos profesionales" icon={<Briefcase size={16} />} />
        <NavItem id="seguridad" label="Seguridad" icon={<Shield size={16} />} />
        <NavItem id="apariencia" label="Apariencia" icon={<Palette size={16} />} />
      </nav>

      <div className="p-4 border-t border-[rgba(46,51,48,0.08)] bg-[#F9F8F6]/10 space-y-3">
         <button
            onClick={() => {
              if (window.confirm('¿Estás SEGURO de que deseas reiniciar tu año escolar? Esta acción es irreversible.')) {
                onResetSchoolYear();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-attention bg-attention/10 hover:bg-attention/20 transition-all border border-attention/20"
         >
            <AlertCircle size={14} />
            Reiniciar Año
         </button>
         <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-bold text-[#5F665E] hover:text-attention hover:bg-attention/10 transition-colors"
         >
            <LogOut size={14} />
            Cerrar Sesión
         </button>
      </div>
    </aside>
  );
});

function Header({ activeSection, onClose }: { activeSection: SectionId; onClose: () => void }) {
  const titles: Record<SectionId, string> = {
    'perfil': 'Información General',
    'profesional': 'Datos Profesionales',
    'seguridad': 'Seguridad y Acceso',
    'apariencia': 'Personalización Visual'
  };

  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-[rgba(46,51,48,0.08)] bg-[#FDFBF7] sticky top-0 z-10">
       <h3 className="font-bold text-base text-[#2E3330] tracking-tight">
          {titles[activeSection]}
       </h3>
       <button 
         onClick={onClose} 
         className="p-2 text-slate-400 hover:text-slate-700 hover:bg-[#FAF6F0] rounded-full transition-all"
         aria-label="Cerrar"
       >
          <X size={18} />
       </button>
    </header>
  );
}

// ── Subcomponents: Tabs ──

interface InformacionGeneralTabProps {
  docenteNombre: string;
  userEmail: string;
  bio: string;
  onSave: (nombreDocente: string, bio: string) => Promise<void>;
}

function InformacionGeneralTab({ docenteNombre, userEmail, bio: initialBio, onSave }: InformacionGeneralTabProps) {
  const [nombreDocente, setNombreDocente] = useState(docenteNombre || '');
  const [bio, setBio] = useState(initialBio || '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreDocente.trim()) {
      setError('El nombre del docente es obligatorio');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(nombreDocente, bio);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {error && (
        <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {saved && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <CheckCircle size={16} />
          Cambios guardados con éxito
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Docente</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold"
            value={nombreDocente}
            onChange={e => setNombreDocente(e.target.value)}
            placeholder="Nombre del docente"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Correo Electrónico (Solo Lectura)</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] text-slate-500 outline-none cursor-not-allowed"
            value={userEmail}
            readOnly
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Biografía</label>
        <textarea
          className="w-full h-40 p-4 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none resize-none transition-all font-medium"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Escribe tu trayectoria, metodologías o intereses..."
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-8 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar cambios'
          )}
        </button>
      </div>
    </form>
  );
}
interface DatosProfesionalesTabProps {
  instituto: string;
  tipoInstitucion?: 'publica' | 'privada';
  centro?: any;
  centroId?: string;
  onSave: (data: {
    instituto: string;
    codigoCentro: string;
    tipoInstitucion: 'publica' | 'privada';
    tanda: string;
    telefonoCentro: string;
    distrito: string;
    regional: string;
    provincia: string;
    municipio: string;
  }) => Promise<void>;
}

function DatosProfesionalesTab({
  instituto: _instituto,
  tipoInstitucion,
  centro,
  centroId,
  onSave
}: DatosProfesionalesTabProps) {
  const [centroReal, setCentroReal] = useState<any>(null);
  const [loadingCentro, setLoadingCentro] = useState(false);

  useEffect(() => {
    if (!centroId) {
      setCentroReal(null);
      return;
    }
    let isMounted = true;
    const fetchCentro = async () => {
      setLoadingCentro(true);
      try {
        const { data, error } = await supabase
          .from('centros')
          .select('*')
          .eq('id', centroId)
          .maybeSingle();
        if (error) {
          console.error('[DatosProfesionalesTab] Error fetching centro:', error);
          return;
        }
        if (data && isMounted) {
          setCentroReal(data);
        }
      } catch (err) {
        console.error('[DatosProfesionalesTab] Fetch error:', err);
      } finally {
        if (isMounted) setLoadingCentro(false);
      }
    };
    fetchCentro();
    return () => {
      isMounted = false;
    };
  }, [centroId]);

  const activeCentro = centroReal || centro;
  const tieneCentro = !!activeCentro;

  const [form, setForm] = useState({
    instituto: '',
    codigoCentro: '',
    tipoInstitucion: tipoInstitucion || 'publica',
    tanda: 'Jornada Extendida',
    telefonoCentro: '',
    distrito: '',
    regional: '',
    provincia: '',
    municipio: ''
  });

  useEffect(() => {
    const c = centroReal || centro;
    const hasC = !!c;
    setForm(p => ({
      ...p,
      instituto: hasC ? (c.nombre || '') : '',
      codigoCentro: hasC ? (c.codigo_centro || c.codigoCentro || '') : '',
      tipoInstitucion: tipoInstitucion || p.tipoInstitucion || 'publica',
      tanda: hasC ? (c.tanda || 'Jornada Extendida') : 'Jornada Extendida',
      telefonoCentro: hasC ? (c.telefono || '') : '',
      distrito: hasC ? (c.distrito_educativo || c.distritoEducativo || '') : '',
      regional: hasC ? (c.regional_educacion || c.regionalEducacion || '') : '',
      provincia: hasC ? (c.provincia || '') : '',
      municipio: hasC ? (c.municipio || '') : ''
    }));
  }, [centroReal, centro, tipoInstitucion]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {error && (
        <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {saved && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <CheckCircle size={16} />
          Cambios guardados con éxito
        </div>
      )}

      {loadingCentro && (
        <div className="flex items-center gap-2 text-xs font-semibold text-primary animate-pulse">
          <Loader2 size={14} className="animate-spin" />
          Cargando datos institucionales reales...
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Centro educativo</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
            value={form.instituto}
            placeholder={tieneCentro ? "Nombre del centro educativo" : "Sin centro vinculado"}
            disabled={true}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Código del centro</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
            value={form.codigoCentro}
            placeholder={tieneCentro ? "Código del centro" : "Sin centro vinculado"}
            disabled={true}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tipo de Institución</label>
          <div className="flex gap-3">
            {(['publica', 'privada'] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm(p => ({ ...p, tipoInstitucion: t }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  form.tipoInstitucion === t 
                    ? 'bg-primary text-white border-transparent shadow-md font-bold' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t === 'publica' ? "Pública" : "Privada"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tanda</label>
          <select
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold cursor-not-allowed"
            value={form.tanda}
            disabled={true}
          >
            <option value="Jornada Extendida">Jornada Extendida</option>
            <option value="Matutina">Matutina</option>
            <option value="Vespertina">Vespertina</option>
            <option value="Nocturna">Nocturna</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Teléfono del centro</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
            value={form.telefonoCentro}
            placeholder={tieneCentro ? "Teléfono del centro" : "Sin centro vinculado"}
            disabled={true}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Distrito educativo</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
            value={form.distrito}
            placeholder={tieneCentro ? "Distrito educativo" : "Sin centro vinculado"}
            disabled={true}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Regional de educación</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
            value={form.regional}
            placeholder={tieneCentro ? "Regional de educación" : "Sin centro vinculado"}
            disabled={true}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Provincia</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
            value={form.provincia}
            placeholder={tieneCentro ? "Provincia" : "Sin centro vinculado"}
            disabled={true}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Municipio</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
            value={form.municipio}
            placeholder={tieneCentro ? "Municipio" : "Sin centro vinculado"}
            disabled={true}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-8 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar cambios'
          )}
        </button>
      </div>
    </form>
  );
}

interface SeguridadTabProps {
  centroId?: string;
  centroNombre?: string;
  onChangeCentro?: (nuevoCentroId: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
}

interface CentroEncontrado {
  id: string;
  nombre: string;
  estado: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MASKED_ID = '••••••••••';

function SeguridadTab({ centroId, centroNombre, onChangeCentro }: SeguridadTabProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado del flujo de cambio de centro
  const [showCentroId, setShowCentroId] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoCentroId, setNuevoCentroId] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [cambioExitoso, setCambioExitoso] = useState(false);
  const [centroEncontrado, setCentroEncontrado] = useState<CentroEncontrado | null>(null);
  const [centroError, setCentroError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: '¡Contraseña actualizada con éxito!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: err.message });
      } else {
        setMessage({ type: 'error', text: 'Error al actualizar.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const buscarCentro = async () => {
    setCentroError(null);
    setCentroEncontrado(null);
    const id = nuevoCentroId.trim();
    if (!id) {
      setCentroError('Ingresa el ID del centro.');
      return;
    }
    if (!UUID_REGEX.test(id)) {
      setCentroError('El ID ingresado no tiene el formato válido de un centro educativo.');
      return;
    }
    setBuscando(true);
    try {
      const { data, error } = await supabase
        .from('centros')
        .select('id, nombre, estado')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('[SeguridadTab] Error buscando centro:', error);
        setCentroError('No se pudo validar el centro. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      if (!data) {
        setCentroError('No se encontró ningún centro educativo con ese ID.');
        return;
      }
      if (data.estado === 'suspendido' || data.estado === 'cancelado') {
        setCentroError('Este centro no está disponible para vincular docentes en este momento.');
        return;
      }
      setCentroEncontrado({ id: data.id, nombre: data.nombre as string, estado: data.estado as string | null });
    } catch (err: unknown) {
      console.error('[SeguridadTab] Error buscando centro:', err);
      setCentroError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setBuscando(false);
    }
  };

  const confirmarCambio = async () => {
    if (!onChangeCentro || !centroEncontrado) return;
    setCentroError(null);
    setCambiando(true);
    try {
      const res = await onChangeCentro(centroEncontrado.id);
      if (!res.ok) {
        setCentroError(res.error || 'No se pudo completar el cambio de centro.');
        return;
      }
      // Cambio persistido en Supabase: limpiamos el contexto y recargamos
      // el entorno por completo para garantizar el aislamiento entre centros.
      setCambioExitoso(true);
      setMessage({ type: 'success', text: res.message || 'Centro educativo cambiado correctamente.' });
      useAppStore.getState().setSelectedCursoId(null);
      useAppStore.getState().setSelectedEstudianteId(null);
      useAppStore.getState().setSelectedActividadId(null);
      try {
        localStorage.removeItem('terra-cognita-storage');
      } catch {
        // No bloqueamos el flujo si el almacenamiento local falla.
      }
      setTimeout(() => window.location.replace('/'), 1800);
    } catch (err: unknown) {
      console.error('[SeguridadTab] Error confirmando cambio de centro:', err);
      setCentroError('No se pudo iniciar el cambio. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setCambiando(false);
    }
  };

  const resetFormularioCentro = () => {
    setMostrarFormulario(false);
    setNuevoCentroId('');
    setCentroEncontrado(null);
    setCentroError(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── Cambiar contraseña ── */}
      <div className="space-y-4">
          <SimplePasswordField label="Nueva Contraseña" value={newPassword} onChange={setNewPassword} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
          <SimplePasswordField label="Confirmar Contraseña" value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} />
          
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-primary/5 text-primary border border-primary/20' : 'bg-danger/5 text-danger border border-danger/20'}`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {message.text}
            </div>
          )}
      </div>

      <div>
          <button 
            onClick={handleSubmit}
            disabled={saving || !newPassword || newPassword !== confirmPassword}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Actualizando Seguridad..." : "Cambiar Contraseña"}
          </button>
      </div>

      <div className="border-t border-slate-100 pt-8" />

      {/* ── Centro educativo vinculado ── */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Centro educativo vinculado</h4>
          <p className="text-xs text-slate-400 mt-1">
            El centro determina con qué cursos e información trabajas dentro de la plataforma.
          </p>
        </div>

        {centroId ? (
          <>
            <div className="p-4 rounded-xl border border-slate-200 bg-[#F9F8F6]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">ID del centro</p>
                  <p className="font-mono text-sm font-bold text-slate-800 break-all mt-0.5">
                    {showCentroId ? centroId : MASKED_ID}
                  </p>
                  {centroNombre && (
                    <p className="text-xs font-semibold text-primary mt-1 truncate">{centroNombre}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowCentroId(v => !v)}
                  className="shrink-0 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label={showCentroId ? "Ocultar ID del centro" : "Mostrar ID del centro"}
                >
                  {showCentroId ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!mostrarFormulario ? (
              <button
                onClick={() => { setMostrarFormulario(true); setCentroError(null); setCentroEncontrado(null); }}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors"
              >
                Cambiar centro educativo
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 mt-1">
                <div className="flex items-start gap-2 text-xs font-medium text-slate-600">
                  <AlertCircle size={15} className="text-primary shrink-0 mt-0.5" />
                  <p>
                    Al cambiar de centro dejarás de trabajar con los cursos e información del centro
                    anterior. Tus datos históricos se conservan, solo pierdes acceso a ellos.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nuevo ID del centro</label>
                  <input
                    value={nuevoCentroId}
                    onChange={(e) => { setNuevoCentroId(e.target.value); setCentroEncontrado(null); setCentroError(null); }}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:bg-white focus:border-primary hover:border-slate-300 outline-none transition-all font-mono"
                  />
                </div>

                {centroError && (
                  <div className="p-3 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-bold leading-5 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    {centroError}
                  </div>
                )}

                {cambioExitoso && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold leading-5 flex items-start gap-2">
                    <CheckCircle size={15} className="shrink-0 mt-0.5" />
                    Centro educativo cambiado correctamente. Reiniciando tu entorno...
                  </div>
                )}

                {centroEncontrado && !cambioExitoso && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-700">Centro encontrado</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{centroEncontrado.nombre}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-5">
                      Se cambiará tu vinculación a este centro. No se elimina ni se modifica
                      información del centro anterior: solo dejas de tenerla disponible en tu entorno.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={resetFormularioCentro}
                    disabled={cambiando}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  {!centroEncontrado ? (
                    <button
                      onClick={buscarCentro}
                      disabled={buscando || cambiando}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {buscando ? (<><Loader2 size={14} className="animate-spin" /> Buscando...</>) : 'Buscar centro'}
                    </button>
                  ) : (
                    <button
                      onClick={confirmarCambio}
                      disabled={cambiando || cambioExitoso}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {cambiando ? (<><Loader2 size={14} className="animate-spin" /> Cambiando...</>) : 'Confirmar cambio'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 rounded-xl border border-slate-200 bg-[#F9F8F6] text-sm text-slate-500">
            Todavía no estás vinculado a ningún centro educativo.
          </div>
        )}
      </div>
    </div>
  );
}

function AparienciaTab({ 
  docenteNombre, 
  avatarUrl, 
  avatarColor, 
  onUpload, 
  onColorSelect 
}: {
  docenteNombre: string;
  avatarUrl: string;
  avatarColor: string;
  onUpload: (f: File) => Promise<string | null>;
  onColorSelect: (c: string) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const avatarSrc = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(docenteNombre)}&background=f8fafc&color=0f172a&bold=true&size=128`;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUpload(file);
    setUploading(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col items-center gap-4">
          <label className="relative cursor-pointer group">
              <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-50 transition-transform group-hover:scale-[1.02]" style={{ background: avatarColor || 'white' }}>
                {!avatarColor ? (
                  <img src={avatarSrc} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-5xl">
                    {docenteNombre?.charAt(0).toUpperCase() || 'D'}
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                    <Camera className="text-white drop-shadow-md" size={32} />
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
          {uploading ? (
            <span className="text-sm font-medium text-slate-500 animate-pulse">Procesando imagen...</span>
          ) : (
            <span className="text-sm font-medium text-slate-500">Click para subir foto (JPG, PNG)</span>
          )}
        </div>
        
        <div className="w-full">
          <h4 className="text-sm font-bold text-slate-800 mb-4 text-center">O elige un color sólido</h4>
          <div className="flex flex-wrap gap-3 justify-center max-w-md mx-auto">
              {AVATAR_COLORS.map(color => (
                <button 
                    key={color}
                    onClick={() => onColorSelect(color)}
                    aria-label={`Seleccionar color ${color}`}
                    className={`w-12 h-12 rounded-full transition-all focus:outline-none focus:ring-4 focus:ring-slate-200 shadow-sm ${
                      avatarColor === color 
                        ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                        : 'hover:scale-110'
                    }`}
                    style={{ background: color }}
                >
                    {avatarColor === color && (
                      <CheckCircle className="text-white absolute inset-0 m-auto drop-shadow-sm" size={20} />
                    )}
                </button>
              ))}
          </div>
        </div>
    </div>
  );
}




function SimplePasswordField({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div className="space-y-1.5 flex flex-col">
       <label className="text-sm font-semibold text-slate-700">{label}</label>
       <div className="relative">
          <input 
             type={show ? 'text' : 'password'}
             value={value}
             onChange={e => onChange(e.target.value)}
             placeholder="••••••••"
             autoComplete="new-password"
             className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm border border-slate-200 bg-[#F9F8F6] focus:bg-white focus:border-emerald-500 hover:border-slate-300 outline-none transition-all"
          />
          <button 
             onClick={onToggle}
             className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
             aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
             {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
       </div>
    </div>
  );
}
