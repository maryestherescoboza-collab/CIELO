/**
 * Tipos del módulo "Plan de clases" (CIELO).
 *
 * Separación de responsabilidades:
 *  - Editor.js  → contenido y bloques de la nota (NotaContenido)
 *  - CIELO      → usuario, permisos, compartir, comentarios y guardado.
 *
 * Los comentarios y permisos NUNCA se acoplan al JSON del editor: viven en
 * capas independientes (NotaComentario / NotaCompartida) referenciando la nota.
 */

/** JSON nativo de Editor.js (abierto para render/save). */
export interface NotaContenido {
  time?: number;
  version?: string;
  blocks: {
    id?: string;
    type: string;
    data: Record<string, unknown>;
    tunes?: Record<string, unknown>;
  }[];
}

export type PermisoClase = 'ver' | 'comentar' | 'editar';

export interface NotaCompartida {
  id: string;
  /** userId del docente con quien se compartió (si es usuario interno). */
  userId?: string;
  /** correo (futuro destino o usuario externo). */
  correo?: string;
  nombre?: string;
  permiso: PermisoClase;
  agregadaEn: string;
}

export interface NotaComentarioRespuesta {
  id: string;
  autorId: string;
  autorNombre: string;
  autorAvatarColor?: string;
  /** true si el autor es el dueño / docente de la nota. */
  esAutor?: boolean;
  texto: string;
  creadoEn: string;
}

export interface NotaComentario {
  id: string;
  /** id del bloque de Editor.js al que se asocia (opcional). */
  bloqueId?: string;
  autorId: string;
  autorNombre: string;
  autorAvatarColor?: string;
  esAutor?: boolean;
  texto: string;
  creadoEn: string;
  resuelto: boolean;
  respuestas: NotaComentarioRespuesta[];
}

export interface NotaClase {
  id: string;
  titulo: string;
  contenido: NotaContenido;
  autorId: string;
  autorNombre?: string;
  autorAvatarColor?: string;
  curso?: string;
  fecha?: string;
  duracion?: string;
  estado: 'borrador' | 'guardada' | 'compartida';
  compartidaCon: NotaCompartida[];
  creadoEn: string;
  actualizadoEn: string;
}

/* ─────────────────────────────────────────────────────────────────
   Nuevos Modelos de Supabase (Plan de clases v2)
   ───────────────────────────────────────────────────────────────── */

export interface SecuenciaDB {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion?: string | null;
  estado: string;
  creado_en: string;
  actualizado_en: string;
  curso_id?: number | null;
  grado?: string | null;
}

export interface NotaDB {
  id: string;
  secuencia_id: string;
  usuario_id: string;
  titulo: string;
  orden: number;
  contenido_json: any;
  metadata_json: any;
  creado_en: string;
  actualizado_en: string;
}