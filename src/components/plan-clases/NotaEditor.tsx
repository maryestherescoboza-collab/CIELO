import { useEffect, useRef, useState } from 'react';
import EditorJSModule from '@editorjs/editorjs';
import { getEditorTools } from './editorTools';
import type { EditorJS, EditorOutputData, EditorReadyHandler } from '../../types/editorjs';
import { usePlanClasesStore } from '../../store/planClasesStore';
import { Loader2 } from 'lucide-react';

const EditorJSClass = EditorJSModule as unknown as new (config: Record<string, unknown>) => EditorJS;

interface NotaEditorProps {
  notaId: string;
  readOnly?: boolean;
  onReady?: EditorReadyHandler;
  onSaving?: (isSaving: boolean) => void;
}

export function NotaEditor({
  notaId,
  readOnly = false,
  onReady,
  onSaving
}: NotaEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getNota, updateNotaContenido } = usePlanClasesStore();
  const [loading, setLoading] = useState(true);

  // Refs para evitar que los callbacks disparen el re-render del useEffect
  const onSavingRef = useRef(onSaving);
  const updateNotaContenidoRef = useRef(updateNotaContenido);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onSavingRef.current = onSaving;
    updateNotaContenidoRef.current = updateNotaContenido;
    onReadyRef.current = onReady;
  }, [onSaving, updateNotaContenido, onReady]);

  // Control estricto del ciclo de vida de Editor.js
  useEffect(() => {
    let isMounted = true;
    let editorInstance: EditorJS | null = null;

    const initEditor = async () => {
      // 1. Obtener JSON de Supabase
      setLoading(true);
      const notaDB = await getNota(notaId);
      const initialData = notaDB?.contenido_json 
        ? (notaDB.contenido_json as unknown as EditorOutputData) 
        : undefined;
      
      if (!isMounted) return;

      // 2. Asegurar que el contenedor DOM existe
      if (!containerRef.current) return;

      // 3. Crear instancia única de EditorJS
      editorInstance = new EditorJSClass({
        holder: containerRef.current,
        tools: getEditorTools(),
        data: initialData,
        readOnly,
        placeholder: 'Escribe tu clase…',
        autofocus: !readOnly,
        onChange(api: { saver: { save(): Promise<unknown> } }) {
          if (!isMounted) return;
          
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          
          // Debounce de 1 segundo para evitar guardar en cada pulsación
          saveTimeoutRef.current = setTimeout(async () => {
            if (!isMounted) return;
            try {
              onSavingRef.current?.(true);
              const savedData = (await api.saver.save()) as EditorOutputData;
              if (isMounted) {
                // Actualizar silenciosamente en Supabase/Zustand
                await updateNotaContenidoRef.current(notaId, savedData as any);
                onSavingRef.current?.(false);
              }
            } catch (error) {
              console.error('Error autoguardando:', error);
              if (isMounted) onSavingRef.current?.(false);
            }
          }, 1000);
        },
        onReady() {
          if (isMounted && onReadyRef.current && editorInstance) {
            onReadyRef.current(editorInstance);
          }
        },
      } as Record<string, unknown>);

      editorRef.current = editorInstance;
      setLoading(false);
    };

    initEditor();

    // 4. Ciclo de desmontaje seguro
    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (editorInstance) {
        editorInstance.isReady
          .then(() => {
            try {
              editorInstance?.destroy();
            } catch (e) {
              console.warn('Error destruyendo Editor.js:', e);
            }
          })
          .catch(() => {
            // Silenciar error si isReady falla
          });
      }
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notaId, readOnly, getNota]);

  return (
    <div className="relative min-h-75">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <Loader2 className="animate-spin text-[#689C63]" size={32} />
        </div>
      )}
      <div ref={containerRef} className="cielo-editorjs" />
    </div>
  );
}
