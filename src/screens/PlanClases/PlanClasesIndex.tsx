import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, Search, LayoutDashboard, Filter, Pin, MoreVertical, 
  ExternalLink, ArrowLeft, Loader2, FileText
} from 'lucide-react';
import { usePlanClasesStore } from '../../store/planClasesStore';
import { useAppStore } from '../../store/appStore';
import NuevaNotaClase from './NuevaNotaClase';

const NOTA_COLORES = [
  '#FBF0E1',
  '#EFE7DE',
  '#E8F0EA',
  '#EDEAE1',
  '#F3EDE7',
  '#E9EEF1',
  '#F7EFE4',
  '#EEF0E4',
  '#F7ECEC',
  '#ECE9F2',
  '#EAF0E4',
  '#F6EEE2',
];

function colorParaNota(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return NOTA_COLORES[hash % NOTA_COLORES.length];
}

interface PlanClasesIndexProps {
  userName?: string;
  userAvatarColor?: string;
  currentUser?: { id?: string; email?: string } | null;
}

export default function PlanClasesIndex({ userName, userAvatarColor, currentUser }: PlanClasesIndexProps) {
  const navigate = useNavigate();
  const { secuenciaId, notaId: urlNotaId } = useParams();
  const session = useAppStore((s) => s.session);
  
  const { notas, loadingNotas, error, fetchNotas, createNota } = usePlanClasesStore();
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado local que controla qué nota está abierta en el panel derecho.
  const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(urlNotaId || null);

  // Sincronizar URL con estado inicial
  useEffect(() => {
    if (urlNotaId && urlNotaId !== notaSeleccionadaId) {
      setNotaSeleccionadaId(urlNotaId);
    }
  }, [urlNotaId]);

  useEffect(() => {
    if (secuenciaId) {
      fetchNotas(secuenciaId);
    }
  }, [secuenciaId, fetchNotas]);

  const handleCreateNota = async () => {
    if (!secuenciaId || !session?.user?.id) return;
    const titulo = prompt('Título de la nueva nota:');
    if (!titulo || !titulo.trim()) return;

    setIsCreating(true);
    const newNota = await createNota(secuenciaId, session.user.id, titulo.trim());
    setIsCreating(false);
    
    if (newNota) {
      navigate(`/plan-de-clases/secuencias/${secuenciaId}/notas/${newNota.id}/editar`);
    }
  };

  const handleOpenNote = (id: string) => {
    if (secuenciaId) {
      setNotaSeleccionadaId(id);
      navigate(`/plan-de-clases/secuencias/${secuenciaId}/notas/${id}/editar`, { replace: true });
    }
  };

  const handleCloseNote = () => {
    setNotaSeleccionadaId(null);
    if (secuenciaId) {
      navigate(`/plan-de-clases/secuencias/${secuenciaId}/notas`, { replace: true });
    }
  };

  const notasFiltradas = notas.filter(n => 
    n.titulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex w-full bg-white ${notaSeleccionadaId ? 'h-[calc(100vh-2px)] overflow-hidden' : 'min-h-screen'}`} style={{ fontFamily: 'Manrope, Inter, system-ui' }}>
      <style>{`@keyframes fadeInPanel { from { opacity: 0; } to { opacity: 1; } }`}</style>
      
      {/* ── PANEL IZQUIERDO: LISTA DE NOTAS ── */}
      <aside className={`flex flex-col transition-all duration-200 ease-out ${notaSeleccionadaId ? 'w-90 lg:w-100 shrink-0 border-r border-[#2E3330]/10 bg-white/40 h-full overflow-y-auto px-4 py-5' : 'flex-1 px-4 sm:px-8 py-7 max-w-7xl w-full mx-auto'}`}>
        
        {/* CABECERA & SUMMARY PANEL */}
        <div className={`flex ${notaSeleccionadaId ? 'flex-col gap-4' : 'flex-col md:flex-row md:items-end justify-between gap-4'} pb-2`}>
          <div className="flex flex-col gap-1.5">
            {secuenciaId && (
              <button 
                onClick={() => navigate('/plan-de-clases/secuencias')}
                className="flex items-center gap-1.5 text-[#2E3330]/60 hover:text-[#2E3330] transition-colors w-fit mb-1 text-[13px] font-bold"
              >
                <ArrowLeft size={14} />
                <span>Volver a Secuencias</span>
              </button>
            )}
            {!notaSeleccionadaId && (
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#689C63]/10 text-[#689C63] text-[12px] font-bold">
                  Cuaderno Pedagógico
                </span>
                <span className="text-[#2E3330]/40 text-xs">•</span>
                <span className="text-[12px] text-[#2E3330]/70 font-bold">Actualizado hace unos instantes</span>
              </div>
            )}
            <h1 className={`font-bold text-[#2E3330] tracking-tight ${notaSeleccionadaId ? 'text-[24px]' : 'text-[28px] md:text-[32px]'}`}>
              {secuenciaId ? 'Notas de la secuencia' : 'Mis notas'}
            </h1>
          </div>
          
          {/* Primary CTA Button & Search */}
          <div className={`flex items-center gap-3 shrink-0 ${notaSeleccionadaId ? 'w-full' : ''}`}>
            <div className={`flex items-center gap-2 px-3 py-2 bg-white border border-[#2E3330]/10 rounded-xl text-[#2E3330]/70 text-[13px] shadow-sm font-['Inter'] ${notaSeleccionadaId ? 'flex-1' : 'hidden lg:flex rounded-full'}`}>
              <Search size={15} className="text-[#2E3330]/40 shrink-0" />
              <input 
                type="text"
                placeholder="Buscar nota..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none w-full placeholder:text-[#2E3330]/40"
              />
              {!notaSeleccionadaId && <span className="px-1.5 py-0.5 bg-[#2E3330]/5 rounded text-xs text-[#2E3330]/60 font-bold border border-[#2E3330]/10">⌘K</span>}
            </div>
            {secuenciaId && (
              <button 
                onClick={handleCreateNota}
                disabled={isCreating}
                className={`inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-[#689C63] text-white font-bold text-[13px] hover:bg-[#5a8a55] transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${notaSeleccionadaId ? 'rounded-xl' : 'rounded-full px-5 text-[14px]'}`}
                title="Nueva nota"
              >
                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {!notaSeleccionadaId && <span>Nueva nota</span>}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-200 mt-4">
            Error al cargar notas: {error}
          </div>
        )}

        {/* MASONRY BOARD / LIST */}
        <section className="flex flex-col gap-4 mt-6">
          {!notaSeleccionadaId && (
            <div className="flex flex-wrap items-center justify-between pb-3 gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-bold text-[#2E3330]">Tablero</h2>
                {!loadingNotas && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2E3330]/5 text-[#2E3330]/70 text-[12px] font-bold">
                    {notas.length} notas en esta secuencia
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button className="px-3 py-1 rounded-full bg-[#689C63]/10 text-[#689C63] text-[12px] font-bold">Todas ({notas.length})</button>
                <div className="h-4 w-px bg-[#2E3330]/10 mx-1 hidden sm:block"></div>
                <button className="p-1.5 rounded-full text-[#689C63] bg-[#2E3330]/5 hover:bg-[#2E3330]/10 transition-colors" title="Vista Masonry"><LayoutDashboard size={18} /></button>
                <button className="p-1.5 rounded-full text-[#2E3330]/70 hover:text-[#2E3330] transition-colors" title="Filtrar notas"><Filter size={18} /></button>
              </div>
            </div>
          )}

          {loadingNotas ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[#689C63]" />
            </div>
          ) : notasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/50 rounded-3xl border border-[#2E3330]/10 border-dashed">
              <div className="w-14 h-14 rounded-full bg-[#689C63]/10 flex items-center justify-center text-[#689C63] mb-4">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-bold text-[#2E3330] mb-2">Aún no hay notas</h3>
              <p className="text-[13px] text-[#2E3330]/60 max-w-62.5 mb-6">
                Comienza agregando tu primera nota para diseñar la clase.
              </p>
              <button 
                onClick={handleCreateNota}
                className="px-5 py-2.5 rounded-full bg-[#2E3330]/5 text-[#2E3330] font-bold text-[13px] hover:bg-[#2E3330]/10 transition-colors"
              >
                Crear primera nota
              </button>
            </div>
          ) : (
            <div className={`gap-4 ${notaSeleccionadaId ? 'flex flex-col' : 'columns-1 sm:columns-2 md:columns-3 lg:columns-4'}`} style={{ columnFill: 'balance' }}>
              {notasFiltradas.map((nota) => {
                const isActive = nota.id === notaSeleccionadaId;
                const color = colorParaNota(nota.id);
                return (
                  <article 
                    key={nota.id}
                    onClick={() => handleOpenNote(nota.id)}
                    style={{ background: color }}
                    className={`cursor-pointer break-inside-avoid mb-4 p-5 rounded-3xl transition-all duration-200 flex flex-col group relative ${
                      isActive 
                        ? 'shadow-sm z-10' 
                        : 'shadow-[0_1px_3px_rgba(46,51,48,0.06)] hover:shadow-[0_4px_16px_rgba(46,51,48,0.08)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold ${isActive ? 'bg-[#689C63]/10 text-[#689C63]' : 'bg-[#B8CADC]/30 text-[#3e6088]'}`}>
                        Nota de clase
                      </span>
                      {!notaSeleccionadaId && (
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button aria-label="Fijar nota" className="text-[#2E3330]/50 hover:text-[#689C63] p-0.5 rounded transition-colors" title="Fijar">
                            <Pin size={16} />
                          </button>
                          <button aria-label="Opciones" className="text-[#2E3330]/50 hover:text-[#2E3330] p-0.5 rounded transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className={`font-bold transition-colors leading-snug mb-2 ${notaSeleccionadaId ? 'text-[15px]' : 'text-[17px]'} ${isActive ? 'text-[#2E3330]' : 'text-[#2E3330] group-hover:text-[#689C63]'}`}>
                      {nota.titulo}
                    </h3>
                    <div className="pt-3 border-t border-[#2E3330]/5 flex items-center justify-between text-[#2E3330]/70 text-[11px] font-bold mt-2">
                      <span className="flex items-center gap-1 text-[#2E3330]/50">
                        {new Date(nota.actualizado_en).toLocaleDateString()}
                      </span>
                      {!notaSeleccionadaId && (
                        <span className="inline-flex items-center gap-1 text-[#2E3330]/50 hover:text-[#2E3330] cursor-pointer">
                          <ExternalLink size={13} />
                          <span>Abrir</span>
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </aside>

      {/* ── PANEL DERECHO: EDITOR DE NOTA ── */}
      {notaSeleccionadaId && (
        <section className="flex-1 h-full flex flex-col overflow-y-auto bg-white relative animate-[fadeInPanel_0.2s_ease-out]">
          <NuevaNotaClase
            notaId={notaSeleccionadaId}
            userName={userName || ''} 
            userAvatarColor={userAvatarColor} 
            currentUser={currentUser} 
            isEmbedded={true}
            onClose={handleCloseNote}
          />
        </section>
      )}
      
    </div>
  );
}
