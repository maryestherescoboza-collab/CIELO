import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  User, Briefcase, Shield, Palette, Sparkles,
  X, Camera, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, LogOut,
  Building2, Search, PlusCircle, Check
} from 'lucide-react';
import { UserAvatar } from '../components/ui/UserAvatar';
import { supabase } from '../lib/supabase';
import { getGeminiApiKey, saveGeminiApiKey, removeGeminiApiKey, maskApiKey, getOpenAIApiKey, saveOpenAIApiKey, removeOpenAIApiKey, getAIAIProvider, saveAIAIProvider, isProviderConfigured, providerDisplayName, AI_PROVIDERS, type AIProvider } from '../lib/aiConfig';
import { clearAICircuitBreakers } from '../lib/aiProvider';
import { useAppStore } from '../store/appStore';
import { saveCentroCache } from '../cache/centroCache';
import { useVinculacionInstitucional } from '../hooks/useVinculacionInstitucional';
import { PORTAL_FAMILIA_ENABLED } from '../config/features';
import type { Session } from '@supabase/supabase-js';
import type { Centro } from '../types';
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

type SectionId = 'perfil' | 'profesional' | 'seguridad' | 'ia' | 'apariencia';

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
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p && ['perfil', 'profesional', 'seguridad', 'ia', 'apariencia'].includes(p)) {
        return p as SectionId;
      }
    } catch {}
    return 'perfil';
  });
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
    newCentroId?: string | null;
  }) => {
    const currentCentroId = formData.newCentroId || centro?.id || null;
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
        className="relative w-full h-dvh md:h-auto md:max-h-[85vh] md:max-w-5xl bg-(--background) md:rounded-(--radius-lg) border border-(--border-soft) shadow-sm flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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

        <div className="flex-1 flex flex-col min-w-0 bg-(--background)">
          <Header activeSection={activeSection} onClose={onClose} />
          
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
             <div className="max-w-2xl mx-auto space-y-8">
                 {activeSection === 'perfil' && (
                  <InformacionGeneralTab 
                    userId={session?.user?.id || ''}
                    docenteNombre={docenteNombre} 
                    userEmail={session?.user?.email || ''} 
                    bio={extractedBio}
                    onSave={handleSaveInformacionGeneral}
                  />
                )}
                
                {activeSection === 'profesional' && (
                   <DatosProfesionalesTab 
                     userId={session?.user?.id}
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

                {activeSection === 'ia' && (
                   <IntegrarIATab session={session} />
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

const NavItem = ({ id, label, icon, activeSection, onSectionChange }: {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  activeSection: SectionId;
  onSectionChange: (id: SectionId) => void;
}) => {
  const selected = activeSection === id;
  return (
    <button
      onClick={() => onSectionChange(id)}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-full transition-all text-xs font-bold cursor-pointer ${
        selected 
          ? 'bg-(--primary) text-white shadow-sm' 
          : 'text-(--ink-soft) hover:bg-(--linen)/20 hover:text-(--ink)'
      }`}
      style={{ height: '36px' }}
    >
      <span className={`${selected ? 'text-white' : 'text-slate-400'}`}>
        {icon}
      </span>
      {label}
    </button>
  );
};

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

  return (
    <aside className="w-full md:w-70 shrink-0 flex flex-col bg-(--linen)/10 border-b md:border-b-0 md:border-r border-(--border-soft)">
      <div className="p-6 border-b border-(--border-soft) flex items-center gap-4 bg-(--linen)/5">
         <UserAvatar src={avatarUrl} name={docenteNombre} color={avatarColor} className="w-12 h-12 text-xl" />
         <div className="min-w-0">
            <h2 className="text-sm font-bold text-(--ink) truncate tracking-tight">{docenteNombre}</h2>
            <p className="text-xs text-(--ink-soft) truncate">{userEmail}</p>
         </div>
      </div>

      <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto">
        <NavItem id="perfil" label="Información general" icon={<User size={16} />} activeSection={activeSection} onSectionChange={onSectionChange} />
        <NavItem id="profesional" label="Datos profesionales" icon={<Briefcase size={16} />} activeSection={activeSection} onSectionChange={onSectionChange} />
        <NavItem id="seguridad" label="Seguridad" icon={<Shield size={16} />} activeSection={activeSection} onSectionChange={onSectionChange} />
        <NavItem id="ia" label="Integrar IA" icon={<Sparkles size={16} />} activeSection={activeSection} onSectionChange={onSectionChange} />
        <NavItem id="apariencia" label="Apariencia" icon={<Palette size={16} />} activeSection={activeSection} onSectionChange={onSectionChange} />
      </nav>

      <div className="p-4 border-t border-(--border-soft) bg-(--linen)/5 space-y-3">
         <button
            onClick={() => {
              if (window.confirm('¿Estás SEGURO de que deseas reiniciar tu año escolar? Esta acción es irreversible.')) {
                onResetSchoolYear();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-attention bg-attention/10 hover:bg-attention/20 transition-all border border-attention/20 cursor-pointer"
         >
            <AlertCircle size={14} />
            Reiniciar Año
         </button>
         <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-bold text-(--ink-soft) hover:text-attention hover:bg-attention/10 transition-colors cursor-pointer"
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
    'ia': 'Integración de IA',
    'apariencia': 'Personalización Visual'
  };

  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-(--border-soft) bg-(--background) sticky top-0 z-10">
       <h3 className="font-bold text-base text-(--ink) tracking-tight">
          {titles[activeSection]}
       </h3>
       <button 
         onClick={onClose} 
         className="p-2 text-slate-400 hover:text-slate-700 hover:bg-(--linen)/20 rounded-full transition-all cursor-pointer"
         aria-label="Cerrar"
       >
          <X size={18} />
       </button>
    </header>
  );
}

// ── Subcomponents: Tabs ──

interface InformacionGeneralTabProps {
  userId: string;
  docenteNombre: string;
  userEmail: string;
  bio: string;
  onSave: (nombreDocente: string, bio: string) => Promise<void>;
}

function InformacionGeneralTab({ userId, docenteNombre, userEmail, bio: initialBio, onSave }: InformacionGeneralTabProps) {
  const [nombreDocente, setNombreDocente] = useState(docenteNombre || '');
  const [bio, setBio] = useState(initialBio || '');

  // Portal Familia Config State
  const [portalConfig, setPortalConfig] = useState({
    portal_activo: false,
    mostrar_puntajes: true,
    mostrar_evidencias: true,
    mostrar_recursos: true,
    mostrar_incidencias: false,
    mostrar_recuperacion: true
  });
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (PORTAL_FAMILIA_ENABLED && userId) {
      const fetchConfig = async () => {
        setLoadingConfig(true);
        const { data, error } = await supabase
          .from('portal_configuraciones')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (!error && data) {
          setPortalConfig({
            portal_activo: data.portal_activo,
            mostrar_puntajes: data.mostrar_puntajes,
            mostrar_evidencias: data.mostrar_evidencias,
            mostrar_recursos: data.mostrar_recursos,
            mostrar_incidencias: data.mostrar_incidencias,
            mostrar_recuperacion: data.mostrar_recuperacion
          });
        }
        setLoadingConfig(false);
      };
      fetchConfig();
    }
  }, [userId]);

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
      
      // Save Portal Config if enabled
      if (PORTAL_FAMILIA_ENABLED && userId) {
        const { error: confError } = await supabase
          .from('portal_configuraciones')
          .upsert({
            user_id: userId,
            ...portalConfig,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        if (confError) throw confError;
      }

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
          <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Docente</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold"
            value={nombreDocente}
            onChange={e => setNombreDocente(e.target.value)}
            placeholder="Nombre del docente"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Correo Electrónico (Solo Lectura)</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) text-(--ink-soft) outline-none cursor-not-allowed"
            value={userEmail}
            readOnly
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Biografía</label>
        <textarea
          className="w-full h-40 p-4 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none resize-none transition-all font-medium"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Escribe tu trayectoria, metodologías o intereses..."
        />
      </div>

      {PORTAL_FAMILIA_ENABLED && (
        <div className="pt-6 mt-6 border-t border-(--border-soft)">
          <div className="mb-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-(--ink)">Portal Familia / Estudiante</h4>
            <p className="text-xs text-(--ink-soft) mt-1">Configura qué información está disponible en el portal cuando publiques resultados de tus asignaturas.</p>
          </div>
          
          {loadingConfig ? (
            <div className="flex items-center gap-2 text-xs text-(--ink-soft) animate-pulse">
              <Loader2 size={14} className="animate-spin" /> Cargando configuración...
            </div>
          ) : (
            <div className="space-y-3 bg-(--background) border border-(--border-soft) rounded-xl p-5">
              
              <label className="flex items-center justify-between gap-4 cursor-pointer pb-3 mb-3 border-b border-(--border-soft)">
                <div>
                  <div className="text-sm font-bold text-(--ink)">Portal Activo</div>
                  <div className="text-xs text-(--ink-soft)">Habilita el acceso general al portal. Si está apagado, el portal estará inactivo sin importar el resto de ajustes.</div>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input type="checkbox" name="portal_activo" className="peer sr-only" checked={portalConfig.portal_activo} onChange={(e) => setPortalConfig(p => ({ ...p, portal_activo: e.target.checked }))}/>
                  <div className="w-11 h-6 bg-(--border-soft) rounded-full peer peer-checked:bg-(--primary) transition-colors cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                </div>
              </label>

              <div className={`space-y-4 transition-opacity ${!portalConfig.portal_activo ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-(--ink)">Mostrar resultados de puntaje</div>
                    <div className="text-xs text-(--ink-soft)">Permite que se vean las calificaciones y promedios publicados.</div>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" className="peer sr-only" checked={portalConfig.mostrar_puntajes} onChange={(e) => setPortalConfig(p => ({ ...p, mostrar_puntajes: e.target.checked }))}/>
                    <div className="w-11 h-6 bg-(--border-soft) rounded-full peer peer-checked:bg-(--herb-garden) transition-colors cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-(--ink)">Mostrar evidencias de aprendizaje</div>
                    <div className="text-xs text-(--ink-soft)">Muestra el desglose de las rúbricas y listas de cotejo.</div>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" className="peer sr-only" checked={portalConfig.mostrar_evidencias} onChange={(e) => setPortalConfig(p => ({ ...p, mostrar_evidencias: e.target.checked }))}/>
                    <div className="w-11 h-6 bg-(--border-soft) rounded-full peer peer-checked:bg-(--herb-garden) transition-colors cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-(--ink)">Mostrar recuperación</div>
                    <div className="text-xs text-(--ink-soft)">Muestra el informe de recuperación académica si está disponible.</div>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" className="peer sr-only" checked={portalConfig.mostrar_recuperacion} onChange={(e) => setPortalConfig(p => ({ ...p, mostrar_recuperacion: e.target.checked }))}/>
                    <div className="w-11 h-6 bg-(--border-soft) rounded-full peer peer-checked:bg-(--herb-garden) transition-colors cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-(--ink)">Mostrar recursos compartidos</div>
                    <div className="text-xs text-(--ink-soft)">Hace visibles los documentos, enlaces y PDFs de las actividades.</div>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" className="peer sr-only" checked={portalConfig.mostrar_recursos} onChange={(e) => setPortalConfig(p => ({ ...p, mostrar_recursos: e.target.checked }))}/>
                    <div className="w-11 h-6 bg-(--border-soft) rounded-full peer peer-checked:bg-(--herb-garden) transition-colors cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-(--ink)">Mostrar incidencias académicas</div>
                    <div className="text-xs text-(--ink-soft)">Permite visualizar únicamente las incidencias clasificadas como "Rendimiento académico".</div>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" className="peer sr-only" checked={portalConfig.mostrar_incidencias} onChange={(e) => setPortalConfig(p => ({ ...p, mostrar_incidencias: e.target.checked }))}/>
                    <div className="w-11 h-6 bg-(--border-soft) rounded-full peer peer-checked:bg-(--herb-garden) transition-colors cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-8 rounded-xl bg-(--primary) text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
  userId?: string;
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
    newCentroId?: string | null;
  }) => Promise<void>;
}

function DatosProfesionalesTab({
  userId,
  instituto: _instituto,
  tipoInstitucion,
  centro,
  centroId,
  onSave
}: DatosProfesionalesTabProps) {
  const [centroReal, setCentroReal] = useState<any>(null);
  const [loadingCentro, setLoadingCentro] = useState(false);

  const { buscarCentros, vincularCentroExistente, registrarYVincularCentro, buscando, procesando, error: errorVinculo, setError: setErrorVinculo } = useVinculacionInstitucional();

  // Modo cuando el usuario no tiene centro vinculado
  const [modoSinCentro, setModoSinCentro] = useState<'existente' | 'nuevo'>('existente');
  const [busqueda, setBusqueda] = useState('');
  const [centrosEncontrados, setCentrosEncontrados] = useState<Centro[]>([]);
  const [centroSeleccionadoId, setCentroSeleccionadoId] = useState<string | null>(null);

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
  const isEditable = !tieneCentro || activeCentro?.afiliado === false || activeCentro?.created_by === userId;

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

  // Cargar lista inicial de centros para modo búsqueda si no tiene centro
  useEffect(() => {
    if (!tieneCentro) {
      buscarCentros('').then(setCentrosEncontrados);
    }
  }, [tieneCentro, buscarCentros]);

  // Debounce para búsqueda en modo existente
  useEffect(() => {
    if (tieneCentro) return;
    if (!busqueda.trim()) {
      buscarCentros('').then(setCentrosEncontrados);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await buscarCentros(busqueda);
      setCentrosEncontrados(res);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda, tieneCentro, buscarCentros]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vinculación a centro existente desde Configuración
  const handleVincularExistente = async () => {
    if (!centroSeleccionadoId || !userId) {
      setError('Por favor selecciona un centro educativo de la lista.');
      return;
    }
    setError(null);
    const res = await vincularCentroExistente(centroSeleccionadoId, userId);
    if (res.ok && res.centro) {
      setCentroReal(res.centro);
      await onSave({ ...form, instituto: res.centro.nombre, newCentroId: res.centro.id });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(res.error || 'Error al vincular el centro educativo.');
    }
  };

  // Guardado estándar (actualizar centro si existe, o registrar uno nuevo)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!tieneCentro && userId) {
        // Registrar centro nuevo y vincular
        if (!form.instituto.trim() || form.instituto.trim().length < 3) {
          throw new Error('El nombre del centro educativo es obligatorio (mínimo 3 caracteres).');
        }

        const res = await registrarYVincularCentro({
          nombre: form.instituto.trim(),
          codigoCentro: form.codigoCentro.trim() || undefined,
          distritoEducativo: form.distrito.trim() || undefined,
          telefono: form.telefonoCentro.trim() || undefined,
          tanda: form.tanda,
          tipoInstitucion: form.tipoInstitucion,
          provincia: form.provincia.trim() || undefined,
          municipio: form.municipio.trim() || undefined
        }, userId);

        if (!res.ok || !res.centro) {
          throw new Error(res.error || 'No se pudo registrar el centro educativo.');
        }

        setCentroReal(res.centro);
        await onSave({ ...form, newCentroId: res.centro.id });
      } else if (centroId && isEditable) {
        // Actualizar centro existente editable
        const updates: any = {
          nombre: form.instituto.trim(),
          tanda: form.tanda
        };
        if (form.codigoCentro.trim()) updates.codigo_centro = form.codigoCentro.trim();
        if (form.telefonoCentro.trim()) updates.telefono = form.telefonoCentro.trim();
        if (form.distrito.trim()) updates.distrito_educativo = form.distrito.trim();
        if (form.regional.trim()) updates.regional_educacion = form.regional.trim();
        if (form.provincia.trim()) updates.provincia = form.provincia.trim();
        if (form.municipio.trim()) updates.municipio = form.municipio.trim();

        const { error: errCentro } = await supabase
          .from('centros')
          .update(updates)
          .eq('id', centroId);

        if (errCentro) throw errCentro;

        const { data: updatedCentro } = await supabase
          .from('centros')
          .select('*')
          .eq('id', centroId)
          .maybeSingle();

        if (updatedCentro) {
          setCentroReal(updatedCentro);
          saveCentroCache(updatedCentro);
        }

        await onSave({ ...form, newCentroId: centroId });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const displayError = error || errorVinculo;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {displayError && (
        <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <AlertCircle size={16} />
          {displayError}
        </div>
      )}
      {saved && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <CheckCircle size={16} />
          Cambios guardados con éxito
        </div>
      )}

      {!tieneCentro && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-medium flex items-start gap-3">
            <Building2 size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 text-sm">Completa los datos de tu centro educativo</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                Tu cuenta aún no tiene un centro vinculado. Puedes buscar un centro existente o registrar tu propia institución para habilitar todas las herramientas docentes.
              </p>
            </div>
          </div>

          <div className="flex gap-2 p-1.5 rounded-2xl bg-(--linen)/20 border border-(--border-soft)">
            <button
              type="button"
              onClick={() => { setModoSinCentro('existente'); setError(null); setErrorVinculo(null); }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
                modoSinCentro === 'existente'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search size={14} />
              <span>Seleccionar centro existente</span>
            </button>
            <button
              type="button"
              onClick={() => { setModoSinCentro('nuevo'); setError(null); setErrorVinculo(null); }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
                modoSinCentro === 'nuevo'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlusCircle size={14} />
              <span>Registrar mi centro</span>
            </button>
          </div>
        </div>
      )}

      {loadingCentro && (
        <div className="flex items-center gap-2 text-xs font-semibold text-primary animate-pulse">
          <Loader2 size={14} className="animate-spin" />
          Cargando datos institucionales reales...
        </div>
      )}

      {!tieneCentro && modoSinCentro === 'existente' ? (
        <div className="space-y-4 pt-2">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, código de centro o distrito..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-(--primary) outline-none transition-all placeholder:text-slate-400 font-medium"
            />
            {buscando && (
              <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {centrosEncontrados.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-xs font-bold text-slate-600">No encontramos coincidencias</p>
                <p className="text-xs text-slate-400 mt-1">
                  Puedes dar de alta tu centro en la pestaña «Registrar mi centro».
                </p>
              </div>
            ) : (
              centrosEncontrados.map(c => {
                const isSelected = centroSeleccionadoId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setCentroSeleccionadoId(c.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-(--primary) bg-(--primary)/5 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{c.nombre}</h4>
                        {c.afiliado && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Afiliado
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                        {c.codigoCentro && <span>Cód: <strong>{c.codigoCentro}</strong></span>}
                        {c.distritoEducativo && <span>Distrito: <strong>{c.distritoEducativo}</strong></span>}
                        {c.tanda && <span>{c.tanda}</span>}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-(--primary) bg-(--primary) text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleVincularExistente}
              disabled={!centroSeleccionadoId || procesando}
              className="h-11 px-8 rounded-xl bg-(--primary) text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {procesando ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Vinculando...</span>
                </>
              ) : (
                'Vincular a este centro'
              )}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Centro educativo *</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                value={form.instituto}
                onChange={(e) => setForm(p => ({ ...p, instituto: e.target.value }))}
                placeholder={tieneCentro ? "Nombre del centro educativo" : "Ej. Escuela Primaria República de Chile"}
                disabled={!isEditable}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Código del centro</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                value={form.codigoCentro}
                onChange={(e) => setForm(p => ({ ...p, codigoCentro: e.target.value }))}
                placeholder={tieneCentro ? "Código del centro" : "Ej. 04123"}
                disabled={!isEditable}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Tipo de Institución</label>
              <div className="flex gap-3">
                {(['publica', 'privada'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => isEditable && setForm(p => ({ ...p, tipoInstitucion: t }))}
                    disabled={!isEditable}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${!isEditable ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} ${
                      form.tipoInstitucion === t 
                        ? 'bg-(--primary) text-white border-transparent shadow-sm font-bold' 
                        : 'bg-white text-(--ink) border-(--border-soft) hover:border-(--border-soft)/80 hover:bg-(--linen)/10'
                    }`}
                  >
                    {t === 'publica' ? "Pública" : "Privada"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Tanda</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                value={form.tanda}
                onChange={(e) => setForm(p => ({ ...p, tanda: e.target.value }))}
                disabled={!isEditable}
              >
                <option value="Jornada Extendida">Jornada Extendida</option>
                <option value="Matutina">Matutina</option>
                <option value="Vespertina">Vespertina</option>
                <option value="Nocturna">Nocturna</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Teléfono del centro</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                value={form.telefonoCentro}
                onChange={(e) => setForm(p => ({ ...p, telefonoCentro: e.target.value }))}
                placeholder={tieneCentro ? "Teléfono del centro" : "Ej. (809) 555-0123"}
                disabled={!isEditable}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Distrito educativo</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                value={form.distrito}
                onChange={(e) => setForm(p => ({ ...p, distrito: e.target.value }))}
                placeholder={tieneCentro ? "Distrito educativo" : "Ej. 10-01"}
                disabled={!isEditable}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Regional de educación</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                value={form.regional}
                onChange={(e) => setForm(p => ({ ...p, regional: e.target.value }))}
                placeholder={tieneCentro ? "Regional de educación" : "Ej. Regional 10"}
                disabled={!isEditable}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Provincia</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                value={form.provincia}
                onChange={(e) => setForm(p => ({ ...p, provincia: e.target.value }))}
                placeholder={tieneCentro ? "Provincia" : "Ej. Santo Domingo"}
                disabled={!isEditable}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Municipio</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                value={form.municipio}
                onChange={(e) => setForm(p => ({ ...p, municipio: e.target.value }))}
                placeholder={tieneCentro ? "Municipio" : "Ej. Santo Domingo Este"}
                disabled={!isEditable}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving || procesando}
              className="h-11 px-8 rounded-xl bg-(--primary) text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving || procesando ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                !tieneCentro ? 'Registrar y vincular centro' : 'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
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
      {/* ── ID del Centro ── */}
      {centroId && (
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-(--ink)">Identificador Institucional</h4>
          <p className="text-xs text-(--ink-soft) mb-2 font-medium">Comparte este ID con otros docentes para que puedan vincularse a este mismo centro educativo al crear su cuenta.</p>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={centroId} 
              className="w-full md:max-w-md px-4 py-2.5 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:outline-none text-(--ink-soft) font-mono"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(centroId);
                setMessage({ type: 'success', text: 'ID copiado al portapapeles' });
                setTimeout(() => setMessage(null), 3000);
              }}
              className="px-4 py-2.5 rounded-xl bg-(--linen)/30 text-(--ink) border border-(--border-soft) hover:bg-(--linen)/50 hover:border-(--ink-soft) transition-all text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Copiar ID
            </button>
          </div>
        </div>
      )}

      {/* ── Cambiar contraseña ── */}
      <div className="space-y-4 pt-4 border-t border-(--border-soft)">
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

function IntegrarIATab({ session }: { session: Session | null }) {
  const userId = session?.user?.id;
  const [provider, setProvider] = useState<AIProvider>(() => getAIAIProvider(userId));

  const handleSelectProvider = (p: AIProvider) => {
    if (!userId) return;
    saveAIAIProvider(userId, p);
    setProvider(p);
  };

  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(() => getGeminiApiKey(userId));
  const configurado = !!apiKey;

  const refreshApiKey = () => setApiKey(getGeminiApiKey(userId));

  const handleGuardar = () => {
    if (!inputKey.trim() || !userId) return;
    clearAICircuitBreakers(userId);
    saveGeminiApiKey(userId, inputKey);
    setInputKey('');
    refreshApiKey();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  const handleEliminar = () => {
    if (!userId) return;
    if (!window.confirm('¿Eliminar tu API Key de Gemini guardada? Tendrás que ingresarla nuevamente para usar las funciones de IA.')) return;
    removeGeminiApiKey(userId);
    clearAICircuitBreakers(userId);
    refreshApiKey();
  };

  const [openaiInputKey, setOpenaiInputKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [openaiSavedFlash, setOpenaiSavedFlash] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string | null>(() => getOpenAIApiKey(userId));
  const openaiConfigurado = !!openaiApiKey;

  const refreshOpenAIApiKey = () => setOpenaiApiKey(getOpenAIApiKey(userId));

  const handleOpenAIGuardar = () => {
    if (!openaiInputKey.trim() || !userId) return;
    clearAICircuitBreakers(userId);
    saveOpenAIApiKey(userId, openaiInputKey);
    setOpenaiInputKey('');
    refreshOpenAIApiKey();
    setOpenaiSavedFlash(true);
    setTimeout(() => setOpenaiSavedFlash(false), 2500);
  };

  const handleOpenAIEliminar = () => {
    if (!userId) return;
    if (!window.confirm('¿Eliminar tu API Key de OpenAI guardada? Tendrás que ingresarla nuevamente para usar las funciones de IA.')) return;
    removeOpenAIApiKey(userId);
    clearAICircuitBreakers(userId);
    refreshOpenAIApiKey();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-(--radius-lg) border border-(--border-soft) bg-white shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-(--linen)/50 text-(--ink) border border-(--border-soft) shadow-sm shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-(--ink) tracking-tight">Proveedor de IA</h3>
            <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mt-0.5">
              El proveedor que usarán las funciones de IA de CIELO
            </p>
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-1 rounded-xl bg-(--linen)/30 border border-(--border-soft) p-1.5">
          {AI_PROVIDERS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => handleSelectProvider(p)}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                provider === p
                  ? 'bg-white text-(--ink) shadow-sm'
                  : 'text-(--ink-soft) hover:text-(--ink)'
              }`}
            >
              {providerDisplayName(p)}
            </button>
          ))}
        </div>

        {!isProviderConfigured(userId, provider) && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-bold text-amber-700">
            <AlertCircle size={14} />
            Configura tu API de {providerDisplayName(provider)} para utilizar esta función.
          </div>
        )}

        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-blue-50/70 border border-blue-200/70 px-4 py-3 text-xs font-medium text-blue-900 leading-relaxed">
          <Sparkles size={15} className="text-blue-600 shrink-0" />
          <span>
            <strong className="font-bold">Recuperación automática multicanal:</strong> Si tu proveedor preferido experimenta caídas (500/503), sobrecarga temporal o agota su cuota, CIELO se recupera automáticamente mediante el asistente de respaldo en la nube para que tu progreso nunca se interrumpa.
          </span>
        </div>
      </div>

      <div className="rounded-(--radius-lg) border border-(--border-soft) bg-white shadow-sm p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2.5 rounded-xl bg-(--linen)/50 text-(--ink) border border-(--border-soft) shadow-sm shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-(--ink) tracking-tight">Google Gemini</h3>
            <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mt-0.5">
              Potencia las funciones de IA de CIELO
            </p>
          </div>
          <span className={`ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border ${
            configurado
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {configurado ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {configurado ? 'Configurado' : 'No configurado'}
          </span>
        </div>

        {configurado ? (
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap rounded-xl bg-(--linen)/20 border border-(--border-soft) px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-(--ink-soft)">Clave activa</p>
              <p className="text-sm font-mono font-bold text-(--ink) truncate">{maskApiKey(apiKey)}</p>
            </div>
            <button
              onClick={handleEliminar}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-attention bg-attention/10 hover:bg-attention/20 transition-all border border-attention/20 cursor-pointer"
            >
              Eliminar clave
            </button>
          </div>
        ) : (
          <p className="mb-5 text-sm text-(--ink-soft) leading-relaxed rounded-xl bg-(--linen)/20 border border-(--border-soft) px-4 py-3">
            Aún no has configurado tu clave de Gemini. Cuando lo hagas, funciones como
            <span className="font-semibold text-(--ink)"> Nueva actividad</span> la utilizarán automáticamente.
          </p>
        )}

        <SimplePasswordField
          label={configurado ? 'Actualizar API Key' : 'API Key de Gemini'}
          value={inputKey}
          onChange={setInputKey}
          show={showKey}
          onToggle={() => setShowKey(s => !s)}
        />

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={handleGuardar}
            disabled={!inputKey.trim()}
            className={`px-6 py-2.5 rounded-xl bg-(--primary) text-white shadow-sm text-xs font-bold uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 focus-visible:ring-offset-2 hover:opacity-90 active:scale-[0.98] transition-all ${!inputKey.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {configurado ? 'Actualizar clave' : 'Guardar clave'}
          </button>
          {savedFlash && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <CheckCircle size={14} /> Guardado
            </span>
          )}
        </div>

        <p className="mt-5 text-xs text-(--ink-soft) leading-relaxed">
          Puedes obtener tu clave gratuita en{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="font-semibold text-(--primary) hover:underline">
            Google AI Studio
          </a>. La clave se guarda únicamente en este dispositivo y nunca se muestra completa ni se registra en logs.
        </p>
      </div>

      <div className="rounded-(--radius-lg) border border-(--border-soft) bg-white shadow-sm p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2.5 rounded-xl bg-(--linen)/50 text-(--ink) border border-(--border-soft) shadow-sm shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-(--ink) tracking-tight">OpenAI</h3>
            <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mt-0.5">
              Proveedor alternativo de IA para CIELO
            </p>
          </div>
          <span className={`ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border ${
            openaiConfigurado
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {openaiConfigurado ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {openaiConfigurado ? 'Configurado' : 'No configurado'}
          </span>
        </div>

        {openaiConfigurado ? (
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap rounded-xl bg-(--linen)/20 border border-(--border-soft) px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-(--ink-soft)">Clave activa</p>
              <p className="text-sm font-mono font-bold text-(--ink) truncate">{maskApiKey(openaiApiKey)}</p>
            </div>
            <button
              onClick={handleOpenAIEliminar}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-attention bg-attention/10 hover:bg-attention/20 transition-all border border-attention/20 cursor-pointer"
            >
              Eliminar clave
            </button>
          </div>
        ) : (
          <p className="mb-5 text-sm text-(--ink-soft) leading-relaxed rounded-xl bg-(--linen)/20 border border-(--border-soft) px-4 py-3">
            Aún no has configurado tu clave de OpenAI. Cuando lo hagas, las funciones que utilicen
            este proveedor podrán usarla automáticamente.
          </p>
        )}

        <SimplePasswordField
          label={openaiConfigurado ? 'Actualizar API Key' : 'API Key de OpenAI'}
          value={openaiInputKey}
          onChange={setOpenaiInputKey}
          show={showOpenaiKey}
          onToggle={() => setShowOpenaiKey(s => !s)}
        />

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={handleOpenAIGuardar}
            disabled={!openaiInputKey.trim()}
            className={`px-6 py-2.5 rounded-xl bg-(--primary) text-white shadow-sm text-xs font-bold uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 focus-visible:ring-offset-2 hover:opacity-90 active:scale-[0.98] transition-all ${!openaiInputKey.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {openaiConfigurado ? 'Actualizar clave' : 'Guardar clave'}
          </button>
          {openaiSavedFlash && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <CheckCircle size={14} /> Guardado
            </span>
          )}
        </div>

        <p className="mt-5 text-xs text-(--ink-soft) leading-relaxed">
          Puedes obtener tu clave en{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="font-semibold text-(--primary) hover:underline">
            Plataforma OpenAI
          </a>. La clave se guarda únicamente en este dispositivo y nunca se muestra completa ni se registra en logs.
        </p>
      </div>

      <div className="rounded-(--radius-lg) border border-(--border-soft) bg-white shadow-sm p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2.5 rounded-xl bg-(--linen)/50 text-(--ink) border border-(--border-soft) shadow-sm shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-(--ink) tracking-tight">Asistente CIELO (Nube)</h3>
            <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mt-0.5">
              Infraestructura en la nube con respaldo automático
            </p>
          </div>
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle size={12} /> Activo y disponible
          </span>
        </div>
        <p className="text-xs text-(--ink-soft) leading-relaxed">
          El Asistente CIELO está integrado directamente a través de nuestra infraestructura segura en la nube. Funciona tanto como proveedor principal como red de rescate automática ante saturaciones o agotamiento de cuota de Gemini/OpenAI. No requiere ninguna clave ni configuración manual.
        </p>
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
              <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-50 transition-transform group-hover:scale-[1.02]">
                <UserAvatar src={avatarUrl} name={docenteNombre} color={avatarColor} className="w-full h-full text-5xl" />
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
       <label className="text-sm font-semibold text-(--ink)">{label}</label>
       <div className="relative">
          <input 
             type={show ? 'text' : 'password'}
             value={value}
             onChange={e => onChange(e.target.value)}
             placeholder="••••••••"
             autoComplete="new-password"
             className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) hover:border-(--border-soft)/80 outline-none transition-all"
          />
          <button 
             onClick={onToggle}
             className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-(--ink) rounded-md hover:bg-(--linen)/10 transition-colors cursor-pointer"
             aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
             {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
       </div>
    </div>
  );
}
