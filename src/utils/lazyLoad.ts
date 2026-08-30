import React from 'react';
import { attemptChunkRecovery } from './chunkRecovery';

/**
 * Sustituto centralizado de React.lazy que conserva el code-splitting y, si el
 * chunk dinámico falla por desincronización de versiones (despliegue), dispara
 * la recuperación global en lugar de mostrar el Error Boundary. Si la recarga
 * ya se ejecutó en esta sesión, propaga el error y el Error Boundary renderiza
 * su vista habitual.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
 * React.lazy exige T extends ComponentType<any>; la inferencia conserva las
 * props reales de cada módulo (se comporta igual que el React.lazy original). */
export function lazyLoad<T extends React.ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
) {
    return React.lazy<T>(async () => {
        try {
            const mod = await factory();
            return { default: mod.default };
        } catch (error) {
            if (attemptChunkRecovery(error)) {
                // La aplicación se está recargando a la versión actual;
                // Suspense mantiene el cargador visible hasta el reload.
                return await new Promise<{ default: T }>(() => {});
            }
            throw error;
        }
    });
}