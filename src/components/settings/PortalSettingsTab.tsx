import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  House,
  FolderOpen,
  Target,
  ClipboardList,
  Files,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type PeriodoPortal = 'P1' | 'P2' | 'P3' | 'P4';

export type SeccionPortalKey =
  | 'seccion_inicio'
  | 'seccion_portafolio'
  | 'seccion_recuperacion'
  | 'seccion_incidencias'
  | 'seccion_fichas';

export interface PortalConfigDocente {
  seccion_inicio: boolean;
  seccion_portafolio: boolean;
  seccion_recuperacion: boolean;
  seccion_incidencias: boolean;
  seccion_fichas: boolean;
  inicio_mostrar_evidencias: boolean;
  inicio_mostrar_incidencias: boolean;
  periodos_visibles: PeriodoPortal[];
}

interface PortalDocenteRpcResponse extends Partial<PortalConfigDocente> {
  error?: string;
  success?: boolean;
}

interface SeccionMeta {
  key: SeccionPortalKey;
  titulo: string;
  descripcion: string;
  Icon: LucideIcon;
  iconBoxClass: string;
  badgeVisibleClass: string;
  switchCheckedClass: string;
}

const PERIODOS_DISPONIBLES: readonly PeriodoPortal[] = ['P1', 'P2', 'P3', 'P4'] as const;

const DEFAULT_CONFIG: PortalConfigDocente = {
  seccion_inicio: true,
  seccion_portafolio: true,
  seccion_recuperacion: true,
  seccion_incidencias: true,
  seccion_fichas: true,
  inicio_mostrar_evidencias: true,
  inicio_mostrar_incidencias: true,
  periodos_visibles: ['P1', 'P2', 'P3', 'P4'],
};

const SECCIONES_PORTAL_META: readonly SeccionMeta[] = [
  {
    key: 'seccion_inicio',
    titulo: 'Inicio',
    descripcion: 'Pantalla principal de la asignatura con anillos de logro por competencias, evidencias e incidencias.',
    Icon: House,
    iconBoxClass: 'bg-[#689C63]/15 border-[#689C63]/30 text-[#4B7547]',
    badgeVisibleClass: 'bg-[#689C63]/15 text-[#4B7547] border-[#689C63]/25',
    switchCheckedClass: 'peer-checked:bg-[#689C63]',
  },
  {
    key: 'seccion_portafolio',
    titulo: 'Portafolio',
    descripcion: 'Bandeja de evidencias entregadas, estado de revisión, sellos otorgados y subida de archivos o Drive.',
    Icon: FolderOpen,
    iconBoxClass: 'bg-[#537BAC]/15 border-[#537BAC]/30 text-[#2C4F7C]',
    badgeVisibleClass: 'bg-[#537BAC]/15 text-[#2C4F7C] border-[#537BAC]/25',
    switchCheckedClass: 'peer-checked:bg-[#537BAC]',
  },
  {
    key: 'seccion_recuperacion',
    titulo: 'Recuperación',
    descripcion: 'Muestra las actividades de refuerzo pedagógico y listas de cotejo de recuperación asignadas al alumno.',
    Icon: Target,
    iconBoxClass: 'bg-[#EB8847]/15 border-[#EB8847]/30 text-[#B55A1F]',
    badgeVisibleClass: 'bg-[#EB8847]/15 text-[#B55A1F] border-[#EB8847]/25',
    switchCheckedClass: 'peer-checked:bg-[#EB8847]',
  },
  {
    key: 'seccion_incidencias',
    titulo: 'Incidencias',
    descripcion: 'Bitácora individual de convivencia escolar, acuerdos firmados, compromisos y medidas formativas.',
    Icon: ClipboardList,
    iconBoxClass: 'bg-[#DB5B48]/15 border-[#DB5B48]/30 text-[#A63524]',
    badgeVisibleClass: 'bg-[#DB5B48]/15 text-[#A63524] border-[#DB5B48]/25',
    switchCheckedClass: 'peer-checked:bg-[#DB5B48]',
  },
  {
    key: 'seccion_fichas',
    titulo: 'Fichas Didácticas',
    descripcion: 'Material didáctico compartido, guías de estudio interactivas y fichas pedagógicas de la clase.',
    Icon: Files,
    iconBoxClass: 'bg-[#DEAE4D]/20 border-[#DEAE4D]/35 text-[#8C6415]',
    badgeVisibleClass: 'bg-[#DEAE4D]/20 text-[#8C6415] border-[#DEAE4D]/30',
    switchCheckedClass: 'peer-checked:bg-[#DEAE4D]',
  },
] as const;

function isPeriodoPortal(val: unknown): val is PeriodoPortal {
  return typeof val === 'string' && (PERIODOS_DISPONIBLES as readonly string[]).includes(val);
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  }
  return fallback;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  checkedColorClass?: string;
  ariaLabel: string;
}

