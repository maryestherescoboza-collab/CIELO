import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Share2,
  MessageSquareText,
  MoreHorizontal,
  Check,
  Loader2,
  Cloud,
  FileText,
} from 'lucide-react';

import type {
  NotaComentario,
  NotaCompartida,
  PermisoClase,
} from '../../types/planClases';
import { NotaEditor } from '../../components/plan-clases/NotaEditor';
import { InfoClase, type InfoClaseDatos } from '../../components/plan-clases/InfoClase';
import { CompartirModal } from '../../components/plan-clases/CompartirModal';
import { ComentariosPanel } from '../../components/plan-clases/ComentariosPanel';
import { usePlanClasesStore } from '../../store/planClasesStore';
import { uid } from '../../utils/uid';
import '../../components/plan-clases/cielo-editor.css';

type EstadoGuardado = 'sin-cambios' | 'guardando' | 'guardado';

interface NuevaNotaClaseProps {
  notaId: string;
  userName: string;
  userAvatarColor?: string;
  currentUser?: { id?: string; email?: string } | null;
  isEmbedded?: boolean;
  onClose: () => void;
}

export default function NuevaNotaClase({
  notaId,
  userName,
  userAvatarColor,
  currentUser,
  isEmbedded = false,
  onClose,
}: NuevaNotaClaseProps) {

  const { getNota, updateNotaContenido } = usePlanClasesStore();

  const [titulo, setTitulo] = useState('Cargando...');
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [infoClase, setInfoClase] = useState<InfoClaseDatos>({
    curso: 'N/A',
    fecha: 'N/A',
    duracion: '0 min',
  });
  
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>('guardado');
  const [compartirAbierto, setCompartirAbierto] = useState(false);
  const [comentariosAbierto, setComentariosAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [comentarios, setComentarios] = useState<NotaComentario[]>([]);
  const [compartidaCon, setCompartidaCon] = useState<NotaCompartida[]>([]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadTitulo() {
      if (notaId) {
        setLoadingInitial(true);
        const notaDB = await getNota(notaId);
        if (notaDB) {
          setTitulo(notaDB.titulo);
        }
        setLoadingInitial(false);
      }
    }
    loadTitulo();
  }, [notaId, getNota]);

  const marcarGuardado = useCallback((estado: EstadoGuardado) => {
    setEstadoGuardado(estado);
    if (estado === 'guardando') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setEstadoGuardado('guardado'), 900);
    }
  }, []);

  const handleTituloChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitulo(val);
    marcarGuardado('guardando');
    await updateNotaContenido(notaId, undefined, val);
  };

  const handleInfoClaseChange = (datos: InfoClaseDatos) => {
    setInfoClase(datos);
    // Podría guardarse en un campo metadata_json en el futuro.
  };

  // ── Comentarios y Compartir (capa de CIELO) ───────────
  const agregarComentario = useCallback((texto: string, bloqueId?: string) => {
    setComentarios(prev => [...prev, {
      id: uid('comentario'),
      texto,
      bloqueId,
      autorId: currentUser?.id || '',
      autorNombre: userName,
      autorAvatarColor: userAvatarColor,
      esAutor: true,
      creadoEn: new Date().toISOString(),
      resuelto: false,
      respuestas: []
    }]);
  }, [currentUser, userName, userAvatarColor]);

  const responderComentario = useCallback((comentarioId: string, texto: string) => {
    setComentarios(prev => prev.map(c => c.id === comentarioId ? {
      ...c,
      respuestas: [...c.respuestas, {
        id: uid('respuesta'),
        autorId: currentUser?.id || '',
        autorNombre: userName,
        autorAvatarColor: userAvatarColor,
        esAutor: true,
        texto,
        creadoEn: new Date().toISOString()
      }]
    } : c));
  }, [currentUser, userName, userAvatarColor]);

  const resolverComentario = useCallback((comentarioId: string) => {
    setComentarios(prev => prev.map(c => c.id === comentarioId ? { ...c, resuelto: !c.resuelto } : c));
  }, []);

  const agregarCompartida = useCallback((destinatario: { correo: string; nombre?: string }, permiso: PermisoClase) => {
    setCompartidaCon(prev => [...prev, {
      id: uid('compartida'),
      correo: destinatario.correo,
      nombre: destinatario.nombre,
      permiso,
      agregadaEn: new Date().toISOString()
    }]);
  }, []);

  const quitarCompartida = useCallback((id: string) => {
    setCompartidaCon(prev => prev.filter(c => c.id !== id));
  }, []);
  const totalComentariosAbiertos = useMemo(() => comentarios.filter(c => !c.resuelto).length, [comentarios]);

  if (loadingInitial) {
    return (
      <div className={`${isEmbedded ? 'h-full' : 'min-h-screen'} bg-white flex items-center justify-center`}>
        <Loader2 className="animate-spin text-[#689C63]" size={32} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isEmbedded ? 'h-full' : 'min-h-screen'} bg-white`}>
      <header className="sticky top-0 z-40 border-b border-[#2E3330]/10" style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(8px)' }}>
        <div className="mx-auto flex items-center gap-3 px-4 sm:px-6" style={{ maxWidth: 1160, minHeight: 52 }}>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#2E3330]/60 hover:bg-[#2E3330]/5 hover:text-[#2E3330] transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Volver a notas</span>
          </button>
          <span className="hidden md:inline text-[13px] font-bold text-[#2E3330] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#689C63]/20">
            Plan de clases
          </span>

          <div className="flex-1" />

          {/* Estado de guardado */}
          <div
            className={`inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${
              estadoGuardado === 'guardando' ? 'text-[#e5a022]' : 'text-[#2E3330]/60'
            }`}
          >
            {estadoGuardado === 'guardando' ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Guardando…
              </>
            ) : estadoGuardado === 'guardado' ? (
              <>
                <Check size={14} className="text-[#689C63]" /> Guardado
              </>
            ) : (
              <>
                <Cloud size={14} /> Sin cambios
              </>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCompartirAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#689C63] px-3.5 sm:px-4 text-white text-[13px] font-bold h-9 transition-all hover:bg-[#5a8a55] active:scale-95"
            >
              <Share2 size={15} />
              <span className="hidden sm:inline">Compartir</span>
            </button>
            <button
              onClick={() => setComentariosAbierto(true)}
              className="relative inline-flex items-center gap-1.5 rounded-xl border border-[#2E3330]/10 bg-white px-3.5 sm:px-4 text-[#2E3330] text-[13px] font-semibold h-9 transition-all hover:border-[#3e6088] hover:text-[#3e6088] active:scale-95"
            >
              <MessageSquareText size={15} />
              <span className="hidden sm:inline">Comentarios</span>
              {totalComentariosAbiertos > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#3e6088] text-white text-[10px] font-bold flex items-center justify-center">
                  {totalComentariosAbiertos}
                </span>
              )}
            </button>

            <button
              onClick={() => setMenuAbierto(v => !v)}
              className="p-2 rounded-xl border border-[#2E3330]/10 bg-white text-[#2E3330]/60 hover:text-[#2E3330] transition-colors"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Cuerpo: columna de contenido editorial ── */}
      <main className={`mx-auto px-4 sm:px-8 pb-16 ${isEmbedded ? 'h-full overflow-y-auto' : ''}`} style={{ maxWidth: 1160 }}>
        <div className="mx-auto" style={{ maxWidth: 760 }}>
          {/* Título editable */}
          <input
            value={titulo}
            onChange={handleTituloChange}
            placeholder="Título de la nota"
            autoFocus
            className="w-full mt-8 bg-transparent outline-none font-bold tracking-tight"
            style={{
              fontFamily: 'Manrope, Inter, system-ui, sans-serif',
              fontSize: 34,
              lineHeight: 1.15,
              color: '#2E3330',
            }}
          />

          {/* Información contextual de la clase */}
          <div className="mt-4">
            <InfoClase datos={infoClase} onChange={handleInfoClaseChange} />
          </div>

          {/* Regla sutil */}
          <div className="my-6 h-px w-full opacity-40" style={{ background: 'rgba(46,51,48,0.12)' }} />

          {/* Editor de bloques integrado sobre el fondo blanco */}
          <NotaEditor
            notaId={notaId}
            onSaving={(isSaving) => marcarGuardado(isSaving ? 'guardando' : 'guardado')}
          />

          {/* Pie del editor */}
          <div className="mt-8 flex items-center gap-2 text-[12px] text-[#2E3330]/60">
            <FileText size={13} className="text-[#689C63]" />
            <span>Escribe “/” para insertar un bloque · Selecciona un bloque para reordenarlo o eliminarlo</span>
          </div>
        </div>
      </main>

      <CompartirModal
        abierto={compartirAbierto}
        onCerrar={() => setCompartirAbierto(false)}
        compartidaCon={compartidaCon}
        onAgregar={agregarCompartida}
        onQuitar={quitarCompartida}
      />

      <ComentariosPanel
        abierto={comentariosAbierto}
        onCerrar={() => setComentariosAbierto(false)}
        comentarios={comentarios}
        onAgregar={agregarComentario}
        onResponder={responderComentario}
        onResolver={resolverComentario}
        userName={userName}
        userAvatarColor={userAvatarColor}
      />
      
      {/* Dropdown temporal para menú si se necesita */}
      {menuAbierto && (
        <div className="absolute top-16 right-6 w-48 bg-white border border-[#2E3330]/10 rounded-xl shadow-lg p-2 z-50">
          <p className="text-[12px] text-[#2E3330]/60 px-2 py-1">Opciones adicionales próximamente</p>
        </div>
      )}
    </div>
  );
}
