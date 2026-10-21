import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  SIETE_ASIGNATURAS_OFICIALES, 
  getMensajeDocenteNoUsaCielo, 
  sonMismaAsignatura,
  type AsignaturaOficial 
} from '../../constants/asignaturas';
import type { AsignaturaPublicada, EstudianteContextInfo, Periodo } from './portalContext';
import { getIlustracionAsignatura } from './PortalCardIllustrations';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  School, 
  AlertTriangle 
} from 'lucide-react';

interface PortalAsignaturasSelectorProps {
  sessionToken?: string | null;
  selectedPeriodo?: Periodo;
  estudianteContext: EstudianteContextInfo | null;
  asignaturas: AsignaturaPublicada[];
  onSelectAsignatura: (nombreAsignatura: string) => void;
}

interface AsignaturaStats {
  fichasPendientes: number;
  alertas: number;
  exp: number | null;
  racha: number;
}

interface PortalFichaItem {
  id: string;
  asignatura?: string | null;
}

interface PortalEvidenciaItem {
  id?: string;
  puntaje?: number | null;
}

interface PortalIncidenciaItem {
  id?: string;
}

/**
 * Insignia de racha coleccionable:
 * Muestra la imagen /llamas-de-fuego.png a la izquierda y el número de racha a la derecha,
 * perfectamente alineados verticalmente.
 */
const StreakBadge: React.FC<{ racha: number }> = ({ racha }) => {
  const isLit = racha > 0;
  return (
    <div 
      className="inline-flex items-center gap-1.5 select-none shrink-0" 
      title={isLit ? `Racha de ${racha} ${racha === 1 ? 'día' : 'días'}` : 'Racha'}
    >
      <img 
        src="/llamas-de-fuego.png" 
        alt="Racha" 
        className="w-5.5 h-5.5 sm:w-6 sm:h-6 object-contain shrink-0 drop-shadow-2xs" 
      />
      <span className="text-sm sm:text-base font-black font-mono text-[#1E1E24] leading-none">
        {racha}
      </span>
    </div>
  );
};

