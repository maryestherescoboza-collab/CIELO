import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export function useProfileActions() {
    const session = useAppStore(s => s.session);
    const setState = useAppStore(s => s.setAppState);

    const handleUpdateBio = useCallback(async (bio: string) => {
        if (!session?.user?.id) return;
        setState(s => {
            const updatedPerfiles = s.perfiles.map(p => {
                if (p.userId === session.user.id) {
                    return { ...p, bio };
                }
                return p;
            });
            return { ...s, perfilBio: bio, perfiles: updatedPerfiles };
        });
        const { error } = await supabase.from('perfiles').upsert({ user_id: session.user.id, bio });
        if (error) console.error('Error updating bio:', error);
    }, [session, setState]);

    const handleUploadAvatar = useCallback(async (file: File): Promise<string | null> => {
        if (!session?.user?.id) return null;
        const ext = file.name.split('.').pop();
        const path = `${session.user.id}/avatar.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
        if (error) { console.error('Avatar upload error:', error); return null; }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        const url = urlData?.publicUrl || null;
        if (url) {
            setState(s => {
                const updatedPerfiles = s.perfiles.map(p => {
                    if (p.userId === session.user.id) {
                        return { ...p, avatarUrl: url };
                    }
                    return p;
                });
                return { ...s, perfilAvatarUrl: url, perfiles: updatedPerfiles };
            });
            await supabase.from('perfiles').upsert({ user_id: session.user.id, avatar_url: url });
        }
        return url;
    }, [session, setState]);

    const handleUpdateProfessionalProfile = useCallback(async (instituto: string, tipo: 'publica' | 'privada', asignaturas: string[]) => {
        if (!session?.user?.id) return;

        const stateObj = useAppStore.getState().state;
        const currentProfile = stateObj.perfiles.find(p => p.userId === session.user.id);

        let finalCentroId: string | null = null;
        let finalCentroObj: any = currentProfile?.centro;

        if (currentProfile?.centro_id) {
            finalCentroId = currentProfile.centro_id;
            await supabase.from('centros').update({ nombre: instituto }).eq('id', finalCentroId);
            if (finalCentroObj) {
                finalCentroObj = { ...finalCentroObj, nombre: instituto };
            }
        } else {
            const { data: existingCentros } = await supabase.from('centros').select('id, nombre');
            const normalizedInput = instituto.trim().replace(/\s+/g, ' ');
            const matchedCentro = existingCentros?.find(
              c => c.nombre.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedInput.toLowerCase()
            );

            if (matchedCentro) {
                finalCentroId = matchedCentro.id;
                finalCentroObj = {
                    id: matchedCentro.id,
                    nombre: matchedCentro.nombre,
                    codigoCentro: '',
                    tanda: 'Jornada Extendida',
                    telefono: '',
                    distritoEducativo: '',
                    regionalEducacion: '',
                    provincia: '',
                    municipio: '',
                    createdBy: session.user.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            } else {
                const { data: newCentro } = await supabase.from('centros').insert({
                    nombre: normalizedInput,
                    created_by: session.user.id
                }).select('*').single();
                if (newCentro) {
                    finalCentroId = newCentro.id;
                    finalCentroObj = {
                        id: newCentro.id,
                        nombre: newCentro.nombre,
                        codigoCentro: newCentro.codigo_centro || '',
                        tanda: newCentro.tanda || 'Jornada Extendida',
                        telefono: newCentro.telefono || '',
                        distritoEducativo: newCentro.distrito_educativo || '',
                        regionalEducacion: newCentro.regional_educacion || '',
                        provincia: newCentro.provincia || '',
                        municipio: newCentro.municipio || '',
                        createdBy: newCentro.created_by,
                        createdAt: newCentro.created_at,
                        updatedAt: newCentro.updated_at
                    };
                }
            }
        }

        setState(s => {
            const updatedPerfiles = s.perfiles.map(p => {
                if (p.userId === session.user.id) {
                    return {
                        ...p,
                        instituto,
                        tipoInstitucion: tipo,
                        asignaturas,
                        centro_id: finalCentroId || undefined,
                        centro: finalCentroObj || undefined
                    };
                }
                return p;
            });
            return {
                ...s,
                instituto,
                tipoInstitucion: tipo,
                asignaturas,
                perfiles: updatedPerfiles
            };
        });

        await supabase.from('perfiles').upsert({ 
            user_id: session.user.id, 
            id: session.user.id, 
            centro_id: finalCentroId, 
            tipo_institucion: tipo, 
            asignaturas 
        });
    }, [session, setState]);

    const handleUpdateFullProfile = useCallback(async (nombreDocente: string, bioJson: string, centroData: {
        nombre: string;
        codigoCentro: string;
        tanda: string;
        telefono: string;
        distritoEducativo: string;
        regionalEducacion: string;
        provincia: string;
        municipio: string;
    }) => {
        if (!session?.user?.id) return;

        let finalCentroId: string | null = null;
        const stateObj = useAppStore.getState().state;
        const currentProfile = stateObj.perfiles.find(p => p.userId === session.user.id);
        let finalCentroObj: any = null;

        if (currentProfile?.centro_id) {
            finalCentroId = currentProfile.centro_id;
            await supabase.from('centros').update({
                nombre: centroData.nombre,
                codigo_centro: centroData.codigoCentro,
                tanda: centroData.tanda,
                telefono: centroData.telefono,
                distrito_educativo: centroData.distritoEducativo,
                regional_educacion: centroData.regionalEducacion,
                provincia: centroData.provincia,
                municipio: centroData.municipio
            }).eq('id', finalCentroId);
            
            finalCentroObj = {
                id: finalCentroId,
                nombre: centroData.nombre,
                codigoCentro: centroData.codigoCentro,
                tanda: centroData.tanda,
                telefono: centroData.telefono,
                distritoEducativo: centroData.distritoEducativo,
                regionalEducacion: centroData.regionalEducacion,
                provincia: centroData.provincia,
                municipio: centroData.municipio,
                createdBy: currentProfile.centro?.createdBy || session.user.id,
                createdAt: currentProfile.centro?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            const { data: existingCentros } = await supabase.from('centros').select('id, nombre');
            const normalizedInput = centroData.nombre.trim().replace(/\s+/g, ' ');
            const matchedCentro = existingCentros?.find(
              c => c.nombre.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedInput.toLowerCase()
            );

            if (matchedCentro) {
                finalCentroId = matchedCentro.id;
                await supabase.from('centros').update({
                    nombre: matchedCentro.nombre,
                    codigo_centro: centroData.codigoCentro,
                    tanda: centroData.tanda,
                    telefono: centroData.telefono,
                    distrito_educativo: centroData.distritoEducativo,
                    regional_educacion: centroData.regionalEducacion,
                    provincia: centroData.provincia,
                    municipio: centroData.municipio
                }).eq('id', finalCentroId);

                finalCentroObj = {
                    id: finalCentroId,
                    nombre: matchedCentro.nombre,
                    codigoCentro: centroData.codigoCentro,
                    tanda: centroData.tanda,
                    telefono: centroData.telefono,
                    distritoEducativo: centroData.distritoEducativo,
                    regionalEducacion: centroData.regionalEducacion,
                    provincia: centroData.provincia,
                    municipio: centroData.municipio,
                    createdBy: session.user.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            } else {
                const { data: newCentro } = await supabase.from('centros').insert({
                    nombre: normalizedInput,
                    codigo_centro: centroData.codigoCentro,
                    tanda: centroData.tanda,
                    telefono: centroData.telefono,
                    distrito_educativo: centroData.distritoEducativo,
                    regional_educacion: centroData.regionalEducacion,
                    provincia: centroData.provincia,
                    municipio: centroData.municipio,
                    created_by: session.user.id
                }).select('*').single();
                
                if (newCentro) {
                    finalCentroId = newCentro.id;
                    finalCentroObj = {
                        id: newCentro.id,
                        nombre: newCentro.nombre,
                        codigoCentro: newCentro.codigo_centro || '',
                        tanda: newCentro.tanda || 'Jornada Extendida',
                        telefono: newCentro.telefono || '',
                        distritoEducativo: newCentro.distrito_educativo || '',
                        regionalEducacion: newCentro.regional_educacion || '',
                        provincia: newCentro.provincia || '',
                        municipio: newCentro.municipio || '',
                        createdBy: newCentro.created_by,
                        createdAt: newCentro.created_at,
                        updatedAt: newCentro.updated_at
                    };
                }
            }
        }

        setState(s => {
            const updatedPerfiles = s.perfiles.map(p => {
                if (p.userId === session.user.id) {
                    return {
                        ...p,
                        nombreDocente,
                        bio: bioJson,
                        instituto: centroData.nombre,
                        centro_id: finalCentroId || undefined,
                        centro: finalCentroObj || undefined
                    };
                }
                return p;
            });
            return { 
                ...s, 
                nombreDocente, 
                instituto: centroData.nombre, 
                perfilBio: bioJson,
                perfiles: updatedPerfiles
            };
        });

        await supabase.from('perfiles').upsert({ 
            id: session.user.id,
            user_id: session.user.id, 
            nombre_docente: nombreDocente, 
            centro_id: finalCentroId,
            bio: bioJson 
        });
    }, [session, setState]);

    const handleUpdateAvatarColor = useCallback(async (color: string) => {
        if (!session?.user?.id) return;
        setState(s => {
            const updatedPerfiles = s.perfiles.map(p => {
                if (p.userId === session.user.id) {
                    return { ...p, avatarColor: color };
                }
                return p;
            });
            return { ...s, perfilAvatarColor: color, perfiles: updatedPerfiles };
        });
        await supabase.from('perfiles').upsert({ user_id: session.user.id, id: session.user.id, avatar_color: color });
    }, [session, setState]);

    const handleUpdateInstitutoName = useCallback(async (nombre: string) => {
        if (!session?.user?.id) return;

        const stateObj = useAppStore.getState().state;
        const currentProfile = stateObj.perfiles.find(p => p.userId === session.user.id);
        let finalCentroId = currentProfile?.centro_id || null;
        let finalCentroObj = currentProfile?.centro;

        if (currentProfile?.centro_id) {
            await supabase.from('centros').update({ nombre }).eq('id', currentProfile.centro_id);
            if (finalCentroObj) {
                finalCentroObj = { ...finalCentroObj, nombre };
            }
        } else {
            const { data: existingCentros } = await supabase.from('centros').select('id, nombre');
            const normalizedInput = nombre.trim().replace(/\s+/g, ' ');
            const matchedCentro = existingCentros?.find(
              c => c.nombre.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedInput.toLowerCase()
            );

            if (matchedCentro) {
                finalCentroId = matchedCentro.id;
                await supabase.from('centros').update({ nombre: matchedCentro.nombre }).eq('id', finalCentroId);
                finalCentroObj = {
                    id: matchedCentro.id,
                    nombre: matchedCentro.nombre,
                    codigoCentro: '',
                    tanda: 'Jornada Extendida',
                    telefono: '',
                    distritoEducativo: '',
                    regionalEducacion: '',
                    provincia: '',
                    municipio: '',
                    createdBy: session.user.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            } else {
                const { data: newCentro } = await supabase.from('centros').insert({
                    nombre: normalizedInput,
                    created_by: session.user.id
                }).select('*').single();
                if (newCentro) {
                    finalCentroId = newCentro.id;
                    finalCentroObj = {
                        id: newCentro.id,
                        nombre: newCentro.nombre,
                        codigoCentro: newCentro.codigo_centro || '',
                        tanda: newCentro.tanda || 'Jornada Extendida',
                        telefono: newCentro.telefono || '',
                        distritoEducativo: newCentro.distrito_educativo || '',
                        regionalEducacion: newCentro.regional_educacion || '',
                        provincia: newCentro.provincia || '',
                        municipio: newCentro.municipio || '',
                        createdBy: newCentro.created_by,
                        createdAt: newCentro.created_at,
                        updatedAt: newCentro.updated_at
                    };
                }
            }

            await supabase.from('perfiles').upsert({
                id: session.user.id,
                user_id: session.user.id,
                centro_id: finalCentroId
            });
        }

        setState(s => {
            const updatedPerfiles = s.perfiles.map(p => {
                if (p.userId === session.user.id) {
                    return {
                        ...p,
                        instituto: nombre,
                        centro_id: finalCentroId || undefined,
                        centro: finalCentroObj || undefined
                    };
                }
                return p;
            });
            return { ...s, instituto: nombre, perfiles: updatedPerfiles };
        });
    }, [session, setState]);

    return {
        updateBio: handleUpdateBio,
        uploadAvatar: handleUploadAvatar,
        updateProfessionalProfile: handleUpdateProfessionalProfile,
        updateFullProfile: handleUpdateFullProfile,
        updateAvatarColor: handleUpdateAvatarColor,
        updateInstitutoName: handleUpdateInstitutoName
    };
}
