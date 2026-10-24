import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePortal } from './portalContext';
import { 
  ShieldAlert, 
  Bookmark, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Loader2, 
  RefreshCw, 
  ShieldCheck,
  Tag
} from 'lucide-react';
import { sonMismaAsignatura, SIETE_ASIGNATURAS_OFICIALES } from '../../constants/asignaturas';

export interface PortalIncidencia {
  id: number;
  fecha: string;
  categoria: 'Conducta' | 'Académico' | 'Salud' | 'Otro' | string;
  descripcion: string;
  acciones_tomadas?: string[] | null;
  acuerdos?: string | null;
  gravedad?: 'leve' | 'moderada' | 'grave' | string | null;
  created_at?: string;
}

type CategoriaFiltro = 'Todas' | 'Conducta' | 'Académico' | 'Salud' | 'Otro';

const CATEGORIAS_CONFIG: Record<string, { icon: React.ElementType; label: string; badgeBg: string; badgeText: string; iconBg: string }> = {
  Conducta: {
    icon: ShieldAlert,
    label: 'Conducta',
    badgeBg: 'bg-orange-50 border-orange-200 text-orange-700',
    badgeText: 'text-orange-700',
    iconBg: 'bg-orange-100 text-orange-600 border-orange-200',
  },
  Académico: {
    icon: Bookmark,
    label: 'Académico',
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
    badgeText: 'text-blue-700',
    iconBg: 'bg-blue-100 text-blue-600 border-blue-200',
  },
  Salud: {
    icon: AlertCircle,
    label: 'Salud y Bienestar',
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    badgeText: 'text-emerald-700',
    iconBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  },
  Otro: {
    icon: FileText,
    label: 'Otro',
    badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
    badgeText: 'text-amber-700',
    iconBg: 'bg-amber-100 text-amber-600 border-amber-200',
  },
};

