import { useState } from 'react';
import { X, UserPlus, Copy, Check, Globe, Users, Link2 } from 'lucide-react';
import type { PermisoClase, NotaCompartida } from '../../types/planClases';

interface CompartirModalProps {
  abierto: boolean;
  onCerrar: () => void;
  compartidaCon: NotaCompartida[];
  onAgregar: (destinatario: { correo: string; nombre?: string }, permiso: PermisoClase) => void;
  onQuitar: (id: string) => void;
}

const PERMISOS: { valor: PermisoClase; etiqueta: string }[] = [
  { valor: 'ver', etiqueta: 'Puede ver' },
  { valor: 'comentar', etiqueta: 'Puede comentar' },
  { valor: 'editar', etiqueta: 'Puede editar' },
];

const PERMISO_DETALLE: Record<PermisoClase, string> = {
  ver: 'Solo lectura',
  comentar: 'Puede ver y comentar',
  editar: 'Edición completa',
};

/**
 * Interfaz de compartir la Nota de clase (capa de CIELO).
 * Por ahora prioriza diseño y UX; el sistema de permisos real se
 * integrará en una etapa posterior sin rediseñar la pantalla.
 */
export function CompartirModal({
  abierto,
  onCerrar,
  compartidaCon,
  onAgregar,
  onQuitar,
}: CompartirModalProps) {
  const [correo, setCorreo] = useState('');
  const [permiso, setPermiso] = useState<PermisoClase>('comentar');
  const [copiado, setCopiado] = useState(false);
  const [mostrarEnlace, setMostrarEnlace] = useState(false);

  if (!abierto) return null;

  const agregar = () => {
    const c = correo.trim();
    if (!c) return;
    onAgregar({ correo: c }, permiso);
    setCorreo('');
  };

  const copiarEnlace = () => {
    try {
      navigator.clipboard?.writeText('https://cielo.app/nota/ejemplo');
    } catch {
      /* ignore */
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center sm:items-center p-4"
      style={{ background: 'rgba(23, 26, 24, 0.4)', backdropFilter: 'blur(2px)' }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md bg-white rounded-[18px] shadow-2xl border border-(--border-soft) overflow-hidden animate-[scaleUp_0.18s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-(--border-soft)">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-(--olive-branch)/25 flex items-center justify-center text-(--herb-garden)">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-(--ink) leading-tight">Compartir nota</h3>
              <p className="text-[12px] text-(--ink-soft)">Invita a colaborar en esta nota de clase</p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-(--ink-soft) hover:bg-(--paper-soft) hover:text-(--ink)">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar-minimal">
          {/* Por correo / persona */}
          <div>
            <p className="notion-label mb-2 flex items-center gap-1.5">
              <UserPlus size={13} /> Agregar persona
            </p>
            <div className="flex gap-2">
              <input
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') agregar(); }}
                placeholder="nombre@correo.com"
                className="module-input flex-1"
              />
              <button
                onClick={agregar}
                disabled={!correo.trim()}
                className="px-4 rounded-xl bg-(--herb-garden) text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                Invitar
              </button>
            </div>

            {/* Selector de permisos */}
            <div className="mt-2.5 flex gap-1.5 p-1 bg-(--paper-soft)/60 rounded-xl">
              {PERMISOS.map(p => (
                <button
                  key={p.valor}
                  onClick={() => setPermiso(p.valor)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-bold transition-all
                    ${permiso === p.valor
                      ? 'bg-white shadow-sm text-(--ink)'
                      : 'text-(--ink-soft) hover:text-(--ink)'}`}
                >
                  {p.etiqueta}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-(--ink-soft)">
              {PERMISO_DETALLE[permiso]} · El invitado recibirá acceso a esta nota.
            </p>
          </div>

          {/* Personas con acceso */}
          {compartidaCon.length > 0 && (
            <div>
              <p className="notion-label mb-2">Personas con acceso ({compartidaCon.length})</p>
              <div className="space-y-1.5">
                {compartidaCon.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 rounded-xl border border-(--border-soft) px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-(--olive-branch)/25 flex items-center justify-center text-[11px] font-black text-(--herb-garden) uppercase">
                      {(p.nombre || p.correo || '?').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-(--ink) truncate">{p.correo}</p>
                      <p className="text-[11px] text-(--ink-soft)">{p.nombre || 'Invitado externo'}</p>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-(--olive-branch)/20 text-(--herb-garden)">
                      {PERMISOS.find(x => x.valor === p.permiso)?.etiqueta}
                    </span>
                    <button onClick={() => onQuitar(p.id)} className="p-1 rounded-md text-(--ink-soft) hover:text-(--terra-cotta)">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-1 border-t border-(--border-soft)">
            <button
              onClick={() => setMostrarEnlace(v => !v)}
              className="flex items-center gap-2 text-[13px] font-semibold text-(--herb-garden) hover:underline"
            >
              <Link2 size={15} /> Compartir por enlace
            </button>
            {mostrarEnlace && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-lg border border-(--border-soft) bg-(--paper-soft)/40 px-3 py-2">
                  <Globe size={14} className="text-(--ink-soft)" />
                  <span className="text-[12px] text-(--ink-soft) truncate">cielo.app/nota/ejemplo</span>
                </div>
                <button
                  onClick={copiarEnlace}
                  className="flex items-center gap-1.5 rounded-lg bg-(--french-blue)/10 px-3 py-2 text-[12px] font-bold text-(--french-blue) hover:bg-(--french-blue)/15"
                >
                  {copiado ? <Check size={14} /> : <Copy size={14} />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
