import { useEffect, useRef, useState } from 'react';
import { X, Send, CornerDownRight, CheckCircle2, Circle, MessageSquareText, Reply } from 'lucide-react';
import type { NotaComentario } from '../../types/planClases';

interface ComentariosPanelProps {
  abierto: boolean;
  onCerrar: () => void;
  comentarios: NotaComentario[];
  onAgregar: (texto: string, bloqueId?: string) => void;
  onResponder: (comentarioId: string, texto: string) => void;
  onResolver: (comentarioId: string) => void;
  userName: string;
  userAvatarColor?: string;
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const dia =
    d.toDateString() === hoy.toDateString()
      ? 'Hoy'
      : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

function Avatar({ nombre, color }: { nombre: string; color?: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black uppercase text-white shrink-0"
      style={{ background: color || '#689C63' }}
    >
      {(nombre || '?').slice(0, 2)}
    </div>
  );
}

/**
 * Panel lateral de comentarios de la Nota de clase (capa de CIELO).
 * El panel se asocia conceptualmente al contenido (y en el futuro a un
 * bloque concreto vía `bloqueId`), sin acoplarse al JSON de Editor.js.
 */
export function ComentariosPanel({
  abierto,
  onCerrar,
  comentarios,
  onAgregar,
  onResponder,
  onResolver,
  userName,
  userAvatarColor,
}: ComentariosPanelProps) {
  const [texto, setTexto] = useState('');
  const [respondiendoA, setRespondiendoA] = useState<string | null>(null);
  const [textoRespuesta, setTextoRespuesta] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [abierto, comentarios.length]);

  if (!abierto) return null;

  const enviar = () => {
    const t = texto.trim();
    if (!t) return;
    onAgregar(t);
    setTexto('');
  };

  const enviarRespuesta = (comentarioId: string) => {
    const t = textoRespuesta.trim();
    if (!t) return;
    onResponder(comentarioId, t);
    setRespondiendoA(null);
    setTextoRespuesta('');
  };

  return (
    <div className="fixed inset-0 z-[130]" onClick={onCerrar}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(23,26,24,0.18)' }} />

      {/* Panel lateral derecho */}
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-[400px] bg-white border-l border-(--border-soft) shadow-2xl flex flex-col animate-[slideInR_0.22s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes slideInR{from{transform:translateX(24px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-soft)">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-(--french-blue)/12 flex items-center justify-center text-(--french-blue)">
              <MessageSquareText size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-(--ink) leading-tight">Comentarios</h3>
              <p className="text-[12px] text-(--ink-soft)">
                {comentarios.filter(c => !c.resuelto).length} abiertos · {comentarios.length} en total
              </p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-(--ink-soft) hover:bg-(--paper-soft) hover:text-(--ink)">
            <X size={18} />
          </button>
        </div>

        {/* Lista de comentarios */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar-minimal">
          {comentarios.length === 0 && (
            <div className="text-center py-14">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-(--paper-soft)/60 flex items-center justify-center text-(--ink-soft)">
                <MessageSquareText size={20} />
              </div>
              <p className="text-sm font-semibold text-(--ink)">Sin comentarios todavía</p>
              <p className="text-[13px] text-(--ink-soft) mt-1">
                Inicia la conversación y comparte tu retroalimentación de la clase.
              </p>
            </div>
          )}

          {comentarios.map(c => (
            <div
              key={c.id}
              className={`rounded-2xl border p-3.5 transition-colors
                ${c.resuelto ? 'bg-(--paper-soft)/25 border-(--border-soft) opacity-75' : 'bg-white border-(--border-soft)'}`}
            >
              <div className="flex items-start gap-2.5">
                <Avatar nombre={c.autorNombre} color={c.autorAvatarColor} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-bold text-(--ink)">{c.autorNombre}</span>
                    {c.esAutor && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-(--herb-garden) bg-(--olive-branch)/20 px-1.5 py-0.5 rounded-full">
                        Docente
                      </span>
                    )}
                    <span className="text-[11px] text-(--ink-soft)">{formatFecha(c.creadoEn)}</span>
                  </div>
                  <p className={`text-[13.5px] mt-1 leading-relaxed ${c.resuelto ? 'line-through text-(--ink-soft)' : 'text-(--ink)'}`}>
                    {c.texto}
                  </p>

                  {/* Respuestas */}
                  {c.respuestas.length > 0 && (
                    <div className="mt-2.5 space-y-2 border-l-2 border-(--olive-branch) pl-3">
                      {c.respuestas.map(r => (
                        <div key={r.id} className="flex items-start gap-2">
                          <Avatar nombre={r.autorNombre} color={r.autorAvatarColor} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] font-bold text-(--ink)">{r.autorNombre}</span>
                              <span className="text-[11px] text-(--ink-soft)">{formatFecha(r.creadoEn)}</span>
                            </div>
                            <p className="text-[13px] text-(--ink) leading-relaxed">{r.texto}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => setRespondiendoA(respondiendoA === c.id ? null : c.id)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-(--ink-soft) hover:text-(--herb-garden) px-1.5 py-1 rounded-md hover:bg-(--olive-branch)/10"
                    >
                      <Reply size={13} /> Responder
                    </button>
                    <button
                      onClick={() => onResolver(c.id)}
                      className={`inline-flex items-center gap-1 text-[12px] font-semibold px-1.5 py-1 rounded-md
                        ${c.resuelto
                          ? 'text-(--herb-garden) hover:bg-(--olive-branch)/10'
                          : 'text-(--ink-soft) hover:text-(--herb-garden) hover:bg-(--olive-branch)/10'}`}
                    >
                      {c.resuelto ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                      {c.resuelto ? 'Resuelto' : 'Resolver'}
                    </button>
                  </div>

                  {/* Formulario de respuesta */}
                  {respondiendoA === c.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        autoFocus
                        value={textoRespuesta}
                        onChange={e => setTextoRespuesta(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') enviarRespuesta(c.id); }}
                        placeholder="Responder…"
                        className="flex-1 module-input !h-9 text-[13px]"
                      />
                      <button
                        onClick={() => enviarRespuesta(c.id)}
                        disabled={!textoRespuesta.trim()}
                        className="p-2 rounded-lg bg-(--herb-garden) text-white disabled:opacity-40 transition-all active:scale-95"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Nuevo comentario */}
        <div className="px-5 py-4 border-t border-(--border-soft) bg-(--paper-soft)/30">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                placeholder="Agregar un comentario… (Enter para enviar)"
                rows={2}
                className="w-full resize-none rounded-xl border border-(--border-soft) bg-white px-3 py-2 text-[13.5px] text-(--ink) outline-none placeholder:text-(--ink-soft)/60 focus:border-(--herb-garden) focus:ring-2 focus:ring-(--olive-branch)/30"
              />
            </div>
            <button
              onClick={enviar}
              disabled={!texto.trim()}
              className="w-9 h-9 rounded-xl bg-(--herb-garden) text-white flex items-center justify-center disabled:opacity-40 transition-all active:scale-95 hover:bg-(#558650)"
            >
              <Send size={15} />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[11px] text-(--ink-soft) inline-flex items-center gap-1">
              <CornerDownRight size={11} /> Shift+Enter para salto de línea
            </span>
            <span className="text-[11px] text-(--ink-soft) inline-flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-full inline-block"
                style={{ background: userAvatarColor || '#689C63' }}
              />
              {userName}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
