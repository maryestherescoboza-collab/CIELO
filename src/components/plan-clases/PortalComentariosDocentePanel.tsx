import { useEffect, useState, useCallback } from 'react';
import { X, Send, Users, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';

interface PortalComentariosDocentePanelProps {
  abierto: boolean;
  onCerrar: () => void;
  notaId: string;
}

interface CursoItem {
  id: number;
  nombre: string;
  asignatura?: string;
}

interface ComentarioItem {
  id: string;
  texto: string;
  created_at: string;
  user_id: string | null;
  estudiante_id: number | null;
  curso_id: number;
  estudiantes?: {
    nombre?: string;
    apellido?: string;
  } | null;
  cursos?: {
    grado?: string;
    seccion?: string;
    asignatura?: string;
    nombre?: string;
  } | null;
}

export function PortalComentariosDocentePanel({ abierto, onCerrar, notaId }: PortalComentariosDocentePanelProps) {
  const [comentarios, setComentarios] = useState<ComentarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<number | 'todos'>('todos');
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const session = useAppStore(s => s.session);

  // 1. Cargar cursos vinculados a la ficha (ficha_publicaciones + fallback ficha_cursos)
  useEffect(() => {
    if (!abierto || !notaId) return;

    let isMounted = true;

    const loadCursos = async () => {
      setLoading(true);
      try {
        const cursosMap = new Map<number, CursoItem>();

        // Publicaciones modernas
        const { data: fpData } = await supabase
          .from('ficha_publicaciones')
          .select('curso_id, asignatura, cursos(id, grado, seccion, nombre, asignatura)')
          .eq('nota_id', notaId)
          .eq('estado', 'publicada');

        if (fpData) {
          fpData.forEach((fp: any) => {
            if (fp.curso_id && !cursosMap.has(fp.curso_id)) {
              const c = fp.cursos;
              cursosMap.set(fp.curso_id, {
                id: fp.curso_id,
                nombre: c ? `${c.grado || ''} ${c.seccion || ''}`.trim() || c.nombre || `Curso #${fp.curso_id}` : `Curso #${fp.curso_id}`,
                asignatura: fp.asignatura || c?.asignatura
              });
            }
          });
        }

        // Compatibilidad legacy ficha_cursos
        const { data: fcData } = await supabase
          .from('ficha_cursos')
          .select('curso_id, cursos(id, grado, seccion, nombre, asignatura)')
          .eq('nota_id', notaId);

        if (fcData) {
          fcData.forEach((fc: any) => {
            if (fc.curso_id && !cursosMap.has(fc.curso_id)) {
              const c = fc.cursos;
              cursosMap.set(fc.curso_id, {
                id: fc.curso_id,
                nombre: c ? `${c.grado || ''} ${c.seccion || ''}`.trim() || c.nombre || `Curso #${fc.curso_id}` : `Curso #${fc.curso_id}`,
                asignatura: c?.asignatura
              });
            }
          });
        }

        if (isMounted) {
          const list = Array.from(cursosMap.values());
          setCursos(list);
          setSelectedCursoId(list.length === 1 ? list[0].id : 'todos');
        }
      } catch (err) {
        console.error('Error cargando cursos de la ficha:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCursos();

    return () => {
      isMounted = false;
    };
  }, [abierto, notaId]);

  // 2. Cargar comentarios asociados
  const fetchComentarios = useCallback(async () => {
    if (!abierto || !notaId) return;

    let query = supabase
      .from('ficha_comentarios')
      .select(`
        id, texto, created_at, user_id, estudiante_id, curso_id,
        estudiantes(nombre, apellido),
        cursos(grado, seccion, asignatura, nombre)
      `)
      .eq('nota_id', notaId)
      .order('created_at', { ascending: true });

    if (selectedCursoId !== 'todos') {
      query = query.eq('curso_id', selectedCursoId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setComentarios(data as unknown as ComentarioItem[]);
    } else if (error) {
      console.error('Error al obtener comentarios de ficha:', error);
    }
  }, [abierto, notaId, selectedCursoId]);

  useEffect(() => {
    fetchComentarios();
  }, [fetchComentarios]);

  if (!abierto) return null;

  const handleResponder = async () => {
    if (!nuevoTexto.trim() || cursos.length === 0) return;

    // Determinar curso de respuesta: el seleccionado o el primer curso disponible
    const cursoDestinoId = selectedCursoId === 'todos' ? cursos[0].id : selectedCursoId;
    if (!cursoDestinoId) return;

    setEnviando(true);
    const textoAEnviar = nuevoTexto.trim();
    const tempId = crypto.randomUUID();
    const optimisticComment: ComentarioItem = {
      id: tempId,
      texto: textoAEnviar,
      created_at: new Date().toISOString(),
      user_id: session?.user?.id ?? null,
      estudiante_id: null,
      curso_id: cursoDestinoId,
      estudiantes: null
    };

    setComentarios(prev => [...prev, optimisticComment]);
    setNuevoTexto('');

    try {
      const { error } = await supabase
        .from('ficha_comentarios')
        .insert({
          nota_id: notaId,
          curso_id: cursoDestinoId,
          user_id: session?.user?.id,
          texto: textoAEnviar
        });

      if (error) {
        setComentarios(prev => prev.filter(c => c.id !== tempId));
        console.error('Error al insertar respuesta docente:', error);
      } else {
        await fetchComentarios();
      }
    } catch (err) {
      setComentarios(prev => prev.filter(c => c.id !== tempId));
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-130" onClick={onCerrar}>
      <div className="absolute inset-0" style={{ background: 'rgba(23,26,24,0.18)' }} />

      <aside
        className="absolute right-0 top-0 h-full w-full max-w-105 bg-white border-l border-neutral-200 shadow-2xl flex flex-col animate-in fade-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-neutral-900 leading-tight">Comentarios del Portal</h3>
              <p className="text-[12px] text-neutral-500">Dudas de los estudiantes</p>
            </div>
          </div>
          <button 
            onClick={onCerrar} 
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors"
            title="Cerrar panel"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <span className="text-xs text-neutral-500">Cargando dudas...</span>
          </div>
        ) : cursos.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
            <BookOpen size={28} className="text-neutral-300" />
            <p className="font-semibold text-neutral-700">Ficha no compartida</p>
            <p className="text-xs text-neutral-400 max-w-xs">Esta ficha aún no ha sido compartida ni publicada en ningún curso.</p>
          </div>
        ) : (
          <>
            {/* Filtro por curso si hay más de 1 curso */}
            {cursos.length > 1 && (
              <div className="px-5 py-2.5 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold uppercase text-neutral-500 whitespace-nowrap">Filtrar curso:</label>
                <select 
                  className="bg-white border border-neutral-200 rounded-lg text-xs font-semibold py-1 px-2.5 outline-none focus:border-blue-500 cursor-pointer text-neutral-700 flex-1 max-w-56"
                  value={selectedCursoId}
                  onChange={e => setSelectedCursoId(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                >
                  <option value="todos">Todos los cursos ({cursos.length})</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.asignatura ? ` · ${c.asignatura}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Lista de comentarios */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar bg-white">
              {comentarios.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto mb-2.5">
                    <Users size={20} />
                  </div>
                  <p className="text-sm font-semibold text-neutral-700">No hay dudas aún</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                    Los comentarios y preguntas que envíen los estudiantes desde el Portal aparecerán aquí.
                  </p>
                </div>
              ) : (
                comentarios.map(c => {
                  const isTeacher = !!c.user_id;
                  const nombreEstudiante = c.estudiantes 
                    ? `${c.estudiantes.nombre || ''} ${c.estudiantes.apellido || ''}`.trim() 
                    : 'Estudiante';
                  const autor = isTeacher ? 'Tú (Docente)' : nombreEstudiante;
                  const cursoLabel = c.cursos ? `${c.cursos.grado || ''} ${c.cursos.seccion || ''}`.trim() : '';

                  const fecha = new Date(c.created_at);
                  const fechaStr = `${fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <div 
                      key={c.id} 
                      className={`p-3.5 rounded-2xl text-sm transition-all border ${
                        isTeacher 
                          ? 'bg-blue-50/80 border-blue-100/90 ml-6 text-blue-950' 
                          : 'bg-neutral-50 border-neutral-200/80 mr-6 text-neutral-900'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`font-bold text-[11px] uppercase tracking-wide truncate ${isTeacher ? 'text-blue-700' : 'text-neutral-800'}`}>
                            {autor}
                          </span>
                          {!isTeacher && cursoLabel && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-neutral-200/70 text-neutral-600 shrink-0">
                              {cursoLabel}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400 font-medium shrink-0">
                          {fechaStr}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap text-[13px] text-neutral-700">{c.texto}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input de respuesta del docente */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50/50">
              <div className="flex items-end gap-2">
                <textarea
                  value={nuevoTexto}
                  onChange={e => setNuevoTexto(e.target.value)}
                  placeholder="Escribe una respuesta para los estudiantes..."
                  className="flex-1 max-h-30 min-h-10 text-xs sm:text-sm p-2.5 bg-white border border-neutral-200 rounded-xl resize-none outline-none focus:border-blue-500 leading-relaxed"
                  rows={2}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleResponder();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleResponder}
                  disabled={!nuevoTexto.trim() || enviando}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                  title="Enviar respuesta (Ctrl+Enter)"
                >
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
