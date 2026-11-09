import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePortal } from './portalContext';
import { fetchWithPortalCache, getPortalCache } from '../../cache/portalCache';
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
    badgeBg: 'bg-[#EB8847]/15 border-[#EB8847]/40 text-[#8F4718]',
    badgeText: 'text-[#8F4718]',
    iconBg: 'bg-[#EB8847]/20 text-[#8F4718] border-[#EB8847]/40',
  },
  Académico: {
    icon: Bookmark,
    label: 'Académico',
    badgeBg: 'bg-[#537BAC]/15 border-[#537BAC]/40 text-[#2C4F7C]',
    badgeText: 'text-[#2C4F7C]',
    iconBg: 'bg-[#537BAC]/20 text-[#2C4F7C] border-[#537BAC]/40',
  },
  Salud: {
    icon: AlertCircle,
    label: 'Salud y Bienestar',
    badgeBg: 'bg-[#689C63]/15 border-[#689C63]/40 text-[#2E572A]',
    badgeText: 'text-[#2E572A]',
    iconBg: 'bg-[#689C63]/20 text-[#2E572A] border-[#689C63]/40',
  },
  Otro: {
    icon: FileText,
    label: 'Otro',
    badgeBg: 'bg-[#DEAE4D]/20 border-[#DEAE4D]/45 text-[#7A5612]',
    badgeText: 'text-[#7A5612]',
    iconBg: 'bg-[#DEAE4D]/25 text-[#7A5612] border-[#DEAE4D]/45',
  },
};

