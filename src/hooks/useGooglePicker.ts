import { getStoredToken } from '../lib/googleDrive';

// Añadimos tipados basicos para google picker si no existen globalmente
declare global {
    interface Window {
        gapi?: {
            load: (apiName: string, config: { callback: () => void; onerror?: () => void }) => void;
        };
    }
}

export interface PickerResult {
    id: string;
    name: string;
    mimeType: string;
    url: string;
    thumbnailUrl?: string;
}

export function useGooglePicker() {
    const openPicker = (folderId: string | null, onSelect: (file: PickerResult) => void, onError?: (err: string) => void) => {
        const token = getStoredToken();
        if (!token) {
            onError?.('SESSION_EXPIRED');
            return;
        }

        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
        if (!apiKey) {
            onError?.('Falta configuración de API de Google Picker (VITE_GOOGLE_API_KEY).');
            return;
        }

        if (!window.gapi) {
            onError?.('La librería de Google APIs no se ha cargado.');
            return;
        }

        window.gapi.load('picker', {
            callback: () => {
                if (!window.google?.picker) {
                    onError?.('Error al inicializar la API del Picker.');
                    return;
                }

                const googlePicker = window.google.picker;

                const view = new googlePicker.DocsView().setIncludeFolders(true);
                if (folderId) {
                    view.setParent(folderId);
                }

                const picker = new googlePicker.PickerBuilder()
                    .addView(view)
                    .setOAuthToken(token)
                    .setDeveloperKey(apiKey)
                    .setCallback((data: any) => {
                        if (data.action === googlePicker.Action.PICKED) {
                            const doc = data.docs[0];
                            onSelect({
                                id: doc.id,
                                name: doc.name,
                                mimeType: doc.mimeType,
                                url: doc.url,
                                thumbnailUrl: doc.thumbnails?.[0]?.url,
                            });
                        }
                    })
                    .build();
                
                picker.setVisible(true);
            },
            onerror: () => {
                onError?.('No se pudo cargar el módulo Picker de Google.');
            }
        });
    };

    return { openPicker };
}
