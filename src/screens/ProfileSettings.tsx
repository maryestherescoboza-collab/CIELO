import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  User, Briefcase, Shield, Palette,
  X, Camera, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  onUpdateProfessionalProfile: (data: { instituto: string; tipoInstitucion: 'publica' | 'privada'; asignaturas: string[] }) => Promise<void>;
  onUpdateFullProfile?: (nombreDocente: string, bioJson: string, centroData: {
    nombre: string;
    codigoCentro: string;
    tanda: string;
    telefono: string;
    distritoEducativo: string;
    regionalEducacion: string;
    provincia: string;
    municipio: string;
  }) => Promise<void>;
  onUpdateAvatarColor: (color: string) => Promise<void>;
  perfilAvatarColor: string;
  onResetSchoolYear: () => void;
  onClose: () => void;
  centro?: any;
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
  onUpdateProfessionalProfile,
  onUpdateFullProfile,
  onUpdateAvatarColor,
  perfilAvatarColor,
  onResetSchoolYear,
  onClose,
  centro
}: ProfileSettingsProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('perfil');
  const contentRef = useRef<HTMLDivElement>(null);

  const parsedBio = useMemo(() => {
    try {
      if (perfilBio && perfilBio.startsWith('{')) {
        return {
          bio: '',
          codigoCentro: '',
          tanda: 'Jornada Extendida',
          telefonoCentro: '',
          distrito: '',
          regional: '',
          provincia: '',
          municipio: '',
          ...JSON.parse(perfilBio)
        };
      }
    } catch (e) {
      // ignore
    }
    return {
      bio: perfilBio || '',
      codigoCentro: '',
      tanda: 'Jornada Extendida',
      telefonoCentro: '',
      distrito: '',
      regional: '',
      provincia: '',
      municipio: ''
    };
  }, [perfilBio]);

  const handleSaveInformacionGeneral = useCallback(async (nombreDocente: string, newBio: string) => {
    if (!onUpdateFullProfile) return;
    const currentCentroData = {
      nombre: centro?.nombre || instituto || '',
      codigoCentro: centro?.codigoCentro || parsedBio.codigoCentro || '',
      tanda: centro?.tanda || parsedBio.tanda || 'Jornada Extendida',
      telefono: centro?.telefono || parsedBio.telefonoCentro || '',
      distritoEducativo: centro?.distritoEducativo || parsedBio.distrito || '',
      regionalEducacion: centro?.regionalEducacion || parsedBio.regional || '',
      provincia: centro?.provincia || parsedBio.provincia || '',
      municipio: centro?.municipio || parsedBio.municipio || ''
    };
    const updatedBioJson = JSON.stringify({
      ...parsedBio,
      bio: newBio
    });
    await onUpdateFullProfile(nombreDocente, updatedBioJson, currentCentroData);
  }, [parsedBio, centro, instituto, onUpdateFullProfile]);

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
    if (onUpdateFullProfile) {
      const updatedBioJson = JSON.stringify({
        ...parsedBio
      });
      await onUpdateFullProfile(docenteNombre, updatedBioJson, {
        nombre: formData.instituto,
        codigoCentro: formData.codigoCentro,
        tanda: formData.tanda,
        telefono: formData.telefonoCentro,
        distritoEducativo: formData.distrito,
        regionalEducacion: formData.regional,
        provincia: formData.provincia,
        municipio: formData.municipio
      });
    }

    if (onUpdateProfessionalProfile) {
      await onUpdateProfessionalProfile({
        instituto: formData.instituto,
        tipoInstitucion: formData.tipoInstitucion,
        asignaturas: asignaturas
      });
    }
  }, [docenteNombre, parsedBio, asignaturas, onUpdateFullProfile, onUpdateProfessionalProfile]);

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
        className="relative w-full h-dvh md:h-auto md:max-h-[85vh] md:max-w-5xl bg-white md:rounded-none shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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
          onLogout={() => supabase.auth.signOut()}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <Header activeSection={activeSection} onClose={onClose} />
          
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
             <div className="max-w-2xl mx-auto space-y-8">
               {activeSection === 'perfil' && (
                  <InformacionGeneralTab 
                    docenteNombre={docenteNombre} 
                    userEmail={session?.user?.email || ''} 
                    parsedBio={parsedBio}
                    onSave={handleSaveInformacionGeneral}
                  />
                )}
                
                {activeSection === 'profesional' && (
                  <DatosProfesionalesTab 
                    instituto={instituto}
                    tipoInstitucion={tipoInstitucion}
                    parsedBio={parsedBio}
                    centro={centro}
                    onSave={handleSaveDatosProfesionales}
                  />
                )}
                
                {activeSection === 'seguridad' && (
                  <SeguridadTab />
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
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
          selected 
            ? 'bg-slate-100 text-slate-900 shadow-sm' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <span className={`${selected ? 'text-cielo-blue' : 'text-slate-400'}`}>
          {icon}
        </span>
        {label}
      </button>
    );
  };

  return (
    <aside className="w-full md:w-70 shrink-0 flex flex-col bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
      <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
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
            <h2 className="text-sm font-bold text-slate-900 truncate tracking-tight">{docenteNombre}</h2>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
         </div>
      </div>

      <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto">
        <NavItem id="perfil" label="Información general" icon={<User size={18} />} />
        <NavItem id="profesional" label="Datos profesionales" icon={<Briefcase size={18} />} />
        <NavItem id="seguridad" label="Seguridad" icon={<Shield size={18} />} />
        <NavItem id="apariencia" label="Apariencia" icon={<Palette size={18} />} />
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
         <button
            onClick={() => {
              if (window.confirm('¿Estás SEGURO de que deseas reiniciar tu año escolar? Esta acción es irreversible.')) {
                onResetSchoolYear();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-cielo-terracotta bg-cielo-terracotta/5 hover:bg-cielo-terracotta/10 transition-all border border-cielo-terracotta/20"
         >
            <AlertCircle size={16} />
            Reiniciar Año
         </button>
         <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-cielo-terracotta hover:bg-cielo-terracotta/5 transition-colors"
         >
            <LogOut size={16} />
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
    <header className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
       <h3 className="font-bold text-lg text-slate-800 tracking-tight">
          {titles[activeSection]}
       </h3>
       <button 
         onClick={onClose} 
         className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
         aria-label="Cerrar"
       >
          <X size={20} />
       </button>
    </header>
  );
}

// ── Subcomponents: Tabs ──

interface InformacionGeneralTabProps {
  docenteNombre: string;
  userEmail: string;
  parsedBio: {
    bio: string;
  };
  onSave: (nombreDocente: string, bio: string) => Promise<void>;
}

function InformacionGeneralTab({ docenteNombre, userEmail, parsedBio, onSave }: InformacionGeneralTabProps) {
  const [nombreDocente, setNombreDocente] = useState(docenteNombre || '');
  const [bio, setBio] = useState(parsedBio.bio || '');

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
        <div className="p-4 rounded-xl bg-cielo-terracotta/5 border border-cielo-terracotta/20 text-cielo-terracotta text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {saved && (
        <div className="p-4 rounded-xl bg-cielo-olive/5 border border-cielo-olive/20 text-cielo-olive text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <CheckCircle size={16} />
          Cambios guardados con éxito
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Docente</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold"
            value={nombreDocente}
            onChange={e => setNombreDocente(e.target.value)}
            placeholder="Nombre del docente"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Correo Electrónico (Solo Lectura)</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-100 text-slate-500 outline-none cursor-not-allowed"
            value={userEmail}
            readOnly
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Biografía</label>
        <textarea
          className="w-full h-40 p-4 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none resize-none transition-all font-medium"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Escribe tu trayectoria, metodologías o intereses..."
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-8 rounded-xl bg-cielo-olive text-white text-xs font-black uppercase tracking-widest hover:bg-cielo-olive/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-cielo-olive/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
  parsedBio: {
    codigoCentro: string;
    tanda: string;
    telefonoCentro: string;
    distrito: string;
    regional: string;
    provincia: string;
    municipio: string;
  };
  centro?: any;
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
  instituto,
  tipoInstitucion,
  parsedBio,
  centro,
  onSave
}: DatosProfesionalesTabProps) {
  const [form, setForm] = useState({
    instituto: centro?.nombre || instituto || '',
    codigoCentro: centro?.codigoCentro || parsedBio.codigoCentro || '',
    tipoInstitucion: tipoInstitucion || 'publica',
    tanda: centro?.tanda || parsedBio.tanda || 'Jornada Extendida',
    telefonoCentro: centro?.telefono || parsedBio.telefonoCentro || '',
    distrito: centro?.distritoEducativo || parsedBio.distrito || '',
    regional: centro?.regionalEducacion || parsedBio.regional || '',
    provincia: centro?.provincia || parsedBio.provincia || '',
    municipio: centro?.municipio || parsedBio.municipio || ''
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.instituto.trim()) {
      setError('El centro educativo es obligatorio');
      return;
    }
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
        <div className="p-4 rounded-xl bg-cielo-terracotta/5 border border-cielo-terracotta/20 text-cielo-terracotta text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {saved && (
        <div className="p-4 rounded-xl bg-cielo-olive/5 border border-cielo-olive/20 text-cielo-olive text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <CheckCircle size={16} />
          Cambios guardados con éxito
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Centro educativo</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold"
            value={form.instituto}
            onChange={e => setForm(p => ({ ...p, instituto: e.target.value }))}
            placeholder="Nombre del centro educativo"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Código del centro</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold"
            value={form.codigoCentro}
            onChange={e => setForm(p => ({ ...p, codigoCentro: e.target.value }))}
            placeholder="Código del centro"
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
                    ? 'bg-cielo-blue text-white border-transparent shadow-md font-bold' 
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
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold cursor-pointer"
            value={form.tanda}
            onChange={e => setForm(p => ({ ...p, tanda: e.target.value }))}
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
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold"
            value={form.telefonoCentro}
            onChange={e => setForm(p => ({ ...p, telefonoCentro: e.target.value }))}
            placeholder="Teléfono del centro"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Distrito educativo</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold"
            value={form.distrito}
            onChange={e => setForm(p => ({ ...p, distrito: e.target.value }))}
            placeholder="Distrito educativo"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Regional de educación</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold"
            value={form.regional}
            onChange={e => setForm(p => ({ ...p, regional: e.target.value }))}
            placeholder="Regional de educación"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Provincia</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold"
            value={form.provincia}
            onChange={e => setForm(p => ({ ...p, provincia: e.target.value }))}
            placeholder="Provincia"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Municipio</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-cielo-blue hover:border-slate-300 outline-none transition-all font-bold"
            value={form.municipio}
            onChange={e => setForm(p => ({ ...p, municipio: e.target.value }))}
            placeholder="Municipio"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-8 rounded-xl bg-cielo-olive text-white text-xs font-black uppercase tracking-widest hover:bg-cielo-olive/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-cielo-olive/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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

function SeguridadTab() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async () => {
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setSaving(true);
    try {
      // Assuming supabase is available in global scope or imported
      // @ts-ignore
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-4">
          <SimplePasswordField label="Nueva Contraseña" value={newPassword} onChange={setNewPassword} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
          <SimplePasswordField label="Confirmar Contraseña" value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} />
          
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-cielo-olive/5 text-cielo-olive border border-cielo-olive/20' : 'bg-cielo-terracotta/5 text-cielo-terracotta border border-cielo-terracotta/20'}`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {message.text}
            </div>
          )}
      </div>

      <div className="pt-2">
          <button 
            onClick={handleSubmit}
            disabled={saving || !newPassword || newPassword !== confirmPassword}
            className="w-full py-3 bg-cielo-blue text-white rounded-xl text-sm font-semibold hover:bg-cielo-blue/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Actualizando Seguridad..." : "Cambiar Contraseña"}
          </button>
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
                        ? 'ring-2 ring-offset-2 ring-cielo-blue scale-110' 
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
             className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 hover:border-slate-300 outline-none transition-all"
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
