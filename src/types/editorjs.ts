/**
 * Tipos mínimos de CIELO para Editor.js.
 *
 * El paquete @editorjs/editorjs emite tipos que usan sintaxis `enum` no
 * compatible con la configuración `erasableSyntaxOnly` de este proyecto.
 * En lugar de arrastrar su grafo de tipos interno (que rompe `tsc`), CIELO
 * define aquí una superficie tipada mínima que describe únicamente las
 * porciones del API que utiliza la nota de clase.
 *
 * El JSON que se guarda sigue siendo el formato nativo de Editor.js.
 */

export interface EditorBlockData {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  tunes?: Record<string, unknown>;
}

export interface EditorOutputData {
  time?: number;
  version?: string;
  blocks: EditorBlockData[];
}

/** API mínima de Editor.js que consume la Nota de clase. */
export interface EditorJS {
  destroy(): void;
  save(): Promise<EditorOutputData>;
  isReady: Promise<boolean>;
  blocks: {
    render(data: EditorOutputData): Promise<void>;
    clear(): Promise<void>;
  } | null;
}

/** Callback de cambio de Editor.js (recibe el JSON guardado). */
export type EditorChangeHandler = (data: EditorOutputData) => void;

/** Callback cuando Editor.js está listo. */
export type EditorReadyHandler = (editor: EditorJS) => void;
