import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import type { Curso } from '../../types';

interface DescargarQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  cursos: Curso[];
  onDescargar: (cursoId: number) => Promise<void>;
  isGenerating: boolean;
}

export const DescargarQrModal: React.FC<DescargarQrModalProps> = ({
  isOpen,
  onClose,
  cursos,
  onDescargar,
  isGenerating
}) => {
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (cursos.length === 1) {
        setSelectedCursoId(cursos[0].id);
      } else {
        setSelectedCursoId(null);
      }
    }
  }, [isOpen, cursos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const handleDescargarClick = async () => {
    if (!selectedCursoId || isGenerating) return;
    await onDescargar(selectedCursoId);
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      {/* Fondo oscurecido */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={() => { if (!isGenerating) onClose(); }} 
      />

      {/* Tarjeta modal minimalista */}
      <div className="relative bg-white rounded-2xl border border-(--border-soft) shadow-xl w-full max-w-sm p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera limpia */}
        <div className="flex items-center justify-between pb-3 border-b border-(--border-soft)">
          <h3 className="text-base font-black text-(--ink) uppercase tracking-wide">
            Descargar QR
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="text-(--ink-soft) hover:text-(--ink) p-1 rounded-lg hover:bg-(--linen)/50 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selector de curso */}
        <div className="py-5">
          <label 
            htmlFor="qr-curso-select" 
            className="block text-xs font-bold text-(--ink-soft) mb-2 uppercase tracking-wider"
          >
            Seleccionar curso
          </label>
          <select
            id="qr-curso-select"
            value={selectedCursoId ?? ''}
            onChange={e => setSelectedCursoId(e.target.value ? Number(e.target.value) : null)}
            disabled={isGenerating || cursos.length === 0}
            className="w-full px-3.5 py-2.5 bg-(--background) border border-(--border-soft) rounded-xl text-xs font-semibold text-(--ink) focus:bg-white focus:border-(--primary) outline-none transition-all cursor-pointer disabled:opacity-50"
          >
            <option value="">
              {cursos.length === 0 ? 'No hay cursos asignados' : 'Seleccionar curso...'}
            </option>
            {cursos.map(c => {
              const label = `${c.grado || ''} ${c.seccion || ''} ${c.asignatura ? `• ${c.asignatura}` : c.nombre ? `• ${c.nombre}` : ''}`.trim();
              return (
                <option key={c.id} value={c.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Acción directa */}
        <button
          type="button"
          onClick={handleDescargarClick}
          disabled={!selectedCursoId || isGenerating}
          className="w-full py-2.5 px-4 bg-(--primary) text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          {isGenerating ? (
            <>
              <Loader2 size={15} className="animate-spin text-white" />
              <span>Generando PDF...</span>
            </>
          ) : (
            <span>Descargar PDF</span>
          )}
        </button>
      </div>
    </div>,
    document.body
  );
};

