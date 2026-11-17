import { supabase } from './supabase';

export interface PublicacionFicha {
    id: string;
    notaId: string;
    cursoId: number;
    asignatura: string;
    actividadId: number | null;
    requiereProducto: boolean;
    estado: 'borrador' | 'publicada' | 'archivada' | 'revision_requerida';
    publishedAt: string;
    cursoNombre?: string;
    cursoGrado?: string;
    cursoSeccion?: string;
    actividadNombre?: string;
}

export interface EntradaPublicacionWizard {
    cursoId: number;
    asignatura: string;
    actividadId: number; // Obligatorio: cada publicación debe vincularse a una actividad existente
    requiereProducto: boolean;
    productoTexto?: string | null;
}

export interface ActividadExistenteCompatible {
    id: number;
    nombre: string;
    fecha: string;
    periodo: string;
    indicador: string | null;
    producto: string | null;
    requiere_producto: boolean;
}

export const publicacionesApi = {
    /**
     * Obtiene las publicaciones activas de una ficha.
     */
    async listarPorFicha(notaId: string): Promise<PublicacionFicha[]> {
        const { data, error } = await supabase
            .from('ficha_publicaciones')
            .select(`
                id,
                nota_id,
                curso_id,
                asignatura,
                actividad_id,
                requiere_producto,
                estado,
                published_at,
                cursos:curso_id (nombre, grado, seccion),
                actividades:actividad_id (nombre)
            `)
            .eq('nota_id', notaId)
            .order('published_at', { ascending: false });

        if (error) {
            console.error('[PUBLICACIONES] Error listando:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            notaId: row.nota_id,
            cursoId: row.curso_id,
            asignatura: row.asignatura,
            actividadId: row.actividad_id,
            requiereProducto: row.requiere_producto,
            estado: row.estado,
            publishedAt: row.published_at,
            cursoNombre: row.cursos?.nombre,
            cursoGrado: row.cursos?.grado,
            cursoSeccion: row.cursos?.seccion,
            actividadNombre: row.actividades?.nombre,
        }));
    },

    /**
     * Obtiene actividades existentes que coincidan estrictamente con:
     * - El curso seleccionado
     * - La asignatura seleccionada
     * - El período seleccionado (P1, P2, P3 o P4)
     * - Activas (activo IS NOT FALSE)
     */
    async obtenerActividadesCompatibles(
        cursoId: number,
        asignatura: string,
        periodo: string
    ): Promise<ActividadExistenteCompatible[]> {
        const { data, error } = await supabase
            .from('actividades')
            .select('id, nombre, fecha, periodo, indicador, producto, requiere_producto, asignatura')
            .eq('curso_id', cursoId)
            .eq('periodo', periodo)
            .eq('activo', true)
            .order('fecha', { ascending: false, nullsFirst: false });

        if (error) {
            console.error('[PUBLICACIONES] Error obteniendo actividades compatibles:', error);
            return [];
        }

        // Filtro estricto por asignatura
        const norm = (s?: string | null) => (s || '').trim().toLowerCase().replace(/[\s_:-]/g, '');
        const targetNorm = norm(asignatura);

        return (data || [])
            .filter((a: any) => {
                if (!a.asignatura) return true; // Actividades generales del curso
                const actNorm = norm(a.asignatura);
                return actNorm === targetNorm || actNorm.includes(targetNorm) || targetNorm.includes(actNorm);
            })
            .map((a: any) => ({
                id: a.id,
                nombre: a.nombre,
                fecha: a.fecha,
                periodo: a.periodo,
                indicador: a.indicador || null,
                producto: a.producto || null,
                requiere_producto: a.requiere_producto ?? false,
            }));
    },

    /**
     * Publica una ficha vinculando actividades existentes por cada curso/asignatura.
     * NUNCA crea actividades nuevas ni altera los atributos pedagógicos de las existentes.
     */
    async sincronizarPublicaciones(
        notaId: string,
        entradas: EntradaPublicacionWizard[],
        usuarioId: string
    ): Promise<void> {
        // 1. Obtener publicaciones actuales
        const { data: actuales, error: errFetch } = await supabase
            .from('ficha_publicaciones')
            .select('id, curso_id, asignatura')
            .eq('nota_id', notaId);

        if (errFetch) throw errFetch;

        const actualesMap = new Map((actuales || []).map(a => [`${a.curso_id}_${a.asignatura}`, a.id]));
        const entradasMap = new Map(entradas.map(e => [`${e.cursoId}_${e.asignatura}`, e]));

        // 2. Eliminar las que ya no están
        const idsAEliminar: string[] = [];
        actualesMap.forEach((id, key) => {
            if (!entradasMap.has(key)) idsAEliminar.push(id);
        });

        if (idsAEliminar.length > 0) {
            const { error: errDel } = await supabase
                .from('ficha_publicaciones')
                .delete()
                .in('id', idsAEliminar);
            if (errDel) throw errDel;
        }

        // 3. Insertar o actualizar publicaciones en ficha_publicaciones
        const filas = entradas.map(e => ({
            nota_id: notaId,
            curso_id: e.cursoId,
            asignatura: e.asignatura,
            actividad_id: e.actividadId,
            requiere_producto: e.requiereProducto,
            estado: 'publicada' as const,
            published_by: usuarioId,
            updated_at: new Date().toISOString(),
        }));

        if (filas.length > 0) {
            const { error: errUpsert } = await supabase
                .from('ficha_publicaciones')
                .upsert(filas, { onConflict: 'nota_id,curso_id,asignatura' });
            if (errUpsert) throw errUpsert;

            // 4. Vincular plan_ficha_id y requiere_producto en las actividades seleccionadas
            // SIN alterar nombre, fecha, periodo, competencias ni indicadores
            for (const ent of entradas) {
                const patch: Record<string, any> = {
                    plan_ficha_id: notaId,
                    requiere_producto: ent.requiereProducto,
                };
                if (ent.requiereProducto && ent.productoTexto && ent.productoTexto.trim()) {
                    patch.producto = ent.productoTexto.trim();
                }
                await supabase
                    .from('actividades')
                    .update(patch)
                    .eq('id', ent.actividadId);
            }
        }
    },
};
