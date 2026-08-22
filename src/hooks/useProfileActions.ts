import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export function useProfileActions() {
    const session = useAppStore(s => s.session);
    const setState = useAppStore(s => s.setAppState);

    const handleUpdateBio = useCallback(async (bio: string) => {
        if (!session?.user?.id) return;
        
        const { error } = await supabase.from('perfiles').upsert({ user_id: session.user.id, bio });
        if (error) {
            console.error('Error updating bio:', error);
            throw new Error(error.message);
        }

        setState(s => {
            const updatedPerfiles = s.perfiles.map(p => {
                if (p.userId === session.user.id) {
                    return { ...p, bio };
                }
                return p;
            });
            return { ...s, perfilBio: bio, perfiles: updatedPerfiles };
        });
    }, [session, setState]);

    const handleUploadAvatar = useCallback(async (file: File): Promise<string | null> => {
        if (!session?.user?.id) return null;
        const ext = file.name.split('.').pop();
        const path = `${session.user.id}/avatar.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
        if (error) { console.error('Avatar upload error:', error); return null; }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        const url = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;
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

    const updatePerfilProfesional = useCallback(async (tipoInstitucion: 'publica' | 'privada', asignaturas: string[], centroId?: string | null) => {
        if (!session?.user?.id) return;
        const updateData: any = { 
            user_id: session.user.id, 
            tipo_institucion: tipoInstitucion, 
            asignaturas 
        };
        if (centroId !== undefined) {
            updateData.centro_id = centroId;
        }

        const { error: perfilError } = await supabase.from('perfiles').upsert(updateData);
        if (perfilError) throw new Error(perfilError.message);

        setState(s => {
            const updatedPerfiles = s.perfiles.map(p => {
                if (p.userId === session.user.id) {
                    const newP = { ...p, tipoInstitucion, asignaturas };
                    if (centroId !== undefined) {
                        newP.centro_id = centroId || undefined;
                    }
                    return newP;
                }
                return p;
            });
            return {
                ...s,
                tipoInstitucion,
                asignaturas,
                perfiles: updatedPerfiles
            };
        });
    }, [session?.user?.id, setState]);

    const handleUpdateFullProfile = useCallback(async (nombreDocente: string, bio: string) => {
        if (!session?.user?.id) return;

        const { error: perfilError } = await supabase.from('perfiles').upsert({ 
            user_id: session.user.id, 
            nombre: nombreDocente,
            nombre_docente: nombreDocente, 
            bio: bio 
        }, { onConflict: 'user_id' });

        if (perfilError) throw new Error(perfilError.message);

        setState(s => {
            const updatedPerfiles = s.perfiles.map(p => {
                if (p.userId === session.user.id) {
                    return {
                        ...p,
                        nombreDocente,
                        bio: bio
                    };
                }
                return p;
            });
            return { 
                ...s, 
                nombreDocente, 
                perfilBio: bio,
                perfiles: updatedPerfiles
            };
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
        await supabase.from('perfiles').upsert({ user_id: session.user.id, avatar_color: color });
    }, [session, setState]);

    return {
        updateBio: handleUpdateBio,
        uploadAvatar: handleUploadAvatar,
        updateFullProfile: handleUpdateFullProfile,
        updateAvatarColor: handleUpdateAvatarColor,
        updatePerfilProfesional
    };
}
