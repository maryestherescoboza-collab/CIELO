import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Post, ResourceData, Plantilla, Secuencia } from '../types';

export function usePostActions() {
    const state = useAppStore(s => s.state);
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);
    const setGenericToast = useAppStore(s => s.setGenericToast);

    const reportPost = useCallback(async (postId: number, razon: string, comentario?: string) => {
        if (!session?.user?.id) return;
        
        const { error } = await supabase.from('reportes_comunidad').insert({
            post_id: postId,
            reporter_id: session.user.id,
            razon,
            comentario,
            estado: 'pendiente'
        });

        if (error) {
           console.error('Error reporting post:', error);
           setGenericToast({ message: 'Error al enviar reporte', type: 'warning' });
           setTimeout(() => setGenericToast(null), 3000);
        } else {
           setGenericToast({ message: 'Post reportado correctamente', type: 'success' });
           setTimeout(() => setGenericToast(null), 3000);
        }
    }, [session, setGenericToast]);

    const addPost = useCallback(async (newPost: { contenido: string; tipo: Post['tipo']; asignatura: string; recursoId?: number; recursoDatos?: ResourceData }): Promise<number | undefined> => {
        const currentSession = session;
        if (!currentSession?.user?.id) return;
        
        const tempId = Date.now();
        const tempPost: Post = {
            id: tempId,
            autor: state.nombreDocente || 'Docente',
            cargo: state.cursos[0]?.asignatura ?? 'Docente',
            avatarUrl: state.perfilAvatarUrl || '',
            contenido: newPost.contenido,
            tipo: newPost.tipo,
            asignatura: newPost.asignatura,
            recursoId: newPost.recursoId,
            recursoDatos: newPost.recursoDatos,
            userId: currentSession.user.id,
            fechaPublicacion: new Date().toISOString(),
            tiempo: 'Publicando...',
            isOptimistic: true 
        } as Post;
        
        setState(s => ({ ...s, posts: [tempPost, ...s.posts] }));

        try {
            let recursoDatosToSave: any = null;

            if (newPost.recursoId || newPost.tipo === 'recurso') {
                if (newPost.tipo === 'rubrica' && newPost.recursoId) {
                    const plantilla = state.plantillas.find(p => p.id === newPost.recursoId);
                    if (plantilla) {
                        const COMPETENCIAS = [
                            { nombre: 'BC1', bc: 'BC1' },
                            { nombre: 'BC2', bc: 'BC2' },
                            { nombre: 'BC3', bc: 'BC3' },
                            { nombre: 'BC4', bc: 'BC4' },
                        ];
                        const descriptorsToSnapshot = COMPETENCIAS.map((competencia) => {
                            const current = state.descriptoresRubrica.find(
                                d => d.plantillaId === newPost.recursoId && d.bc === competencia.bc
                            );
                            return {
                                id: current?.id || `competencia-${competencia.bc}`,
                                bc: competencia.bc,
                                indicador: competencia.nombre,
                                estrategico: current?.estrategico ?? '',
                                autonomo: current?.autonomo ?? '',
                                resolutivo: current?.resolutivo ?? '',
                                receptivo: current?.receptivo ?? '',
                                plantillaId: null
                            };
                        });
                        recursoDatosToSave = {
                            ...(typeof plantilla.datos === 'object' ? plantilla.datos : {}),
                            nombre: plantilla.nombre,
                            descriptores: descriptorsToSnapshot
                        };
                    }
                } else if (newPost.tipo === 'cotejo' && newPost.recursoId) {
                    const plantilla = state.plantillas.find(p => p.id === newPost.recursoId);
                    if (plantilla) {
                        const rawDatos = typeof plantilla.datos === 'string' ? JSON.parse(plantilla.datos) : plantilla.datos;
                        const critIds = rawDatos?.criterios?.map((c: any) => c.id) || [];
                        let fullCriterios: any[] = [];
                        if (critIds.length > 0) {
                            const { data: criteriaData } = await supabase
                                .from('criterios_cotejo')
                                .select('id, descripcion, user_id')
                                .in('id', critIds);
                            if (criteriaData) {
                                fullCriterios = criteriaData;
                            }
                        }
                        recursoDatosToSave = {
                            ...(typeof rawDatos === 'object' ? rawDatos : {}),
                            nombre: plantilla.nombre,
                            criterios: fullCriterios
                        };
                    }
                } else if (newPost.tipo === 'secuencia' && newPost.recursoId) {
                    const secuencia = state.secuencias.find(s => s.id === newPost.recursoId);
                    if (secuencia) {
                        recursoDatosToSave = {
                            titulo: secuencia.titulo,
                            fechaInicio: secuencia.fechaInicio,
                            contenidoHtml: secuencia.contenidoHtml,
                            archivoUrl: secuencia.archivoUrl,
                            archivoNombre: secuencia.archivoNombre,
                            archivoSize: secuencia.archivoSize,
                            archivoTipo: secuencia.archivoTipo,
                            archivoFechaCarga: secuencia.archivoFechaCarga
                        };
                    }
                } else if (newPost.tipo === 'recurso') {
                    recursoDatosToSave = newPost.recursoDatos || null;
                }
            }

            const { data, error } = await supabase.from('posts').insert([{
                autor: state.nombreDocente || 'Docente',
                cargo: state.cursos[0]?.asignatura ?? 'Docente',
                contenido: newPost.contenido,
                tipo: newPost.tipo,
                asignatura: newPost.asignatura,
                user_id: currentSession.user.id,
                recurso_id: newPost.recursoId,
                recurso_datos: recursoDatosToSave
            }]).select();

            if (error) throw error;

            if (data && data[0]) {
                const p = data[0];
                const mapped: Post = { 
                    id: p.id,
                    autor: state.nombreDocente || p.autor as string,
                    cargo: p.cargo,
                    avatarUrl: state.perfilAvatarUrl || '',
                    contenido: p.contenido,
                    tiempo: 'Ahora',
                    fechaPublicacion: p.fecha_publicacion,
                    tipo: p.tipo,
                    asignatura: p.asignatura,
                    userId: p.user_id, 
                    recursoId: p.recurso_id, 
                    recursoDatos: p.recurso_datos, 
                    expiresAt: p.expires_at,
                    isOptimistic: false
                };

                setState(s => {
                    const filtered = s.posts.filter(post => post.id !== tempId);
                    const realPostExists = filtered.some(post => post.id === mapped.id);
                    
                    if (realPostExists) return { ...s, posts: filtered };
                    return { ...s, posts: [mapped, ...filtered] };
                });
                
                return data[0].id;
            }
        } catch (err) {
            console.error('Error adding post:', err);
            setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== tempId) }));
        }
    }, [session, state.nombreDocente, state.cursos, state.perfilAvatarUrl, state.plantillas, state.descriptoresRubrica, state.secuencias, setState]);

    const importResource = useCallback(async (tipo: Post['tipo'], resourceData: ResourceData, recursoId?: number) => {
        if (!session?.user?.id) return;
        if (!resourceData && !recursoId) return;

        try {
            if (tipo === 'rubrica') {
                const { data: templateData, error: templateError } = await supabase.from('plantillas').insert([{
                    user_id: session.user.id,
                    tipo: tipo,
                    nombre: `Importado: ${resourceData.nombre || resourceData.titulo || 'Rúbrica'}`,
                    datos: { ...resourceData, descriptores: undefined }
                }]).select();

                if (templateError) throw templateError;
                if (templateData && templateData[0]) {
                    const newPlantillaId = templateData[0].id;
                    const descriptoresList = (resourceData as any).descriptores || [];

                    if (descriptoresList.length > 0) {
                        const descriptoresToInsert = descriptoresList.map((d: any) => ({
                            user_id: session.user.id,
                            plantilla_id: newPlantillaId,
                            bc: d.bc,
                            indicador: d.indicador,
                            estrategico: d.estrategico,
                            autonomo: d.autonomo,
                            resolutivo: d.resolutivo,
                            receptivo: d.receptivo
                        }));
                        const { data: insertedDescs, error: descError } = await supabase
                            .from('descriptores_rubrica')
                            .insert(descriptoresToInsert)
                            .select();
                        if (descError) throw descError;
                        
                        if (insertedDescs) {
                            setState(s => ({
                                ...s,
                                descriptoresRubrica: [...insertedDescs, ...s.descriptoresRubrica]
                            }));
                        }
                    }

                    const newPlantilla: Plantilla = {
                        id: newPlantillaId,
                        tipo: templateData[0].tipo,
                        nombre: templateData[0].nombre,
                        datos: templateData[0].datos,
                        createdAt: templateData[0].created_at
                    };
                    setState(s => ({ ...s, plantillas: [newPlantilla, ...s.plantillas] }));
                    alert('Rúbrica importada exitosamente a tus plantillas locales.');
                }
            } else if (tipo === 'cotejo') {
                const criteriaList = (resourceData as any).criterios || [];
                const insertedCritIds: number[] = [];

                if (criteriaList.length > 0) {
                    const criteriaToInsert = criteriaList.map((c: any) => ({
                        user_id: session.user.id,
                        descripcion: c.descripcion
                    }));
                    const { data: insertedCriteria, error: critError } = await supabase
                        .from('criterios_cotejo')
                        .insert(criteriaToInsert)
                        .select();
                    if (critError) throw critError;
                    if (insertedCriteria) {
                        insertedCriteria.forEach(c => insertedCritIds.push(c.id));
                        setState(s => ({
                            ...s,
                            criteriosCotejo: [...insertedCriteria, ...s.criteriosCotejo]
                        }));
                    }
                }

                const cleanedDatos = {
                    ...resourceData,
                    criterios: insertedCritIds.map(id => ({ id }))
                };

                const { data: templateData, error: templateError } = await supabase.from('plantillas').insert([{
                    user_id: session.user.id,
                    tipo: tipo,
                    nombre: `Importado: ${resourceData.nombre || resourceData.titulo || 'Cotejo'}`,
                    datos: cleanedDatos
                }]).select();

                if (templateError) throw templateError;
                if (templateData && templateData[0]) {
                    const newPlantilla: Plantilla = {
                        id: templateData[0].id,
                        tipo: templateData[0].tipo,
                        nombre: templateData[0].nombre,
                        datos: templateData[0].datos,
                        createdAt: templateData[0].created_at
                    };
                    setState(s => ({ ...s, plantillas: [newPlantilla, ...s.plantillas] }));
                    alert('Cotejo importado exitosamente a tus plantillas locales.');
                }
            } else if (tipo === 'secuencia') {
                const seqDatos = resourceData as Record<string, unknown> | undefined;

                // 1) Obtener la secuencia ORIGINAL publicada: posts.recurso_id -> secuencias.
                //    (RLS permite leerla porque está publicada en Comunidad.)
                let original: Record<string, unknown> | null = null;
                if (recursoId) {
                    const origRes = await supabase
                        .from('secuencias')
                        .select('titulo, curso_id, fecha_inicio, contenido_html, archivo_url, archivo_nombre, archivo_size, archivo_tipo, archivo_fecha_carga')
                        .eq('id', recursoId)
                        .maybeSingle();
                    if (origRes.error) {
                        console.error('[Comunidad] Error al obtener la secuencia original:', origRes.error);
                    } else if (origRes.data) {
                        original = origRes.data as Record<string, unknown>;
                    }
                }

                // contenido_html se conserva ÍNTEGRO (nunca se resumen ni se convierten a texto).
                const contenidoHtml = String(
                    original?.contenido_html ?? seqDatos?.contenidoHtml ?? seqDatos?.contenido_html ?? ''
                );
                const titulo = String(
                    original?.titulo ?? seqDatos?.titulo ?? resourceData?.nombre ?? 'Planificación importada'
                );
                const fechaInicio = String(
                    original?.fecha_inicio ?? seqDatos?.fechaInicio ?? new Date().toISOString().split('T')[0]
                );

                // 2) Crear NUEVA fila para el usuario receptor (user_id = B).
                //    El recurso original de A permanece intacto.
                const cursoIdB = Number(state.cursos[0]?.id ?? 0);
                const { data: insertedSeq, error: seqError } = await supabase
                    .from('secuencias')
                    .insert([{
                        user_id: session.user.id,
                        titulo,
                        curso_id: cursoIdB,
                        fecha_inicio: fechaInicio,
                        contenido_html: contenidoHtml,
                        estado: 'Pendiente',
                        activo: true
                    }])
                    .select();

                if (seqError) throw seqError;
                if (insertedSeq && insertedSeq[0]) {
                    const mappedSeq: Secuencia = {
                        id: insertedSeq[0].id,
                        titulo: insertedSeq[0].titulo,
                        cursoId: insertedSeq[0].curso_id ?? cursoIdB,
                        fechaInicio: insertedSeq[0].fecha_inicio,
                        contenidoHtml: insertedSeq[0].contenido_html || '',
                        estado: insertedSeq[0].estado || 'Pendiente',
                        archivoUrl: insertedSeq[0].archivo_url,
                        archivoNombre: insertedSeq[0].archivo_nombre,
                        archivoSize: insertedSeq[0].archivo_size,
                        archivoTipo: insertedSeq[0].archivo_tipo,
                        archivoFechaCarga: insertedSeq[0].archivo_fecha_carga
                    };
                    setState(s => ({ ...s, secuencias: [...s.secuencias, mappedSeq] }));
                    alert('Planificación importada exitosamente a tus recursos.');
                }
            }
        } catch (err) {
            console.error('Error importing resource:', err);
            alert('Hubo un error al intentar incorporar el recurso.');
        }
    }, [session, state.cursos, setState]);

    const deletePost = useCallback(async (postId: number) => {
        if (!session?.user?.id) return false;
        
        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .match({ id: postId, user_id: session.user.id });

            if (error) {
                console.error('Error deleting post:', error);
                setGenericToast({ message: 'Error al eliminar la publicación', type: 'error' });
                setTimeout(() => setGenericToast(null), 3000);
                return false;
            }

            setState(s => ({
                ...s,
                posts: s.posts.filter(p => p.id !== postId)
            }));

            setGenericToast({ message: 'Publicación eliminada correctamente', type: 'success' });
            setTimeout(() => setGenericToast(null), 3000);
            return true;
        } catch (err) {
            console.error('Error deleting post:', err);
            setGenericToast({ message: 'Error al eliminar la publicación', type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return false;
        }
    }, [session, setState, setGenericToast]);

    return {
        reportPost,
        addPost,
        importResource,
        deletePost
    };
}
