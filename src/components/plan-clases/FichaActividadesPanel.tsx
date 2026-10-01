import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  ChevronDown,
  Link2,
  Link2Off,
  Loader2,
  PhoneCall,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';

/**
 * ACTIVIDADES DE LA FICHA.
 *
 * Una Ficha es una fila de `public.pc_notas`. La Actividad es una fila de
 * `public.actividades`, y el vinculo entre las dos ya existia antes de este
 * panel: es `actividades.plan_ficha_id -> pc_notas(id)`, la misma columna que
 * escribe `WorkspaceFicha` desde Curso Detalle. Aqui no se crea ninguna tabla
 * ni ninguna relacion nueva, solo se ve y se gestiona ese vinculo desde el
 * otro lado: dentro de la propia ficha.
 *
 * La marca "Solicitar subir producto" es `actividades.requiere_producto`, una
 * columna mas de la tabla que ya existe. Al activarla NO se crea ninguna fila
 * en `evidencias`: la entrega la hace el estudiante desde el Portal, y esa fila
 * nace sola en `portal_crear_evidencia` con estudiante + ficha + actividad +
 * curso ya resueltos.
 */

interface ActividadVinculada {
  id: number;
  nombre: string | null;
  asignatura: string | null;
  periodo: string | null;
  fecha: string | null;
  indicador: string | null;
  producto: string | null;
  curso_id: number;
  requiere_producto: boolean;
  plan_ficha_id: string | null;
}

export interface FichaActividadesPanelProps {
  notaId: string;
}