const GRAVEDAD_CONFIG: Record<string, { label: string; className: string }> = {
  leve: {
    label: 'Primera Vez',
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  moderada: {
    label: 'Recurrente',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  grave: {
    label: 'Persistente',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const formatearFechaLegible = (fechaStr?: string | null): string => {
  if (!fechaStr) return '';
  try {
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
      const year = parseInt(partes[0], 10);
      const month = parseInt(partes[1], 10) - 1;
      const day = parseInt(partes[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    const d = new Date(fechaStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return fechaStr;
};

export default function PortalIncidencias() {
  const { sessionToken, estudianteContext, selectedAsignatura } = usePortal();

  const [incidencias, setIncidencias] = useState<PortalIncidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaFiltro>('Todas');

  const activeOficial = useMemo(() => {
    if (!selectedAsignatura) return null;
    return SIETE_ASIGNATURAS_OFICIALES.find((a) => sonMismaAsignatura(a.nombre, selectedAsignatura)) || null;
  }, [selectedAsignatura]);

  const cargarIncidencias = useCallback(async (isRefresh = false) => {
    if (!sessionToken) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      // Intentar leer de caché de sesión para navegación fluida
      try {
        const cached = sessionStorage.getItem(`portal_incidencias_${sessionToken}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setIncidencias(parsed);
            setLoading(false);
          }
        }
      } catch {
        // Ignorar fallos de caché
      }
    }

    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('portal_get_estudiante_incidencias', {
        p_session_token: sessionToken,
      });

      if (rpcError) throw rpcError;
      if (data && data.error) throw new Error(data.error);

      const lista: PortalIncidencia[] = Array.isArray(data) ? data : [];
      setIncidencias(lista);

      // Guardar en caché asociada únicamente al token de sesión actual
      try {
        sessionStorage.setItem(`portal_incidencias_${sessionToken}`, JSON.stringify(lista));
      } catch {
        // Ignorar límites de almacenamiento
      }
    } catch (err: any) {
      console.error('Error al cargar incidencias del estudiante:', err);
      setError(err.message || 'No fue posible cargar tus incidencias.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    cargarIncidencias(false);
  }, [cargarIncidencias]);

  // Filtrado por categoría
  const incidenciasFiltradas = useMemo(() => {
    if (filtroCategoria === 'Todas') return incidencias;
    return incidencias.filter((item) => item.categoria === filtroCategoria);
  }, [incidencias, filtroCategoria]);

  // Contadores por categoría
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      Todas: incidencias.length,
      Conducta: 0,
      Académico: 0,
      Salud: 0,
      Otro: 0,
    };
    incidencias.forEach((item) => {
      if (c[item.categoria] !== undefined) {
        c[item.categoria]++;
      } else {
        c['Otro']++;
      }
    });
    return c;
  }, [incidencias]);

  return (
    <div className="px-4 sm:px-5 pt-4 pb-28 space-y-5 animate-in fade-in duration-200">
      
      {/* 1. CABECERA DE IDENTIFICACIÓN DEL ESTUDIANTE */}
      <section className="space-y-3" data-purpose="student-header">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">
              {[estudianteContext?.grado, estudianteContext?.seccion ? `Sec. ${estudianteContext.seccion}` : null, estudianteContext?.centro].filter(Boolean).join(' • ') || 'Portal del Estudiante'}
            </span>
            <h1 className="text-lg sm:text-xl font-black text-stone-900 leading-tight">
              {[estudianteContext?.nombre, estudianteContext?.apellido].filter(Boolean).join(' ') || 'Mi Registro'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {selectedAsignatura && (
              <div className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 bg-stone-50 shadow-2xs">
                <span className="text-xs">{activeOficial?.icono || '📖'}</span>
                <span className="text-xs font-bold text-stone-800 truncate max-w-30">{selectedAsignatura}</span>
              </div>
            )}
            
            <button
              onClick={() => cargarIncidencias(true)}
              disabled={loading || refreshing}
              title="Actualizar incidencias"
              className="w-8 h-8 rounded-full border border-stone-200 bg-stone-50 hover:bg-stone-100 active:scale-95 flex items-center justify-center text-stone-600 transition"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-stone-900' : ''} />
            </button>
          </div>
        </div>

        {/* Banner descriptivo */}
        <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-stone-900 font-mono flex items-center gap-1.5">
              <span>Bitácora de Incidencias</span>
            </h2>
            <p className="text-[11px] text-stone-500">
              Seguimiento pedagógico y formativo registrado por tus docentes.
            </p>
          </div>
          <div className="px-2.5 py-1 rounded-full border border-stone-300 bg-white text-[11px] font-black font-mono text-stone-800 shrink-0">
            {incidencias.length} {incidencias.length === 1 ? 'registro' : 'registros'}
          </div>
        </div>
      </section>

      {/* 2. FILTROS POR CATEGORÍA TIPO PÍLDORAS */}
      {incidencias.length > 0 && (
        <section className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
          {(['Todas', 'Conducta', 'Académico', 'Salud', 'Otro'] as CategoriaFiltro[]).map((cat) => {
            const isSelected = filtroCategoria === cat;
            const count = counts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0
                  ${isSelected 
                    ? 'bg-[#1E1E24] text-white shadow-xs scale-[1.02]' 
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'}
                `}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </section>
      )}

      {/* 3. ESTADOS: CARGA, ERROR, LISTA VACÍA Y CONTENIDO */}
      {loading && incidencias.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="animate-spin text-stone-900 mx-auto" size={28} />
          <p className="text-xs font-bold text-stone-600">Cargando tus incidencias...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="text-rose-600 mx-auto" size={32} />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-rose-900">No se pudieron cargar las incidencias</h3>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
          <button
            onClick={() => cargarIncidencias(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Reintentar
          </button>
        </div>
      ) : incidencias.length === 0 ? (
        /* ESTADO VACÍO CUANDO NO HAY INCIDENCIAS REGISTRADAS */
        <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center space-y-4 shadow-xs max-w-md mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <ShieldCheck size={32} strokeWidth={2} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-stone-900">
              No tienes incidencias registradas
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
              Tu historial de convivencia y seguimiento formativo se encuentra al día y sin registros pendientes.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-full">
              <CheckCircle2 size={13} />
              <span>Expediente al día</span>
            </span>
          </div>
        </div>
      ) : incidenciasFiltradas.length === 0 ? (
        /* ESTADO CUANDO EL FILTRO NO COINCIDE */
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center space-y-2">
          <p className="text-xs font-bold text-stone-700">
            No tienes incidencias registradas en la categoría «{filtroCategoria}».
          </p>
          <button
            onClick={() => setFiltroCategoria('Todas')}
            className="text-xs text-[#1E1E24] font-bold underline"
          >
            Ver todas las incidencias
          </button>
        </div>
      ) : (
        /* 4. LISTA DE TARJETAS DE INCIDENCIAS */
        <section className="space-y-3.5" data-purpose="incidencias-list">
          {incidenciasFiltradas.map((inc) => {
            const catConfig = CATEGORIAS_CONFIG[inc.categoria] || CATEGORIAS_CONFIG.Otro;
            const Icon = catConfig.icon;
            const gravConfig = inc.gravedad ? GRAVEDAD_CONFIG[inc.gravedad.toLowerCase()] : null;

            return (
              <article
                key={inc.id}
                className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-3 transition-all"
              >
                {/* Cabecera de la tarjeta: Categoría, Fecha y Gravedad */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${catConfig.iconBg}`}>
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <div className="space-y-0.5">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${catConfig.badgeBg}`}>
                        {inc.categoria.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 font-mono">
                      <Calendar size={12} className="text-stone-400" />
                      <span>{formatearFechaLegible(inc.fecha)}</span>
                    </div>
                    {gravConfig && (
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${gravConfig.className}`}>
                        {gravConfig.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Motivo / Descripción */}
                <div className="pt-0.5">
                  <p className="text-xs sm:text-[13px] font-medium text-stone-800 leading-relaxed">
                    {inc.descripcion}
                  </p>
                </div>

                {/* Medidas tomadas (acciones_tomadas) */}
                {Array.isArray(inc.acciones_tomadas) && inc.acciones_tomadas.length > 0 && (
                  <div className="pt-1 border-t border-stone-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Tag size={11} className="text-stone-400" />
                      <span>Medidas formativas tomadas</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inc.acciones_tomadas.map((accion, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.8 bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-bold rounded-full"
                        >
                          {accion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acuerdos o compromisos */}
                {inc.acuerdos && inc.acuerdos.trim() && (
                  <div className="bg-stone-50 border border-stone-200/90 rounded-xl p-2.5 text-xs text-stone-700 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 font-mono block">
                      Acuerdos y compromisos:
                    </span>
                    <p className="italic text-stone-800 text-[11.5px] leading-relaxed">
                      «{inc.acuerdos}»
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

    </div>
  );
}
