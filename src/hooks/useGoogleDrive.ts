import { useState, useEffect, useCallback } from 'react';
import {
    requestGoogleAccessToken,
    requestSilentToken,
    getStoredToken,
    clearStoredToken,
    isDriveConnected,
    getDriveUserEmail,
    getCIELOFolderId,
    getCapturasFolderId,
    uploadToDrive,
    deleteFileFromDrive,
    fetchFileThumbnailLink,
    fetchThumbnailBlob,
    getDriveViewUrl,
} from '../lib/googleDrive';

export interface GoogleDriveState {
    isConnected: boolean;
    isConnecting: boolean;
    email: string;
    error: string;
}

export function useGoogleDrive() {
    const [state, setState] = useState<GoogleDriveState>({
        isConnected: false,
        isConnecting: false,
        email: '',
        error: '',
    });

    useEffect(() => {
        (async () => {
            const connected = await isDriveConnected();
            if (connected) {
                const token = getStoredToken();
                let email = '';
                if (token) {
                    try { email = await getDriveUserEmail(token); } catch { /* ignore */ }
                }
                setState({ isConnected: true, isConnecting: false, email, error: '' });
                return;
            }

            try {
                const token = await requestSilentToken();
                const email = await getDriveUserEmail(token);
                setState({ isConnected: true, isConnecting: false, email, error: '' });
            } catch {
                // Silent auth failed — user needs to click "Conectar Google Drive"
            }
        })();
    }, []);

    const connect = useCallback(async () => {
        setState(s => ({ ...s, isConnecting: true, error: '' }));
        try {
            const token = await requestGoogleAccessToken();
            const email = await getDriveUserEmail(token);
            setState({ isConnected: true, isConnecting: false, email, error: '' });
        } catch (err: any) {
            setState(s => ({ ...s, isConnecting: false, error: err.message || 'Error conectando con Google Drive' }));
        }
    }, []);

    const disconnect = useCallback(() => {
        clearStoredToken();
        setState({ isConnected: false, isConnecting: false, email: '', error: '' });
    }, []);

    const ensureCIELOFolder = useCallback(async (): Promise<string> => {
        const token = getStoredToken();
        if (!token) throw new Error('Google Drive no está conectado. Conéctalo primero.');
        return getCIELOFolderId(token);
    }, []);

    const ensureCapturasFolder = useCallback(async (): Promise<string> => {
        const token = getStoredToken();
        if (!token) throw new Error('Google Drive no está conectado. Conéctalo primero.');
        return getCapturasFolderId(token);
    }, []);

    const uploadImage = useCallback(async (blob: Blob, fileName: string, folderId: string, existingFileId?: string) => {
        const token = getStoredToken();
        if (!token) throw new Error('Google Drive no está conectado. Conéctalo primero.');
        return uploadToDrive(blob, fileName, folderId, token, existingFileId);
    }, []);

    const deleteFile = useCallback(async (fileId: string) => {
        const token = getStoredToken();
        if (!token) return;
        await deleteFileFromDrive(fileId, token);
    }, []);

    const fetchDriveThumbnail = useCallback(async (fileId: string): Promise<string | null> => {
        const token = getStoredToken();
        if (!token) return null;
        const link = await fetchFileThumbnailLink(fileId, token);
        if (link) return link;
        return fetchThumbnailBlob(fileId, token);
    }, []);

    return {
        ...state,
        connect,
        disconnect,
        ensureCIELOFolder,
        ensureCapturasFolder,
        uploadImage,
        deleteFile,
        fetchDriveThumbnail,
        getViewUrl: getDriveViewUrl,
    };
}
