import { useEffect, useState } from 'react';
import { X, Send, Users, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';

interface PortalComentariosDocentePanelProps {
  abierto: boolean;
  onCerrar: () => void;
  notaId: string;
}

export function PortalComentariosDocentePanel({ abierto, onCerrar, notaId }: PortalComentariosDocentePanelProps) {
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState<any[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const session = useAppStore(s => s.session);

  useEffect(() => {
    if (!abierto || !notaId) return;

    const loadData = async () => {
      setLoading(true);
      // 1. Obtener cursos con los que está compartida la ficha
      const { data: fcData, error: fcError } = await supabase
        .from('ficha_cursos')
        .select('curso_id, cursos(grado, seccion)')
        .eq('nota_id', notaId);
      
      if (!fcError && fcData) {
        const cursosList = fcData.map((r: any) => ({
          id: r.curso_id,
          nombre: `${r.cursos.grado} ${r.cursos.seccion}`
        }));
        setCursos(cursosList);
        if (cursosList.length > 0 && !selectedCursoId) {
          setSelectedCursoId(cursosList[0].id);
        }
      }

      setLoading(false);
    };

    loadData();
  }, [abierto, notaId]);

  useEffect(() => {
    if (!abierto || !notaId || !selectedCursoId) return;

    const fetchComentarios = async () => {
      const { data, error } = await supabase
        .from('ficha_comentarios')
        .select(`
          id, texto, created_at, user_id, estudiante_id,
          estudiantes(nombres, apellidos)
        `)
        .eq('nota_id', notaId)
        .eq('curso_id', selectedCursoId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setComentarios(data);
      }
    };

    fetchComentarios();
  }, [abierto, notaId, selectedCursoId]);

  if (!abierto) return null;

  const handleResponder = async () => {
    if (!nuevoTexto.trim() || !selectedCursoId) return;

    setEnviando(true);
    const { error } = await supabase
      .from('ficha_comentarios')
      .insert({
        nota_id: notaId,
        curso_id: selectedCursoId,
        user_id: session?.user?.id,
        texto: nuevoTexto.trim()
      });

    if (!error) {
      setNuevoTexto('');
      // Reload comments
      const { data } = await supabase
        .from('ficha_comentarios')
        .select(`
          id, texto, created_at, user_id, estudiante_id,
          estudiantes(nombres, apellidos)
        `)
        .eq('nota_id', notaId)
        .eq('curso_id', selectedCursoId)
        .order('created_at', { ascending: true });
      if (data) setComentarios(data);
    }
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-130" onClick={onCerrar}>
      <div className="absolute inset-0" style={{ background: 'rgba(23,26,24,0.18)' }} />

      <aside
        className="absolute right-0 top-0 h-full w-full max-w-100 bg-white border-l border-neutral-200 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-neutral-900 leading-tight">Comentarios del Portal</h3>
              <p className="text-[12px] text-neutral-500">Dudas de los estudiantes</p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-neutral-500" size={24}/></div>
        ) : cursos.length === 0 ? (
          <div className="p-5 text-center text-sm text-neutral-500">Esta ficha no está compartida con ningún curso.</div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
              <label className="text-[11px] font-bold uppercase text-neutral-500 mb-1 block">Filtrar por curso</label>
              <select 
                className="w-full bg-white border border-neutral-200 rounded-lg text-sm p-2 outline-none"
                value={selectedCursoId || ''}
                onChange={e => setSelectedCursoId(Number(e.target.value))}
              >
                {cursos.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {comentarios.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center mt-4">No hay comentarios en este curso.</p>
              ) : (
                comentarios.map(c => {
                  const isTeacher = !!c.user_id;
                  const autor = isTeacher ? 'Tú (Docente)' : `${c.estudiantes?.nombres} ${c.estudiantes?.apellidos}`;
                  return (
                    <div key={c.id} className={`p-3 rounded-xl text-sm ${isTeacher ? 'bg-blue-50 border border-blue-100 ml-6' : 'bg-neutral-100 border border-neutral-200 mr-6'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-neutral-800 text-[11px] uppercase tracking-wider">{autor}</span>
                        <span className="text-[10px] text-neutral-500">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{c.texto}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-neutral-200 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  value={nuevoTexto}
                  onChange={e => setNuevoTexto(e.target.value)}
                  placeholder="Escribe una respuesta..."
                  className="flex-1 max-h-30 min-h-10 text-sm p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl resize-none outline-none focus:border-blue-500"
                  rows={2}
                />
                <button
                  onClick={handleResponder}
                  disabled={!nuevoTexto.trim() || enviando}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
