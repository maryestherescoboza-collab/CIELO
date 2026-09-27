import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ArrowLeft, Send, Route as RouteIcon, Check } from 'lucide-react';
import { rutaApiPortal } from '../../lib/rutaApi';
import type { ResumenRutaEstudiante } from '../../types/rutas';
import { usePortal, rutaPortal } from './portalContext';

interface FichaDetalle {
  id: string;
  titulo: string;
  contenido_json: any;
  actualizado_en: string;
}

interface Comentario {
  id: string;
  texto: string;
  created_at: string;
  autor_nombre: string;
  es_docente: boolean;
  es_propio: boolean;
}

export default function PortalFichaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, sessionToken } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<FichaDetalle | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [rutas, setRutas] = useState<ResumenRutaEstudiante[]>([]);

  useEffect(() => {
    if (!id || !sessionToken) return;

    const fetchFicha = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase.rpc('portal_get_ficha_detalle', {
          p_session_token: sessionToken,
          p_nota_id: id
        });
        
        if (fetchError) throw fetchError;
        if (data && data.error) throw new Error(data.error);
        
        setFicha(data);

        // Fetch comentarios
        const { data: comData, error: comError } = await supabase.rpc('portal_get_comentarios_ficha', {
          p_session_token: sessionToken,
          p_nota_id: id
        });

        if (comError) throw comError;
        if (comData && !comData.error) {
          setComentarios(comData);
        }

        // Rutas publicadas de esta ficha. Si la migracion todavia no esta
        // aplicada, la ficha tiene que seguir funcionando igual.
        try {
          const disponibles = await rutaApiPortal.listar(sessionToken, id);
          setRutas(disponibles);
        } catch {
          setRutas([]);
        }

      } catch (err: any) {
        setError(err.message || 'Error al cargar la ficha');
      } finally {
        setLoading(false);
      }
    };

    fetchFicha();
  }, [id, sessionToken]);

  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim() || !id || !sessionToken) return;
    
    setEnviando(true);
    try {
      const { data, error } = await supabase.rpc('portal_crear_comentario_ficha', {
        p_session_token: sessionToken,
        p_nota_id: id,
        p_texto: nuevoComentario.trim()
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      // Reload comments
      const { data: comData, error: comError } = await supabase.rpc('portal_get_comentarios_ficha', {
        p_session_token: sessionToken,
        p_nota_id: id
      });
      if (comError) throw comError;
      if (comData && !comData.error) {
        setComentarios(comData);
      }
      
      setNuevoComentario('');
    } catch (err: any) {
      alert(err.message || 'Error al enviar comentario');
    } finally {
      setEnviando(false);
    }
  };

  const renderNestedList = (items: any[], isOrdered: boolean) => {
    const ListTag = isOrdered ? 'ol' : 'ul';
    return (
      <ListTag className={`pl-5 ${isOrdered ? 'list-decimal' : 'list-disc'} space-y-1`}>
        {items.map((item, i) => {
          // Si el item es un objeto (formato de @editorjs/nested-list)
          if (typeof item === 'object' && item !== null) {
            return (
              <li key={i}>
                <span dangerouslySetInnerHTML={{ __html: item.content || '' }} />
                {item.items && item.items.length > 0 && renderNestedList(item.items, isOrdered)}
              </li>
            );
          }
          // Si el item es simplemente un string (formato de @editorjs/list estándar)
          return <li key={i} dangerouslySetInnerHTML={{ __html: String(item) }} />;
        })}
      </ListTag>
    );
  };

  const renderBlock = (block: any) => {
    switch (block.type) {
      case 'paragraph':
        return <p className="mb-4 text-sm text-neutral-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
      case 'header': {
        const textObj = { __html: block.data.text };
        const cls = "font-bold text-black mb-4 mt-6";
        switch (block.data.level) {
          case 1: return <h1 className={cls} dangerouslySetInnerHTML={textObj} />;
          case 2: return <h2 className={cls} dangerouslySetInnerHTML={textObj} />;
          case 3: return <h3 className={cls} dangerouslySetInnerHTML={textObj} />;
          case 4: return <h4 className={cls} dangerouslySetInnerHTML={textObj} />;
          case 5: return <h5 className={cls} dangerouslySetInnerHTML={textObj} />;
          case 6: return <h6 className={cls} dangerouslySetInnerHTML={textObj} />;
          default: return <h2 className={cls} dangerouslySetInnerHTML={textObj} />;
        }
      }
      case 'list':
        return (
          <div className="mb-4 text-sm text-neutral-800">
            {renderNestedList(block.data.items, block.data.style === 'ordered')}
          </div>
        );
      case 'checklist':
        return (
          <div className="mb-4 text-sm text-neutral-800 space-y-2">
            {block.data.items.map((item: any, i: number) => (
              <div key={i} className="flex items-start space-x-2">
                <input type="checkbox" checked={item.checked} readOnly className="mt-1" />
                <span dangerouslySetInnerHTML={{ __html: item.text }} />
              </div>
            ))}
          </div>
        );
      case 'image':
        return (
          <div className="mb-4">
            <img src={block.data.file?.url} alt={block.data.caption} className="max-w-full rounded-lg border border-neutral-200" />
            {block.data.caption && <p className="text-xs text-neutral-500 mt-1 text-center">{block.data.caption}</p>}
          </div>
        );
      case 'quote':
        return (
          <blockquote className="mb-4 pl-4 border-l-4 border-neutral-300 italic text-neutral-600 text-sm">
            <p dangerouslySetInnerHTML={{ __html: block.data.text }} />
            {block.data.caption && <footer className="mt-1 text-xs not-italic font-semibold">— {block.data.caption}</footer>}
          </blockquote>
        );
      case 'warning':
        return (
          <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-900 rounded-r-lg text-sm">
            {block.data.title && <h4 className="font-bold mb-1">{block.data.title}</h4>}
            <p dangerouslySetInnerHTML={{ __html: block.data.message }} />
          </div>
        );
      case 'delimiter':
        return <hr className="my-6 border-t border-neutral-200" />;
      default:
        // Bloque no soportado explícitamente, intentar renderizar su texto si lo tiene
        if (block.data && typeof block.data.text === 'string') {
          return <p className="mb-4 text-sm text-neutral-800" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
        }
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-stone-900" size={32} />
      </div>
    );
  }

  if (error || !ficha) {
    return (
      <div className="p-5">
        <button onClick={() => navigate(rutaPortal(token, 'fichas'))} className="flex items-center text-xs font-bold mb-4 hover:underline">
          <ArrowLeft size={14} className="mr-1" /> Volver a Fichas
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-red-600 text-sm font-bold">{error || 'Ficha no encontrada'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 px-5 pb-10">
      <button onClick={() => navigate(rutaPortal(token, 'fichas'))} className="flex items-center text-xs font-bold mb-6 text-neutral-600 hover:text-black transition-colors">
        <ArrowLeft size={14} className="mr-1.5" /> Volver a Fichas
      </button>

      <article className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-black mb-2 tracking-tight">{ficha.titulo || 'Sin título'}</h1>
        <p className="text-xs font-bold text-neutral-500 mb-8 pb-4 border-b border-neutral-100">
          Última actualización: {new Date(ficha.actualizado_en).toLocaleDateString()}
        </p>

        <div className="prose prose-sm max-w-none prose-neutral">
          {ficha.contenido_json?.blocks?.map((block: any) => (
            <div key={block.id || Math.random().toString()}>
              {renderBlock(block)}
            </div>
          ))}
        </div>
      </article>

      {/* Rutas de aprendizaje */}
      {rutas.length > 0 && (
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-sm font-bold text-black mb-3">
            <RouteIcon size={15} className="text-neutral-500" />
            Rutas de aprendizaje
          </h2>
          <div className="space-y-2">
            {rutas.map((ruta) => {
              const completo = ruta.total_actividades > 0 && ruta.completadas >= ruta.total_actividades;
              const porcentaje = ruta.total_actividades > 0
                ? Math.round((ruta.completadas / ruta.total_actividades) * 100)
                : 0;
              return (
                <button
                  key={ruta.id}
                  onClick={() => navigate(rutaPortal(token, 'fichas', id ?? '', 'ruta', ruta.id))}
                  className="w-full flex items-center gap-3 p-4 text-left bg-white border border-neutral-200 rounded-2xl hover:border-black transition-colors group"
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    completo ? 'bg-black text-white' : 'bg-neutral-100 text-black'
                  }`}>
                    {completo ? <Check size={16} /> : <RouteIcon size={16} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-black truncate">{ruta.titulo}</span>
                    <span className="block text-[11px] text-neutral-500">
                      {ruta.total_etapas} etapa{ruta.total_etapas === 1 ? '' : 's'} ·{' '}
                      {ruta.total_actividades} actividade{ruta.total_actividades === 1 ? '' : 's'}
                      {ruta.total_actividades > 0 && ` · ${porcentaje}%`}
                    </span>
                    {ruta.descripcion && (
                      <span className="block text-xs text-neutral-600 mt-0.5 line-clamp-2">
                        {ruta.descripcion}
                      </span>
                    )}
                  </span>
                  {ruta.total_actividades > 0 && (
                    <span className="hidden sm:block w-16 h-1.5 rounded-full bg-neutral-100 overflow-hidden shrink-0">
                      <span
                        className="block h-full rounded-full bg-black transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Comentarios */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-black mb-6">Comentarios</h2>
        
        <div className="space-y-4 mb-6 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
          {comentarios.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">No hay comentarios aún. Escribe el primero.</p>
          ) : (
            comentarios.map(com => (
              <div key={com.id} className={`p-4 rounded-xl text-sm ${com.es_propio ? 'bg-blue-50 border border-blue-100' : com.es_docente ? 'bg-neutral-100 border border-neutral-200' : 'bg-white border border-neutral-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold ${com.es_docente ? 'text-black' : 'text-neutral-800'}`}>
                    {com.autor_nombre} {com.es_docente && <span className="ml-1 text-[10px] bg-black text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Docente</span>}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-bold">{new Date(com.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-neutral-700 whitespace-pre-wrap leading-relaxed">{com.texto}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex items-start gap-3 mt-4 pt-4 border-t border-neutral-100">
          <textarea
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            placeholder="Escribe un comentario o duda..."
            className="flex-1 min-h-11 h-11 max-h-30 p-3 text-sm bg-neutral-50 border border-neutral-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all custom-scrollbar"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEnviarComentario();
              }
            }}
          />
          <button
            onClick={handleEnviarComentario}
            disabled={!nuevoComentario.trim() || enviando}
            className="w-11 h-11 flex-none flex items-center justify-center bg-black text-white rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </button>
        </div>
      </section>
    </div>
  );
}