const GRAVEDAD_CONFIG: Record<string, { label: string; className: string }> = {
  leve: {
    label: 'Primera Vez',
    className: 'bg-[#BFC9A6]/25 text-[#4E5540] border-[#BFC9A6]',
  },
  moderada: {
    label: 'Recurrente',
    className: 'bg-[#DEAE4D]/20 text-[#8C6415] border-[#DEAE4D]/40',
  },
  grave: {
    label: 'Persistente',
    className: 'bg-[#DB5B48]/15 text-[#DB5B48] border-[#DB5B48]/35',
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

  const cargarIncidencias = useCallback(async (isRefresh = false) => {
    if (!sessionToken) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      const cached = getPortalCache<PortalIncidencia[]>(
        sessionToken,
        'estudiante_incidencias',
        'all'
      );
      if (Array.isArray(cached)) {
        setIncidencias(cached);
        setLoading(false);
        return;
      }
    }

    setError(null);
    try {
      const lista = await fetchWithPortalCache(
        sessionToken,
        'estudiante_incidencias',
        'all',
        async () => {
          const { data, error: rpcError } = await supabase.rpc('portal_get_estudiante_incidencias', {
            p_session_token: sessionToken,
          });
          if (rpcError) throw rpcError;
          if (data && data.error) throw new Error(data.error);
          return (Array.isArray(data) ? data : []) as PortalIncidencia[];
        },
        { forceRefresh: isRefresh }
      );

      setIncidencias(lista);
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
              <div className="hidden xs:flex items-center px-3.5 py-1.5 rounded-full border border-[#537BAC]/30 bg-[#537BAC]/12 shadow-2xs">
                <span className="text-xs font-bold text-[#1B1F2A] truncate max-w-30">{selectedAsignatura}</span>
              </div>
            )}

            <button
              onClick={() => cargarIncidencias(true)}
              disabled={loading || refreshing}
              title="Actualizar incidencias"
              className="w-8 h-8 rounded-full border border-[#BFC9A6]/60 bg-[#BFC9A6]/20 hover:bg-[#BFC9A6]/35 active:scale-95 flex items-center justify-center text-[#1B1F2A] transition"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#537BAC]' : ''} />
            </button>
          </div>
        </div>

        {/* Banner descriptivo */}
        <div className="bg-[#FCFCFA] border border-[#BFC9A6]/60 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-stone-900 font-mono flex items-center gap-1.5">
              <span>Bitácora de Incidencias</span>
            </h2>
            <p className="text-[11px] text-[#5F665E]">
              Seguimiento pedagógico y formativo registrado por tus docentes.
            </p>
          </div>
          <div className="px-2.5 py-1 rounded-full border border-[#537BAC]/30 bg-[#537BAC]/12 text-[11px] font-black font-mono text-[#2C4F7C] shrink-0">
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
                    ? 'bg-[#537BAC] text-white shadow-xs scale-[1.02]'
                    : 'bg-[#BFC9A6]/20 border border-[#BFC9A6]/55 text-[#1B1F2A] hover:bg-[#BFC9A6]/35'}
                `}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-white/25 text-white' : 'bg-[#FCFCFA] text-[#4E5540]'}`}>
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
        <div className="bg-[#DB5B48]/12 border border-[#DB5B48]/35 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="text-[#DB5B48] mx-auto" size={32} />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-[#1B1F2A]">No se pudieron cargar las incidencias</h3>
            <p className="text-xs text-[#9E3525]">{error}</p>
          </div>
          <button
            onClick={() => cargarIncidencias(true)}
            className="px-4 py-2 bg-[#DB5B48] hover:bg-[#c74e3c] text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Reintentar
          </button>
        </div>
      ) : incidencias.length === 0 ? (
        /* ESTADO VACÍO CUANDO NO HAY INCIDENCIAS REGISTRADAS */
        <div className="bg-[#FCFCFA] border border-[#BFC9A6]/70 rounded-2xl p-7 sm:p-8 text-center space-y-4 max-w-md mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-[#BFC9A6]/25 border border-[#BFC9A6]/75 text-[#689C63] mx-auto flex items-center justify-center">
            <ShieldCheck size={28} strokeWidth={1.85} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-[#2E3330] tracking-tight">
              No tienes incidencias registradas
            </h3>
            <p className="text-xs text-[#5F665E] leading-relaxed max-w-xs mx-auto">
              Tu historial de convivencia y seguimiento formativo se encuentra al día y sin registros pendientes.
            </p>
          </div>
          <div className="pt-1.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#BFC9A6]/25 text-[#689C63] border border-[#BFC9A6]/80 text-[11px] font-semibold rounded-full">
              <CheckCircle2 size={13} className="text-[#689C63] shrink-0" />
              <span>Expediente al día</span>
            </span>
          </div>
        </div>
      ) : incidenciasFiltradas.length === 0 ? (
        /* ESTADO CUANDO EL FILTRO NO COINCIDE */
        <div className="bg-[#FCFCFA] border border-[#BFC9A6]/60 rounded-2xl p-6 text-center space-y-2">
          <p className="text-xs font-bold text-[#2E3330]">
            No tienes incidencias registradas en la categoría «{filtroCategoria}».
          </p>
          <button
            onClick={() => setFiltroCategoria('Todas')}
            className="px-3.5 py-1.5 rounded-full bg-[#537BAC]/15 border border-[#537BAC]/35 text-xs text-[#2C4F7C] font-bold hover:bg-[#537BAC]/25 transition"
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
                className="bg-[#FCFCFA] border border-[#BFC9A6]/55 hover:border-[#537BAC]/40 rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-3 transition-all"
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
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#5F665E] font-mono">
                      <Calendar size={12} className="text-[#537BAC]" />
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
                  <p className="text-xs sm:text-[13px] font-medium text-[#1B1F2A] leading-relaxed">
                    {inc.descripcion}
                  </p>
                </div>

                {/* Medidas tomadas (acciones_tomadas) */}
                {Array.isArray(inc.acciones_tomadas) && inc.acciones_tomadas.length > 0 && (
                  <div className="pt-2 border-t border-[#BFC9A6]/40 space-y-1.5">
                    <span className="text-[10px] font-bold text-[#5F665E] uppercase tracking-wider font-mono flex items-center gap-1">
                      <Tag size={11} className="text-[#689C63]" />
                      <span>Medidas formativas tomadas</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inc.acciones_tomadas.map((accion, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 bg-[#BFC9A6]/25 border border-[#BFC9A6]/60 text-[#2E3330] text-[10px] font-bold rounded-full"
                        >
                          {accion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acuerdos o compromisos */}
                {inc.acuerdos && inc.acuerdos.trim() && (
                  <div className="bg-[#537BAC]/10 border border-[#537BAC]/25 rounded-xl p-2.5 text-xs text-[#1B1F2A] space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#2C4F7C] font-mono block">
                      Acuerdos y compromisos:
                    </span>
                    <p className="italic text-[#1B1F2A] text-[11.5px] leading-relaxed">
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
