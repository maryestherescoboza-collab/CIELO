import { useEffect, useState } from 'react';
import { X, Check, Users } from 'lucide-react';
import { usePlanClasesStore } from '../../store/planClasesStore';
import { useAppStore } from '../../store/appStore';


interface CompartirCursosModalProps {
  abierto: boolean;
  notaId: string;
  onCerrar: () => void;
}

export function CompartirCursosModal({ abierto, notaId, onCerrar }: CompartirCursosModalProps) {
  const { getFichaCursos, compartirFicha } = usePlanClasesStore();
  const cursosAuth = useAppStore(s => s.state.cursos) || [];

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const misCursos = cursosAuth.map((c: any) => ({
    id: c.id,
    grado: c.grado,
    seccion: c.seccion
  }));
  const cursosDisponibles = misCursos.filter((v: any, i: any, a: any) => a.findIndex((t: any) => (t.id === v.id)) === i);

  useEffect(() => {
    if (!abierto || !notaId) return;
    
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const vinculados = await getFichaCursos(notaId);
        if (isMounted) {
          setSeleccionados(vinculados);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();

    return () => { isMounted = false; };
  }, [abierto, notaId, getFichaCursos]);

  if (!abierto) return null;

  const toggleCurso = (cId: number) => {
    setSeleccionados(prev => 
      prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]
    );
  };

  const handleGuardar = async () => {
    setSaving(true);
    await compartirFicha(notaId, seleccionados);
    setSaving(false);
    onCerrar();
  };

  return (
    <div
      className="fixed inset-0 z-130 flex items-start justify-center sm:items-center p-4"
      style={{ background: 'rgba(23, 26, 24, 0.4)', backdropFilter: 'blur(2px)' }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm bg-white rounded-[18px] shadow-2xl border border-neutral-200 overflow-hidden animate-[scaleUp_0.18s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-neutral-900 leading-tight">Compartir con cursos</h3>
              <p className="text-[12px] text-neutral-500">Publicar en el portal de estudiantes</p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
             <p className="text-sm text-neutral-500 text-center py-4">Cargando...</p>
          ) : cursosDisponibles.length === 0 ? (
             <p className="text-sm text-neutral-500 text-center py-4">No tienes cursos asignados.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3">Selecciona los cursos</p>
              {cursosDisponibles.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${seleccionados.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-neutral-300 bg-white'}`}>
                    {seleccionados.includes(c.id) && <Check size={14} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={seleccionados.includes(c.id)}
                    onChange={() => toggleCurso(c.id)}
                  />
                  <span className="text-sm font-semibold text-neutral-900">
                    {c.grado} {c.seccion}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
