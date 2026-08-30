const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const CIELO_FOLDER = 'CIELO';
const REGISTRO_FOLDER = 'Registro anecdótico';
const CAPTURAS_FOLDER = 'Capturas de plantillas';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (tokenResponse: { access_token: string; expires_in: number; token_type: string; scope: string }) => void;
                        error_callback?: (err: { type: string; message?: string }) => void;
                    }) => {
                        requestAccessToken: (opts?: { prompt?: string }) => void;
                    };
                };
            };
        };
    }
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

function headers(token: string) {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function findChildFolder(token: string, parentId: string, name: string): Promise<string | null> {
    const q = encodeURIComponent(
        `'${parentId}' in parents and name='${name}' and mimeType='${FOLDER_MIME}' and trashed=false`
    );
    const res = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name)&pageSize=1`, {
        headers: headers(token),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.files?.[0]?.id ?? null;
}

async function createFolder(token: string, name: string, parentId: string): Promise<string> {
    const res = await fetch(`${DRIVE_API}/files`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
            name,
            mimeType: FOLDER_MIME,
            parents: [parentId],
        }),
    });
    if (!res.ok) throw new Error(`Error creando carpeta "${name}"`);
    const data = await res.json();
    return data.id;
}

async function ensureChildFolder(token: string, parentId: string, name: string): Promise<string> {
    const existing = await findChildFolder(token, parentId, name);
    if (existing) return existing;
    return createFolder(token, name, parentId);
}

async function getRootFolderId(token: string): Promise<string> {
    const res = await fetch(`${DRIVE_API}/files?fields=files(id,name)&q=${encodeURIComponent(
        `name='${CIELO_FOLDER}' and mimeType='${FOLDER_MIME}' and 'root' in parents and trashed=false`
    )}&pageSize=1`, {
        headers: headers(token),
    });
    if (!res.ok) throw new Error('Error buscando carpeta CIELO en Drive');
    const data = await res.json();
    if (data.files?.[0]?.id) return data.files[0].id;
    return createFolder(token, CIELO_FOLDER, 'root');
}

export async function getCIELOFolderId(token: string): Promise<string> {
    const rootId = await getRootFolderId(token);
    return ensureChildFolder(token, rootId, REGISTRO_FOLDER);
}

export async function getCapturasFolderId(token: string): Promise<string> {
    const rootId = await getRootFolderId(token);
    return ensureChildFolder(token, rootId, CAPTURAS_FOLDER);
}

export function requestGoogleAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            reject(new Error('VITE_GOOGLE_CLIENT_ID no está configurado. Agrega tu Client ID de Google en el archivo .env'));
            return;
        }
        if (!window.google?.accounts?.oauth2) {
            reject(new Error('La librería de Google Identity Services no se ha cargado. Verifica tu conexión a internet.'));
            return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (tokenResponse) => {
                cachedAccessToken = tokenResponse.access_token;
                tokenExpiresAt = Date.now() + tokenResponse.expires_in * 1000;
                resolve(tokenResponse.access_token);
            },
            error_callback: (err) => {
                reject(new Error(err.message || 'No se pudo completar la autenticación con Google'));
            },
        });
        client.requestAccessToken({ prompt: 'consent' });
    });
}

export function requestSilentToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId || !window.google?.accounts?.oauth2) {
            reject(new Error('GIS not ready'));
            return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (tokenResponse) => {
                cachedAccessToken = tokenResponse.access_token;
                tokenExpiresAt = Date.now() + tokenResponse.expires_in * 1000;
                resolve(tokenResponse.access_token);
            },
            error_callback: () => reject(new Error('Silent auth failed')),
        });
        client.requestAccessToken({ prompt: 'none' });
    });
}

export function getStoredToken(): string | null {
    if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
        return cachedAccessToken;
    }
    return null;
}

export function clearStoredToken() {
    cachedAccessToken = null;
    tokenExpiresAt = 0;
}

export async function isDriveConnected(): Promise<boolean> {
    const token = getStoredToken();
    if (!token) return false;
    try {
        const res = await fetch(`${DRIVE_API}/about?fields=user`, { headers: headers(token) });
        return res.ok;
    } catch {
        clearStoredToken();
        return false;
    }
}

export async function getDriveUserEmail(token: string): Promise<string> {
    const res = await fetch(`${DRIVE_API}/about?fields=user(displayName,emailAddress)`, { headers: headers(token) });
    if (!res.ok) throw new Error('No se pudo obtener información de la cuenta');
    const data = await res.json();
    return data.user?.emailAddress || '';
}

export async function uploadToDrive(
    blob: Blob,
    fileName: string,
    folderId: string,
    token: string,
    existingFileId?: string
): Promise<{ fileId: string; thumbnailLink: string }> {
    const metadata = existingFileId ? {} : { name: fileName, parents: [folderId] };
    const method = existingFileId ? 'PATCH' : 'POST';
    const url = existingFileId 
        ? `${UPLOAD_API}/files/${existingFileId}?uploadType=multipart&fields=id,thumbnailLink`
        : `${UPLOAD_API}/files?uploadType=multipart&fields=id,thumbnailLink`;

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: form });

    if (!res.ok) {
        const errBody = await res.text();
        console.error('[GoogleDrive] Upload error:', res.status, errBody);
        throw new Error(`Error subiendo imagen a Google Drive (${res.status})`);
    }

    const data = await res.json();
    return { fileId: data.id, thumbnailLink: data.thumbnailLink || '' };
}

export async function deleteFileFromDrive(fileId: string, token: string): Promise<void> {
    await fetch(`${DRIVE_API}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

export function getDriveViewUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
}

export function buildOriginalUrl(imagenUrl: string, driveFileId?: string): string {
    if (driveFileId) return getDriveViewUrl(driveFileId);
    return imagenUrl;
}

const thumbnailMetadataCache = new Map<string, string | null>();
const thumbnailBlobCache = new Map<string, string>();

export async function fetchFileThumbnailLink(fileId: string, token: string): Promise<string | null> {
    const cached = thumbnailMetadataCache.get(fileId);
    if (cached !== undefined) return cached;

    const url = `${DRIVE_API}/files/${fileId}?fields=thumbnailLink`;
    try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
            thumbnailMetadataCache.set(fileId, null);
            return null;
        }
        const data = await res.json();
        const link = data.thumbnailLink || null;
        thumbnailMetadataCache.set(fileId, link);
        return link;
    } catch {
        thumbnailMetadataCache.set(fileId, null);
        return null;
    }
}

export async function fetchThumbnailBlob(fileId: string, token: string): Promise<string | null> {
    const cached = thumbnailBlobCache.get(fileId);
    if (cached) return cached;

    const url = `${DRIVE_API}/files/${fileId}?alt=media`;
    try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) return null;
        const blobUrl = URL.createObjectURL(blob);
        thumbnailBlobCache.set(fileId, blobUrl);
        return blobUrl;
    } catch {
        return null;
    }
}
