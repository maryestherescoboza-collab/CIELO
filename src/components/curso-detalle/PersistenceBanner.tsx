import React from 'react';

interface Props {
    saveStatus: 'idle' | 'unsaved' | 'saving' | 'verifying' | 'saved' | 'error';
    saveError: string | null;
    isDirty: boolean;
    onRetry?: () => void;
}

export const PersistenceBanner: React.FC<Props> = () => {
    // El banner visual ha sido ocultado definitivamente en la interfaz de usuario.
    // La lógica de persistencia local (IndexedDB/localStorage), el manejo de estados de guardado,
    // la sincronización con Supabase y los mecanismos de reintento permanecen 100% activos e intactos.
    return null;
};
