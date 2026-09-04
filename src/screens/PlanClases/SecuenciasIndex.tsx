import React, { useEffect, useState } from 'react';
import { ArrowRight, Plus, ChevronDown, Loader2, BookOpen, Check, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlanClasesStore } from '../../store/planClasesStore';
import { useAppStore } from '../../store/appStore';
import type { SecuenciaDB } from '../../types/planClases';

// Componente Tarjeta Editable
function SecuenciaCard({ secuencia, cursos, onUpdate, onOpen }: { 
  secuencia: SecuenciaDB, 
  cursos: any[], 
  onUpdate: (id: string, updates: Partial<SecuenciaDB>) => void,
  onOpen: () => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [titulo, setTitulo] = useState(secuencia.titulo || '');
  const [descripcion, setDescripcion] = useState(secuencia.descripcion || '');
  const [estado, setEstado] = useState(secuencia.estado || 'borrador');
  const [cursoId, setCursoId] = useState<number | ''>(secuencia.curso_id || '');
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    await onUpdate(secuencia.id, {
      titulo: titulo.trim() || 'Secuencia sin título',
      descripcion: descripcion.trim() || null,
      estado,
      curso_id: cursoId === '' ? null : Number(cursoId)
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitulo(secuencia.titulo || '');
    setDescripcion(secuencia.descripcion || '');
    setEstado(secuencia.estado || 'borrador');
    setCursoId(secuencia.curso_id || '');
    setIsEditing(false);
  };

  // Find the selected course name for display
  const cursoSeleccionado = cursos.find(c => c.id === secuencia.curso_id);

  if (isEditing) {
    return (
      <div className="bg-white rounded-3xl border border-[#689C63]/30 p-5 flex flex-col gap-4 shadow-sm relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Título de la secuencia"
            className="w-full font-bold text-[18px] text-[#2E3330] border-b border-[#2E3330]/10 pb-1 outline-none focus:border-[#689C63] transition-colors"
          />
          
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción corta (opcional)"
            rows={2}
            className="w-full text-[14px] text-[#2E3330]/80 resize-none border border-[#2E3330]/10 rounded-xl p-2.5 outline-none focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 transition-all"
          />

          <div className="mt-1 flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#2E3330]/50">Curso</label>
            <select 
              value={cursoId}
              onChange={e => setCursoId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-[13px] bg-white border border-[#2E3330]/10 rounded-xl px-3 h-9 outline-none focus:border-[#689C63]"
            >
              <option value="">Ninguno</option>
              {cursos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#2E3330]/50">Estado</label>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setEstado('borrador')}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${estado === 'borrador' ? 'bg-[#2E3330]/10 text-[#2E3330]' : 'bg-transparent text-[#2E3330]/50 border border-[#2E3330]/10 hover:bg-[#2E3330]/5'}`}
              >
                Borrador
              </button>
              <button 
                type="button"
                onClick={() => setEstado('activa')}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${estado === 'activa' ? 'bg-[#689C63]/15 text-[#689C63]' : 'bg-transparent text-[#2E3330]/50 border border-[#2E3330]/10 hover:bg-[#2E3330]/5'}`}
              >
                Activa
              </button>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#2E3330]/10 flex items-center justify-end gap-2">
          <button 
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3 h-8 rounded-full text-[13px] font-bold text-[#2E3330]/60 hover:bg-[#2E3330]/5 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 h-8 rounded-full bg-[#689C63] text-white text-[13px] font-bold hover:brightness-95 transition-all flex items-center gap-1.5 disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onOpen}
      className="bg-white rounded-3xl border border-[#2E3330]/10 p-5 flex flex-col gap-3 hover:shadow-sm hover:border-[#689C63]/30 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-bold text-[#2E3330] leading-tight group-hover:text-[#689C63] transition-colors">
            {secuencia.titulo}
          </h2>
          {cursoSeleccionado && (
            <p className="text-[13px] text-[#2E3330]/60 font-semibold flex items-center gap-1.5">
              <span>{cursoSeleccionado.nombre}</span>
            </p>
          )}
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#2E3330]/40 hover:text-[#689C63] hover:bg-[#689C63]/10 transition-colors shrink-0" 
          title="Editar detalles"
        >
          <Edit2 size={15} />
        </button>
      </div>

      {secuencia.descripcion && (
        <p className="text-[14px] text-[#2E3330]/70 line-clamp-2 leading-snug">
          {secuencia.descripcion}
        </p>
      )}

      <div className="pt-3 flex items-center justify-between mt-auto">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
          secuencia.estado === 'borrador' 
            ? 'bg-[#2E3330]/5 text-[#2E3330]/60' 
            : 'bg-[#689C63]/10 text-[#689C63]'
        }`}>
          {secuencia.estado === 'borrador' ? 'Borrador' : 'Activa'}
        </span>
        
        <div className="flex items-center gap-1 text-[13px] font-bold text-[#2E3330]/40 group-hover:text-[#689C63] transition-colors">
          <span>Abrir</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </div>
  );
}

export default function SecuenciasIndex() {
  const navigate = useNavigate();
  const session = useAppStore((s) => s.session);
  const cursos = useAppStore((s) => s.state.cursos) || [];
  
  const { secuencias, loadingSecuencias, error, fetchSecuencias, createSecuencia, updateSecuencia } = usePlanClasesStore();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchSecuencias(session.user.id);
    }
  }, [session?.user?.id, fetchSecuencias]);

  const handleCreate = async () => {
    const titulo = prompt('Ingresa el título de la nueva secuencia:');
    if (!titulo || !titulo.trim() || !session?.user?.id) return;
    
    setIsCreating(true);
    const newSecuencia = await createSecuencia(session.user.id, titulo.trim());
    setIsCreating(false);
    
    if (newSecuencia) {
      navigate(`/plan-de-clases/secuencias/${newSecuencia.id}/notas`);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Manrope, Inter, system-ui' }}>
      <main className="flex-1 px-4 sm:px-8 py-7 max-w-7xl w-full mx-auto flex flex-col gap-6">
        {/* ================= CABECERA ================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-bold text-[28px] md:text-[32px] text-[#2E3330] tracking-tight">
              Secuencias
            </h1>
            <p className="text-[#2E3330]/70 text-[15px] max-w-2xl font-['Inter']">
              Estructuras pedagógicas y planes de unidad articulados por competencias.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCreate}
              disabled={isCreating}
              className="px-5 py-2.5 rounded-full bg-[#689C63] text-white font-bold text-[14px] hover:bg-[#5a8a55] transition-colors shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50" 
            >
              {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span>Nueva secuencia</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-200">
            Error al cargar secuencias: {error}
          </div>
        )}

        <div className="flex items-center justify-between pb-2 mt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-[#2E3330]">Mis secuencias</h2>
            {!loadingSecuencias && (
              <span className="px-2 py-0.5 rounded-full bg-[#689C63]/10 text-[#689C63] text-[12px] font-bold">
                {secuencias.length} activa{secuencias.length !== 1 && 's'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1 text-[13px] font-bold text-[#2E3330] px-2.5 py-1 rounded-lg hover:bg-[#2E3330]/5 transition-colors">
              <span>Filtrar</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* ================= LISTADO DE SECUENCIAS ================= */}
        {loadingSecuencias ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#689C63]" />
          </div>
        ) : secuencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-[#2E3330]/10 border-dashed">
            <div className="w-16 h-16 rounded-full bg-[#689C63]/10 flex items-center justify-center text-[#689C63] mb-4">
              <BookOpen size={28} />
            </div>
            <h3 className="text-lg font-bold text-[#2E3330] mb-2">Aún no tienes secuencias</h3>
            <p className="text-[14px] text-[#2E3330]/60 max-w-sm mb-6">
              Las secuencias te ayudan a agrupar tus notas de clase por unidades temáticas o competencias.
            </p>
            <button 
              onClick={handleCreate}
              className="px-5 py-2.5 rounded-full bg-[#2E3330]/5 text-[#2E3330] font-bold text-[14px] hover:bg-[#2E3330]/10 transition-colors"
            >
              Crear tu primera secuencia
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {secuencias.map((secuencia) => (
              <SecuenciaCard 
                key={secuencia.id} 
                secuencia={secuencia} 
                cursos={cursos} 
                onUpdate={updateSecuencia}
                onOpen={() => navigate(`/plan-de-clases/secuencias/${secuencia.id}/notas`)}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
