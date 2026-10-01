/**
 * Tipos de Evidencias.
 *
 * Un solo dominio con dos caras, como el resto del proyecto (Rutas tiene
 * `rutaApiDocente` y `rutaApiPortal` en el mismo archivo): el estudiante
 * construye su portafolio y el docente revisa la bandeja del curso. Las
 * projections vienen de las RPC, que resuelven actividad, ficha y nombre del
 * estudiante en SQL para que la UI no tenga que hacer joins sueltos.
 */

export type EvidenciaEstado = 'pendiente' | 'revisada';
export type EvidenciaOrigen = 'storage' | 'drive';

export interface EvidenciaPortafolio {
    id: number;
    nombre: string;
    descripcion: string | null;
    estado: EvidenciaEstado;
    sello: number | null;
    created_at: string;
    updated_at: string;
    origen: EvidenciaOrigen;
    storage_path: string | null;
    drive_url: string | null;
    thumbnail_url: string | null;
    mime_type: string | null;
    tamano_bytes: number | null;
    comentario: string | null;
    revisado_at: string | null;
    actividad_id: number;
    actividad: string;
    actividad_fecha: string | null;
    periodo: string | null;
    asignatura: string | null;
    ficha_id: string | null;
    ficha: string | null;
}

export interface ActividadParaEvidencia {
    actividad_id: number;
    actividad: string;
    fecha: string | null;
    periodo: string | null;
    asignatura: string | null;
    ficha_id: string | null;
    ficha: string | null;
    evidencias: number;
}

/**
 * Una entrega ya hecha por el estudiante. Es una fila de `evidencias`, la
 * misma tabla que llena el Portafolio y la bandeja del docente: no hay un
 * segundo sitio donde viva el producto.
 */
export interface ProductoFichaEntrega {
    id: number;
    nombre: string;
    origen: EvidenciaOrigen;
    created_at: string;
    drive_url: string | null;
    storage_path: string | null;
}

/**
 * Actividad de la ficha que el docente marcó con "Solicitar subir producto"
 * (`actividades.requiere_producto`). La devuelve `portal_get_ficha_detalle`
 * junto con si el estudiante ya entregó, para que la Ficha en el Portal pueda
 * decir "entregado" sin pedir nada fuera de ella.
 */
export interface ActividadProductoFicha {
    actividad_id: number;
    actividad: string;
    asignatura: string | null;
    fecha: string | null;
    periodo: string | null;
    indicador: string | null;
    producto: string | null;
    requiere_producto: true;
    entregado: boolean;
    entregas: ProductoFichaEntrega[];
}

export interface EvidenciaDocente extends Omit<EvidenciaPortafolio, 'actividad' | 'ficha' | 'updated_at' | 'periodo' | 'asignatura' | 'descripcion' | 'comentario' | 'thumbnail_url'> {
    comentario: string | null;
    thumbnail_url: string | null;
    estudiante_id: number;
    estudiante: string;
    numero_lista: number | null;
    estudiante_avatar_color: string | null;
}

export interface GrupoBandeja {
    actividad_id: number;
    actividad: string;
    fecha: string | null;
    periodo: string | null;
    asignatura: string | null;
    ficha_id: string | null;
    ficha: string | null;
    total: number;
    pendientes: number;
    revisadas: number;
    evidencias: EvidenciaDocente[];
}

export interface CursoConEvidencias {
    curso_id: number;
    grado: string | null;
    seccion: string | null;
    periodo: string | null;
    color: string | null;
    asignaturas: string[];
    pendientes: number;
}

/** Filtros de la bandeja. No inventamos estados nuevos: los dos son los de la tabla. */
export type FiltroBandeja = 'todas' | 'pendiente' | 'revisada';