const ToggleSwitch = React.memo(function ToggleSwitch({
  checked,
  onChange,
  checkedColorClass = 'peer-checked:bg-(--primary)',
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`w-11 h-6 bg-(--border-soft) peer-focus:outline-none rounded-full peer ${checkedColorClass} transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white shadow-2xs`}
      />
    </label>
  );
});

interface SeccionToggleCardProps {
  meta: SeccionMeta;
  activo: boolean;
  onToggle: (key: SeccionPortalKey, checked: boolean) => void;
}

const SeccionToggleCard = React.memo(function SeccionToggleCard({
  meta,
  activo,
  onToggle,
}: SeccionToggleCardProps) {
  const { key, titulo, descripcion, Icon, iconBoxClass, badgeVisibleClass, switchCheckedClass } = meta;

  const handleChange = useCallback(
    (checked: boolean) => {
      onToggle(key, checked);
    },
    [key, onToggle]
  );

  return (
    <div className="p-4 rounded-2xl border border-(--border-soft) bg-white/70 hover:bg-white transition flex items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBoxClass}`}>
          <Icon size={20} />
        </div>
        <div className="space-y-0.5">
          <div className="text-sm font-bold text-(--ink) flex items-center gap-2">
            <span>{titulo}</span>
            {activo ? (
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeVisibleClass}`}>
                Visible
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                Oculta
              </span>
            )}
          </div>
          <p className="text-xs text-(--ink-soft) leading-snug">{descripcion}</p>
        </div>
      </div>

      <ToggleSwitch
        checked={activo}
        onChange={handleChange}
        checkedColorClass={switchCheckedClass}
        ariaLabel={`Visibilidad de la sección ${titulo}`}
      />
    </div>
  );
});

export default function PortalSettingsTab() {
  const [config, setConfig] = useState<PortalConfigDocente>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('portal_docente_get_config');
        if (rpcError) throw rpcError;

        const payload = data as PortalDocenteRpcResponse | null;
        if (payload && isMounted) {
          if (payload.error) throw new Error(payload.error);

          const rawPeriodos = Array.isArray(payload.periodos_visibles)
            ? payload.periodos_visibles.filter(isPeriodoPortal)
            : [];

          setConfig({
            seccion_inicio: payload.seccion_inicio ?? true,
            seccion_portafolio: payload.seccion_portafolio ?? true,
            seccion_recuperacion: payload.seccion_recuperacion ?? true,
            seccion_incidencias: payload.seccion_incidencias ?? true,
            seccion_fichas: payload.seccion_fichas ?? true,
            inicio_mostrar_evidencias: payload.inicio_mostrar_evidencias ?? true,
            inicio_mostrar_incidencias: payload.inicio_mostrar_incidencias ?? true,
            periodos_visibles: rawPeriodos.length > 0 ? rawPeriodos : [...PERIODOS_DISPONIBLES],
          });
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(extractErrorMessage(err, 'No se pudo cargar la configuración del portal'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConfig();

    return () => {
      isMounted = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleToggleSeccion = useCallback((key: SeccionPortalKey, checked: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: checked }));
  }, []);

  const handleToggleEvidenciasInicio = useCallback((checked: boolean) => {
    setConfig((prev) => ({ ...prev, inicio_mostrar_evidencias: checked }));
  }, []);

  const handleToggleIncidenciasInicio = useCallback((checked: boolean) => {
    setConfig((prev) => ({ ...prev, inicio_mostrar_incidencias: checked }));
  }, []);

  const handleTogglePeriodo = useCallback((periodo: PeriodoPortal) => {
    setConfig((prev) => {
      const current = prev.periodos_visibles;
      const exists = current.includes(periodo);
      if (exists) {
        if (current.length === 1) return prev;
        return {
          ...prev,
          periodos_visibles: current.filter((item) => item !== periodo),
        };
      }
      return {
        ...prev,
        periodos_visibles: [...current, periodo].sort(),
      };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSaving(true);
      setError(null);
      setSaved(false);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('portal_docente_save_config', {
          p_config: config,
        });

        if (rpcError) throw rpcError;
        const payload = data as PortalDocenteRpcResponse | null;
        if (payload?.error) throw new Error(payload.error);

        setSaved(true);
        saveTimerRef.current = setTimeout(() => {
          setSaved(false);
        }, 4000);
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Error al guardar la configuración'));
      } finally {
        setSaving(false);
      }
    },
    [config]
  );

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-stone-500">
        <Loader2 size={28} className="animate-spin text-(--primary)" />
        <span className="text-xs font-bold uppercase tracking-wider">Cargando configuración del portal...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Banner Informativo Global */}
      <div className="p-4 rounded-2xl bg-[#537BAC]/10 border border-[#537BAC]/25 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-[#537BAC]/20 border border-[#537BAC]/30 flex items-center justify-center shrink-0 text-[#2C4F7C] mt-0.5">
          <Info size={18} />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#2C4F7C]">
            Configuración Global de Estudiantes
          </h4>
          <p className="text-xs leading-relaxed text-stone-600 font-medium">
            Las opciones seleccionadas se aplicarán de forma inmediata a todos los alumnos que accedan al{' '}
            <strong className="text-stone-900 font-bold">Portal del estudiante</strong> para tus asignaturas.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {saved && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-in fade-in">
          <CheckCircle size={16} />
          Configuración del portal guardada con éxito
        </div>
      )}

      {/* GRUPO 1: SECCIONES DEL PORTAL */}
      <div className="space-y-4">
        <div className="border-b border-(--border-soft) pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-(--ink) flex items-center gap-2">
              <Layers size={16} className="text-(--primary)" />
              Secciones del Menú del Portal
            </h3>
            <p className="text-xs text-(--ink-soft) mt-0.5">
              Controla qué pestañas del menú inferior están disponibles y accesibles para los alumnos.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {SECCIONES_PORTAL_META.map((meta) => (
            <SeccionToggleCard
              key={meta.key}
              meta={meta}
              activo={config[meta.key]}
              onToggle={handleToggleSeccion}
            />
          ))}
        </div>
      </div>

      {/* GRUPO 2: INFORMACIÓN DE INICIO */}
      <div className="space-y-4 pt-4 border-t border-(--border-soft)">
        <div className="space-y-4">
          {/* Evidencias de aprendizaje + Selector de Períodos */}
          <div className="p-4 sm:p-5 rounded-2xl border border-(--border-soft) bg-white/70 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-(--ink) flex items-center gap-2">
                  <span>Evidencias de Aprendizaje</span>
                  {config.inicio_mostrar_evidencias ? (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                      Activado
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                      Desactivado
                    </span>
                  )}
                </div>
                <p className="text-xs text-(--ink-soft) leading-snug">
                  Muestra la lista de actividades evaluadas, indicadores trabajados y calificaciones alcanzadas.
                </p>
              </div>

              <ToggleSwitch
                checked={config.inicio_mostrar_evidencias}
                onChange={handleToggleEvidenciasInicio}
                ariaLabel="Mostrar Evidencias de Aprendizaje en Inicio"
              />
            </div>

            {/* Selector de Períodos Visibles */}
            <div className="pt-3 border-t border-(--border-soft)/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-(--ink) flex items-center gap-1.5">
                  <Calendar size={14} className="text-(--ink-soft)" />
                  Períodos académicos visibles en Inicio:
                </span>
                <span className="text-[10px] text-(--ink-soft) font-medium">
                  {config.periodos_visibles.length} de 4 seleccionados
                </span>
              </div>
              <p className="text-[11px] text-(--ink-soft) leading-relaxed">
                El estudiante solo podrá seleccionar y consultar las evidencias de los períodos marcados a continuación:
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {PERIODOS_DISPONIBLES.map((periodo) => {
                  const isActivo = config.periodos_visibles.includes(periodo);
                  return (
                    <button
                      type="button"
                      key={periodo}
                      aria-pressed={isActivo}
                      onClick={() => handleTogglePeriodo(periodo)}
                      className={`px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                        isActivo
                          ? 'bg-[#1E1E24] text-white border-[#1E1E24] shadow-xs scale-100'
                          : 'bg-stone-100 text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isActivo ? 'bg-[#689C63]' : 'bg-stone-300'}`} />
                      <span>Período {periodo}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Incidencias en Inicio */}
          <div className="p-4 sm:p-5 rounded-2xl border border-(--border-soft) bg-white/70 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-(--ink) flex items-center gap-2">
                <span>Bitácora de Convivencia en Inicio</span>
                {config.inicio_mostrar_incidencias ? (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                    Activado
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                    Desactivado
                  </span>
                )}
              </div>
              <p className="text-xs text-(--ink-soft) leading-snug">
                Muestra el bloque resumen de incidencias y compromisos directamente en la vista principal de la asignatura.
              </p>
            </div>

            <ToggleSwitch
              checked={config.inicio_mostrar_incidencias}
              onChange={handleToggleIncidenciasInicio}
              ariaLabel="Mostrar Bitácora de Convivencia en Inicio"
            />
          </div>
        </div>
      </div>

      {/* Botón de Guardar Cambios */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--border-soft)">
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-8 rounded-full bg-(--primary) hover:bg-(--primary)/90 active:scale-98 text-white text-xs font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Guardando configuración...
            </>
          ) : (
            <>
              <CheckCircle size={15} />
              Guardar configuración del Portal
            </>
          )}
        </button>
      </div>
    </form>
  );
}