export const PortalAsignaturasSelector: React.FC<PortalAsignaturasSelectorProps> = ({
  sessionToken,
  selectedPeriodo = 'P1',
  estudianteContext,
  asignaturas,
  onSelectAsignatura,
}) => {
  const [unassignedAsignatura, setUnassignedAsignatura] = useState<AsignaturaOficial | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, AsignaturaStats>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  
  const carouselRef = useRef<HTMLDivElement>(null);

  // Mapear cada una de las 7 asignaturas con su estado en la base de datos
  const items = useMemo(() => {
    return SIETE_ASIGNATURAS_OFICIALES.map((oficial) => {
      const pub = asignaturas.find((a) => sonMismaAsignatura(a.asignatura, oficial.nombre));
      const tieneDocente = pub ? (pub.tiene_docente ?? true) : false;
      const totalActividades = pub?.total_actividades ?? 0;

      return {
        ...oficial,
        tieneDocente,
        totalActividades,
      };
    });
  }, [asignaturas]);

  // Cargar estadísticas reales de Supabase (Fichas pendientes, Alertas académicas, EXP)
  useEffect(() => {
    if (!sessionToken) return;

    let isMounted = true;

    const loadRealData = async () => {
      try {
        // 1. Obtener fichas compartidas reales
        const { data: fichasData } = await supabase.rpc('portal_get_fichas_compartidas', {
          p_session_token: sessionToken,
        });
        const fichas: PortalFichaItem[] = Array.isArray(fichasData) ? (fichasData as PortalFichaItem[]) : [];

        // 2. Para cada asignatura con docente, consultar evidencias (para EXP) e incidencias (para Alertas)
        const newStats: Record<string, AsignaturaStats> = {};

        for (const item of items) {
          if (!item.tieneDocente) {
            newStats[item.nombre] = {
              fichasPendientes: 0,
              alertas: 0,
              exp: null,
              racha: 0,
            };
            continue;
          }

          // Filtrar fichas correspondientes
          const fichasDeMateria = fichas.filter((f) => 
            !f.asignatura || sonMismaAsignatura(f.asignatura, item.nombre)
          );

          // Consultar evidencias e incidencias autorizadas
          try {
            const [evidenciasRes, incidenciasRes] = await Promise.allSettled([
              supabase.rpc('portal_get_evidencias', {
                p_session_token: sessionToken,
                p_periodo: selectedPeriodo,
                p_asignatura: item.nombre,
              }),
              supabase.rpc('portal_get_incidencias', {
                p_session_token: sessionToken,
                p_periodo: selectedPeriodo,
                p_asignatura: item.nombre,
              }),
            ]);

            let evList: PortalEvidenciaItem[] = [];
            if (evidenciasRes.status === 'fulfilled' && Array.isArray(evidenciasRes.value.data)) {
              evList = evidenciasRes.value.data as PortalEvidenciaItem[];
            }

            let incList: PortalIncidenciaItem[] = [];
            if (incidenciasRes.status === 'fulfilled' && Array.isArray(incidenciasRes.value.data)) {
              incList = incidenciasRes.value.data as PortalIncidenciaItem[];
            }

            // Calcular EXP (promedio de puntajes de actividades evaluadas)
            const evaluadas = evList.filter((e): e is PortalEvidenciaItem & { puntaje: number } => typeof e.puntaje === 'number');
            const expCalculado = evaluadas.length > 0 
              ? Math.round(evaluadas.reduce((acc, e) => acc + e.puntaje, 0) / evaluadas.length)
              : (item.totalActividades > 0 ? 0 : null);

            // Alertas (filtrar solo las que no son meros registros neutros)
            const alertasRelevantes = incList.length;

            newStats[item.nombre] = {
              fichasPendientes: fichasDeMateria.length,
              alertas: alertasRelevantes,
              exp: expCalculado,
              racha: 0, // Racha base real mientras no haya columna de streak en la BD
            };
          } catch {
            newStats[item.nombre] = {
              fichasPendientes: fichasDeMateria.length,
              alertas: 0,
              exp: null,
              racha: 0,
            };
          }
        }

        if (isMounted) {
          setStatsMap(newStats);
        }
      } catch (err) {
        console.error('Error al cargar estadísticas de cartas:', err);
      }
    };

    loadRealData();

    return () => {
      isMounted = false;
    };
  }, [sessionToken, selectedPeriodo, items]);

  // Manejador del carrusel: desplazamiento con botones
  const scrollToCard = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    setActiveIndex(clamped);

    const container = carouselRef.current;
    const cardWidth = container.offsetWidth > 400 ? 291 : 276;
    container.scrollTo({
      left: clamped * cardWidth,
      behavior: 'smooth',
    });
  }, [items.length]);

  // Actualizar índice activo al hacer scroll
  const handleScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.offsetWidth > 400 ? 291 : 276;
    const current = Math.round(container.scrollLeft / cardWidth);
    if (current !== activeIndex) {
      setActiveIndex(Math.max(0, Math.min(items.length - 1, current)));
    }
  };

  // Manejo de teclado (flechas izquierda / derecha)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollToCard(activeIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollToCard(activeIndex + 1);
    }
  };

  // Pantalla de estado cuando el profesor aún no usa CIELO
  if (unassignedAsignatura) {
    const mensaje = getMensajeDocenteNoUsaCielo(unassignedAsignatura.nombre);

    return (
      <div className="px-5 py-6 flex flex-col min-h-[75vh] justify-between animate-in fade-in duration-200">
        <div>
          {/* Botón superior Volver */}
          <button
            onClick={() => setUnassignedAsignatura(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-full transition-all mb-6"
          >
            <ArrowLeft size={14} />
            <span>Mis asignaturas</span>
          </button>

          {/* Tarjeta de estado sobria y clara con la carta ilustrada como pieza visual */}
          <div className="bg-white border-2 border-[#1E1E24] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-md max-w-sm mx-auto">
            <div className="w-28 h-28 mx-auto rounded-2xl border-2 border-[#1E1E24] overflow-hidden shadow-sm">
              {getIlustracionAsignatura(unassignedAsignatura.nombre, "w-full h-full object-cover")}
            </div>

            <div className="space-y-2">
              <span className="inline-block text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-stone-300 bg-stone-100 text-stone-700">
                {unassignedAsignatura.nombre}
              </span>

              <h2 className="text-base sm:text-lg font-black text-stone-900 leading-snug px-2">
                «{mensaje}»
              </h2>

              <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto pt-1">
                Tan pronto como tu docente comience a registrar evaluaciones y actividades en la plataforma, podrás consultar aquí su progreso, calificaciones y portafolio.
              </p>
            </div>
          </div>
        </div>

        {/* Botón inferior de retorno */}
        <div className="pt-6 pb-2 max-w-sm mx-auto w-full">
          <button
            onClick={() => setUnassignedAsignatura(null)}
            className="w-full py-3 px-4 rounded-2xl bg-[#1E1E24] hover:bg-black text-white font-black text-xs active:scale-98 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>Volver a mis asignaturas</span>
          </button>
        </div>
      </div>
    );
  }

  const nombreCompleto = [estudianteContext?.nombre, estudianteContext?.apellido]
    .filter(Boolean)
    .join(' ') || 'Estudiante';

  const detallesCurso = [
    estudianteContext?.grado ? `${estudianteContext.grado}` : null,
    estudianteContext?.seccion ? `Sección ${estudianteContext.seccion}` : null
  ].filter(Boolean).join(' • ');

  return (
    <div 
      className="px-4 sm:px-5 pt-4 pb-8 space-y-5 animate-in fade-in duration-200 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Cabecera de Bienvenida */}
      <section className="space-y-2.5">
        <div className="border-2 border-[#1E1E24] rounded-3xl p-4.5 sm:p-5 bg-linear-to-br from-[#FAF8F5] via-[#FFFDF9] to-[#F5EFE6] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#1E1E24] tracking-tight">
                {nombreCompleto}
              </h1>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#1E1E24] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-stone-700">
              {nombreCompleto.charAt(0).toUpperCase()}
            </div>
          </div>

          {(detallesCurso || estudianteContext?.centro) && (
            <div className="mt-3 pt-2.5 border-t border-[#1E1E24]/10 flex flex-wrap items-center gap-2 text-[11px] text-stone-700 font-medium">
              {detallesCurso && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-stone-300 font-bold text-stone-800 shadow-2xs">
                  <GraduationCap size={13} className="text-stone-700" />
                  {detallesCurso}
                </span>
              )}
              {estudianteContext?.centro && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-stone-300 text-stone-700 shadow-2xs">
                  <School size={13} className="text-stone-600" />
                  <span className="truncate max-w-44">{estudianteContext.centro}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Título de la sección de Asignaturas con Controles del Carrusel */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#1E1E24] font-mono flex items-center gap-1.5">
              <span>Cartas de Asignaturas</span>
              <span className="text-[10px] text-stone-500 font-normal">({items.length})</span>
            </h2>
            <p className="text-[11px] text-stone-500">
              Desliza para elegir una materia
            </p>
          </div>

          {/* Botones de navegación del carrusel */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollToCard(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Carta anterior"
              className="w-7 h-7 rounded-full border border-[#1E1E24] bg-white flex items-center justify-center text-[#1E1E24] hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollToCard(activeIndex + 1)}
              disabled={activeIndex === items.length - 1}
              aria-label="Carta siguiente"
              className="w-7 h-7 rounded-full border border-[#1E1E24] bg-white flex items-center justify-center text-[#1E1E24] hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* CARRUSEL HORIZONTAL DE CARTAS COLECCIONABLES */}
      <section 
        className="relative -mx-4 sm:-mx-5 px-4 sm:px-5" 
        data-purpose="collectible-cards-carousel"
      >
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto custom-scrollbar snap-x snap-mandatory pt-2 pb-5 px-1 scroll-smooth"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {items.map((item, index) => {
            const stats = statsMap[item.nombre] || {
              fichasPendientes: 0,
              alertas: 0,
              exp: null,
              racha: 0,
            };

            const isCurrent = activeIndex === index;
            const tieneAlertas = stats.alertas > 0;

            return (
              <article
                key={item.id}
                onClick={() => {
                  if (item.tieneDocente) {
                    onSelectAsignatura(item.nombre);
                  } else {
                    setUnassignedAsignatura(item);
                  }
                }}
                className={`
                  relative shrink-0 select-none cursor-pointer snap-start
                  w-65 sm:w-68.75 h-93.75 sm:h-98.75
                  rounded-[22px] border-[2.5px] border-[#1E1E24]
                  bg-white
                  shadow-[0_12px_28px_-6px_rgba(27,31,42,0.18),0_4px_10px_-2px_rgba(27,31,42,0.08)]
                  p-3 flex flex-col justify-between
                  transition-all duration-300 active:scale-[0.98]
                  hover:-translate-y-1 hover:shadow-[0_16px_32px_-4px_rgba(27,31,42,0.25)]
                  ${isCurrent ? 'ring-2 ring-[#1E1E24]/20' : 'opacity-95'}
                `}
                role="button"
                tabIndex={0}
                aria-label={`Carta de ${item.nombre}`}
              >
                {/* Segundo contorno interior sutil: efecto de marco de carta coleccionable */}
                <div className="absolute inset-1.5 rounded-[17px] border border-[#1E1E24]/15 pointer-events-none" />

                {/* 1. SECCIÓN SUPERIOR: RACHA Y ASIGNATURA */}
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center justify-between min-h-6.5">
                    <StreakBadge racha={stats.racha} />
                  </div>

                  {/* Nombre de la asignatura */}
                  <div className="pt-0.5 px-0.5">
                    <h3 
                      className={`
                        font-black text-[#1E1E24] tracking-tight uppercase leading-snug line-clamp-2
                        ${item.nombre.length > 22 ? 'text-xs sm:text-[13px]' : 'text-sm sm:text-base'}
                      `}
                      title={item.nombre}
                    >
                      {item.nombre}
                    </h3>
                  </div>
                </div>

                {/* 2. ILUSTRACIÓN CENTRAL: Gran marco ilustrado con contorno oscuro */}
                <div className="relative z-10 my-1 flex-1 min-h-35 max-h-41.25 rounded-xl border-2 border-[#1E1E24] overflow-hidden bg-[#0A0D14] shadow-inner group-hover:brightness-105 transition-all">
                  {getIlustracionAsignatura(item.nombre)}
                </div>

                {/* 3. TRES TARJETAS INDIVIDUALES DE ESTADÍSTICAS (Directas en la carta, sin contenedor exterior) */}
                <div className="relative z-10 pt-1">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {/* Estadística 1: Fichas Pendientes */}
                    <div className="relative bg-white rounded-xl border border-[#1E1E24]/20 p-2 sm:p-2.5 h-15.5 sm:h-16.5 flex flex-col justify-between overflow-hidden shadow-2xs group/stat">
                      <span className="text-[7px] sm:text-[7.5px] font-black tracking-tight uppercase font-mono text-stone-500 leading-[1.1] block pr-1">
                        Fichas pendientes
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono leading-none text-[#1E1E24]">
                        {stats.fichasPendientes}
                      </span>
                      <img 
                        src="/pergamino.png" 
                        alt="Fichas pendientes" 
                        className="absolute bottom-1 right-1 w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain drop-shadow-xs pointer-events-none transition-transform group-hover/stat:scale-110" 
                      />
                    </div>

                    {/* Estadística 2: Alertas */}
                    <div className={`
                      relative rounded-xl border p-2 sm:p-2.5 h-15.5 sm:h-16.5 flex flex-col justify-between overflow-hidden shadow-2xs group/stat transition-colors
                      ${tieneAlertas 
                        ? 'bg-rose-50/70 border-rose-300' 
                        : 'bg-white border-[#1E1E24]/20'
                      }
                    `}>
                      <span className={`text-[7px] sm:text-[7.5px] font-black tracking-tight uppercase font-mono leading-[1.1] block pr-1 ${tieneAlertas ? 'text-rose-600' : 'text-stone-500'}`}>
                        Alertas
                      </span>
                      <span className={`text-base sm:text-lg font-black font-mono leading-none ${tieneAlertas ? 'text-rose-700' : 'text-[#1E1E24]'}`}>
                        {stats.alertas}
                      </span>
                      <div className={`
                        absolute bottom-1 right-1 w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center shadow-xs transition-transform group-hover/stat:scale-110
                        ${tieneAlertas 
                          ? 'bg-rose-100 border-rose-300 text-rose-600' 
                          : 'bg-stone-100 border-[#1E1E24]/15 text-stone-400'
                        }
                      `}>
                        <AlertTriangle 
                          size={14} 
                          strokeWidth={2.4} 
                          className={tieneAlertas ? 'text-rose-600 animate-pulse' : 'text-stone-500'} 
                        />
                      </div>
                    </div>

                    {/* Estadística 3: EXP */}
                    <div className="relative bg-white rounded-xl border border-[#1E1E24]/20 p-2 sm:p-2.5 h-15.5 sm:h-16.5 flex flex-col justify-between overflow-hidden shadow-2xs group/stat">
                      <span className="text-[7px] sm:text-[7.5px] font-black tracking-wider uppercase font-mono text-stone-500 leading-[1.1] block pr-1">
                        EXP
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono leading-none text-[#1E1E24]">
                        {stats.exp !== null ? `${stats.exp}` : '--'}
                      </span>
                      <img 
                        src="/botella.png" 
                        alt="EXP" 
                        className="absolute bottom-1 right-1 w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain drop-shadow-xs pointer-events-none transition-transform group-hover/stat:scale-110" 
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Indicadores de puntos (Dots) del carrusel */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToCard(i)}
              aria-label={`Ir a carta ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                activeIndex === i 
                  ? 'w-6 bg-[#1E1E24]' 
                  : 'w-2 bg-stone-300 hover:bg-stone-400'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Pie de pantalla sobrio */}
      <footer className="pt-2 text-center">
        <p className="text-[11px] text-stone-500 font-medium font-mono">
          Sistema de Evaluación por Competencias CIELO • 7 Asignaturas Curriculares
        </p>
      </footer>
    </div>
  );
};
