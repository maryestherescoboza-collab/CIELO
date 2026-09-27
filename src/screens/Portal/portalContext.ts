/**
 * Contexto compartido de las pantallas del Portal del estudiante.
 *
 * El Portal vive bajo `/portal/:token/*` (App.tsx) y todas sus pantallas cuelgan
 * del <Outlet> de PortalLayout. El `token` es el acceso de `portal_accesos`: va
 * en la URL y por eso todas las pantallas lo necesitan para moverse.
 *
 * Antes cada pantalla lo reparseaba del pathname a mano (`split('/')[2]`) y las
 * que se olvidaban construian `/portal/...` sin token. Esa URL no matchea
 * `fichas/:id/ruta/:rutaId`, cae en el catch-all y el `<Navigate to="estudiante">`
 * relativo se encadena sin fin: pantalla en blanco. Se lee de un solo sitio y
 * las rutas se arman con `rutaPortal()`.
 */

import { useOutletContext } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';
import type { AsignaturaPublicada, Periodo } from './PortalLayout';

export interface PortalContext {
  /** Acceso del portal, el 3er segmento de la URL. */
  token: string;
  /** `portal_sesiones.session_token` en memoria. null mientras carga o si no hay sesión. */
  sessionToken: string | null;
  asignaturas: AsignaturaPublicada[];
  selectedPeriodo: Periodo;
  setSelectedPeriodo: Dispatch<SetStateAction<Periodo>>;
}

/**
 * Lee el contexto del Outlet sin reventar si falta.
 *
 * `useOutletContext()` devuelve `null` cuando la pantalla queda colgando de una
 * ruta que no pasa por PortalLayout. Destructurarlo a pelo lanza
 * "Cannot destructure property ... of null" en fase de render, que sin
 * ErrorBoundary es exactamente una pantalla en blanco.
 */
export function usePortal(): PortalContext {
  const ctx = useOutletContext<PortalContext | null>();
  return (
    ctx ?? {
      token: '',
      sessionToken: null,
      asignaturas: [],
      selectedPeriodo: 'P1',
      setSelectedPeriodo: () => {},
    }
  );
}

/**
 * URL absoluta dentro del Portal. Nunca devolver una ruta relativa desde una
 * pantalla del Portal: el `*` de `/portal/:token/*` convierte un `Navigate`
 * relativo en una cadena de redirecciones.
 */
export function rutaPortal(token: string, ...segmentos: string[]): string {
  const limpio = segmentos
    .flatMap((s) => s.split('/'))
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  return ['/portal', token, ...limpio].filter(Boolean).join('/');
}