export function FichaActividadesPanel({ notaId }: FichaActividadesPanelProps) {
  const sessionUserId = useAppStore((s) => s.session?.user?.id) ?? null;

  const [vinculadas, setVinculadas] = useState<ActividadVinculada[]>([]);
  const [disponibles, setDisponibles] = useState<ActividadVinculada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!notaId) return;
    setCargando(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('actividades')
        .select('id, nombre, asignatura, periodo, fecha, indicador, producto, curso_id, requiere_producto, plan_ficha_id')
        .eq('plan_ficha_id', notaId)
        .order('fecha', { ascending: false, nullsFirst: false });
      if (err) throw err;
      setVinculadas((data as ActividadVinculada[]) ?? []);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar las actividades de la ficha.');
    } finally {
      setCargando(false);
    }
  }, [notaId]);

  // Actividades del propio docente que aun no estan colgadas de ninguna ficha.
  const cargarDisponibles = useCallback(async () => {
    if (!sessionUserId) return;
    const { data } = await supabase
      .from('actividades')
      .select('id, nombre, asignatura, periodo, fecha, indicador, producto, curso_id, requiere_producto, plan_ficha_id')
      .is('plan_ficha_id', null)
      .order('fecha', { ascending: false, nullsFirst: false })
      .limit(60);
    setDisponibles(
      ((data as ActividadVinculada[]) ?? []).filter((a) => !vinculadas.some((v) => v.id === a.id)),
    );
  }, [sessionUserId, vinculadas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (abierto) cargarDisponibles();
  }, [abierto, cargarDisponibles]);

  // ── "Solicitar subir producto" ────────────────────────────────────────────
  const alternarProducto = async (actividad: ActividadVinculada) => {
    const siguiente = !actividad.requiere_producto;
    setOcupado(actividad.id);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('actividades')
        .update({ requiere_producto: siguiente })
        .eq('id', actividad.id);
      if (err) throw err;
      setVinculadas((prev) =>
        prev.map((a) => (a.id === actividad.id ? { ...a, requiere_producto: siguiente } : a)),
      );
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar la solicitud de producto.');
    } finally {
      setOcupado(null);
    }
  };

  // ── Vincular / desvincular: la MISMA columna que usa Curso Detalle ─────────
  const vincular = async (actividadId: number) => {
    if (!actividadId) return;
    setOcupado(actividadId);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('actividades')
        .update({ plan_ficha_id: notaId })
        .eq('id', actividadId);
      if (err) throw err;
      setSeleccion('');
      await cargar();
    } catch (e: any) {
      setError(e?.message || 'No se pudo vincular la actividad.');
    } finally {
      setOcupado(null);
    }
  };

  const desvincular = async (actividadId: number) => {
    setOcupado(actividadId);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('actividades')
        .update({ plan_ficha_id: null })
        .eq('id', actividadId);
      if (err) throw err;
      await cargar();
    } catch (e: any) {
      setError(e?.message || 'No se pudo desvincular la actividad.');
    } finally {
      setOcupado(null);
    }
  };

  const conSolicitud = useMemo(() => vinculadas.filter((a) => a.requiere_producto).length, [vinculadas]);

  return (
    <section className="mt-6 rounded-2xl border border-[#2E3330]/10 bg-white/60">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
        aria-expanded={abierto}
      >
        <span className="w-8 h-8 rounded-xl bg-[#689C63]/10 text-[#689C63] flex items-center justify-center shrink-0">
          <BellRing size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-bold text-[#2E3330]">Actividades de la ficha</span>
          <span className="block text-[12px] text-[#2E3330]/60">
            {cargando
              ? 'Cargando…'
              : vinculadas.length === 0
                ? 'Ninguna actividad vinculada todavía'
                : `${vinculadas.length} vinculada${vinculadas.length === 1 ? '' : 's'}${conSolicitud > 0 ? ` · ${conSolicitud} pide producto` : ''}`}
          </span>
        </span>
        {conSolicitud > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#689C63]/15 text-[#4a7a46] text-[11px] font-bold">
            {conSolicitud} producto{conSolicitud === 1 ? '' : 's'}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`text-[#2E3330]/40 transition-transform shrink-0 ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div className="px-4 pb-4">
          {error && (
            <p className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[12px] font-semibold text-red-600">
              {error}
            </p>
          )}

          {cargando ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-[#689C63]" />
            </div>
          ) : vinculadas.length === 0 ? (
            <p className="text-[13px] text-[#2E3330]/60 leading-relaxed py-2">
              Las actividades se vinculan desde <strong>Curso Detalle</strong> (la ventana “Ficha de clase”),
              usando la misma relación que se muestra aquí. También puedes colgar una actividad suelta
              desde este panel.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {vinculadas.map((actividad) => {
                const activo = ocupado === actividad.id;
                return (
                  <li
                    key={actividad.id}
                    className="rounded-2xl border border-[#2E3330]/10 bg-white px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#2E3330] truncate">
                          {actividad.nombre || 'Actividad'}
                        </p>
                        <p className="text-[11px] text-[#2E3330]/55 mt-0.5">
                          {[actividad.asignatura, actividad.periodo, actividad.fecha]
                            .filter(Boolean)
                            .join(' · ') || 'Sin materia asignada'}
                        </p>
                        {actividad.producto && (
                          <p className="text-[12px] text-[#2E3330]/70 mt-1.5 leading-relaxed">
                            <span className="font-bold">Producto esperado:</span> {actividad.producto}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => desvincular(actividad.id)}
                        disabled={activo}
                        title="Quitar esta actividad de la ficha"
                        aria-label={`Quitar ${actividad.nombre || 'la actividad'} de la ficha`}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[#2E3330]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2E3330]/60 hover:text-[#2E3330] hover:bg-[#2E3330]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {activo ? <Loader2 size={12} className="animate-spin" /> : <Link2Off size={12} />}
                        <span className="hidden sm:inline">Desvincular</span>
                      </button>
                    </div>

                    {/* ── Solicitar subir producto ── */}
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#2E3330]/5 pt-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          actividad.requiere_producto ? 'bg-[#689C63]/15 text-[#4a7a46]' : 'bg-[#2E3330]/5 text-[#2E3330]/40'
                        }`}>
                          {actividad.requiere_producto ? <Check size={14} /> : <PhoneCall size={14} />}
                        </span>
                        <span className="text-[12px] font-semibold text-[#2E3330]/75 leading-tight">
                          {actividad.requiere_producto
                            ? 'El estudiante ve “Entregar producto” dentro de esta ficha'
                            : 'Solicitar subir producto'}
                        </span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={actividad.requiere_producto}
                        aria-label={`Solicitar subir producto en ${actividad.nombre || 'la actividad'}`}
                        onClick={() => alternarProducto(actividad)}
                        disabled={activo}
                        className={`shrink-0 relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          actividad.requiere_producto ? 'bg-[#689C63]' : 'bg-[#2E3330]/15'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                            actividad.requiere_producto ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Vincular una actividad suelta, misma columna `plan_ficha_id`. */}
          {disponibles.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[#2E3330]/40 shrink-0"><Link2 size={14} /></span>
              <select
                value={seleccion}
                onChange={(e) => {
                  setSeleccion(e.target.value);
                  if (e.target.value) vincular(Number(e.target.value));
                }}
                disabled={Boolean(ocupado)}
                className="flex-1 rounded-xl border border-[#2E3330]/10 bg-white px-3 py-2 text-[12px] font-semibold text-[#2E3330] outline-none focus:border-[#689C63] disabled:opacity-50"
              >
                <option value="">Vincular una actividad existente…</option>
                {disponibles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre || 'Actividad'}{a.asignatura ? ` · ${a.asignatura}` : ''}
                  </option>
                ))}
              </select>
              {ocupado && <Loader2 size={14} className="animate-spin text-[#689C63] shrink-0" />}
            </div>
          )}

          <p className="mt-3 text-[11px] text-[#2E3330]/50 leading-relaxed">
            Activar la solicitud no crea ninguna entrega: la evidencia aparece en
            <span className="font-semibold"> Evidencias </span>
            únicamente cuando el estudiante la entrega desde el Portal.
          </p>
        </div>
      )}
    </section>
  );
}

export default FichaActividadesPanel;
