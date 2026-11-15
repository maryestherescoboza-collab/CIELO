/**
 * Sistema de Confirmación Real de Operaciones y Control de Estados para Guías CIELO.
 *
 * Estados de Ejecución:
 * - esperando_interaccion: El paso está activo y esperando que el usuario actúe.
 * - interaccion_realizada: El usuario realizó la interacción requerida.
 * - operacion_en_proceso: La operación asíncrona real (ej. INSERT en Supabase) está ejecutándose.
 * - verificando_resultado: Se verifica la respuesta real del servidor.
 * - operacion_completada: Operación confirmada exitosamente. Se realiza pausa natural antes de avanzar.
 * - operacion_fallida: La operación devolvió error; se retiene al usuario en el paso para permitir corrección.
 */

export type GuideExecutionState = 
  | 'esperando_interaccion'
  | 'interaccion_realizada'
  | 'operacion_en_proceso'
  | 'verificando_resultado'
  | 'operacion_completada'
  | 'operacion_fallida';

export type GuideOperationType = 
  | 'curso_guardar'
  | 'estudiante_guardar'
  | 'actividad_guardar'
  | 'evaluacion_guardar';

export interface GuideOperationEventDetail {
  operation: GuideOperationType;
  message?: string;
  data?: any;
  error?: string;
}

const OP_STARTED_EVENT = 'cielo-guide-op-started';
const OP_SUCCESS_EVENT = 'cielo-guide-op-success';
const OP_ERROR_EVENT = 'cielo-guide-op-error';

/**
 * Notifica que una operación real de CIELO ha comenzado (ej. petición a Supabase).
 */
export function notifyGuideOperationStarted(operation: GuideOperationType) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<GuideOperationEventDetail>(OP_STARTED_EVENT, {
      detail: { operation }
    })
  );
}

/**
 * Notifica que una operación real de CIELO ha finalizado con éxito confirmado.
 */
export function notifyGuideOperationSuccess(operation: GuideOperationType, message?: string, data?: any) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<GuideOperationEventDetail>(OP_SUCCESS_EVENT, {
      detail: { operation, message, data }
    })
  );
}

/**
 * Notifica que una operación real de CIELO ha fallado o devuelto error de red/servidor.
 */
export function notifyGuideOperationError(operation: GuideOperationType, error?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<GuideOperationEventDetail>(OP_ERROR_EVENT, {
      detail: { operation, error }
    })
  );
}

/**
 * Suscribe un manejador para escuchar los eventos de ciclo de vida de operaciones de la guía.
 */
export function subscribeGuideOperations(callbacks: {
  onStarted?: (detail: GuideOperationEventDetail) => void;
  onSuccess?: (detail: GuideOperationEventDetail) => void;
  onError?: (detail: GuideOperationEventDetail) => void;
}): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStarted = (e: Event) => {
    const custom = e as CustomEvent<GuideOperationEventDetail>;
    callbacks.onStarted?.(custom.detail);
  };

  const handleSuccess = (e: Event) => {
    const custom = e as CustomEvent<GuideOperationEventDetail>;
    callbacks.onSuccess?.(custom.detail);
  };

  const handleError = (e: Event) => {
    const custom = e as CustomEvent<GuideOperationEventDetail>;
    callbacks.onError?.(custom.detail);
  };

  window.addEventListener(OP_STARTED_EVENT, handleStarted);
  window.addEventListener(OP_SUCCESS_EVENT, handleSuccess);
  window.addEventListener(OP_ERROR_EVENT, handleError);

  return () => {
    window.removeEventListener(OP_STARTED_EVENT, handleStarted);
    window.removeEventListener(OP_SUCCESS_EVENT, handleSuccess);
    window.removeEventListener(OP_ERROR_EVENT, handleError);
  };
}

