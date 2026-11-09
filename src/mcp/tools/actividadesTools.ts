/**
 * FASE 4 — HERRAMIENTA 2: Creación de actividades (`crear_actividad`)
 *
 * REGLA OBLIGATORIA DE CONFIRMACIÓN E IDEMPOTENCIA:
 * 1. `accion: 'preparar'` → Valida acceso al curso y asignatura, valida todos los campos reales de CIELO,
 *    genera un resumen estructurado (preview) con `confirmation_token` e `idempotency_key` y solicita
 *    confirmación explícita del usuario. NO escribe en la base de datos.
 * 2. `accion: 'confirmar'` → Exige `confirmado === true`, `confirmation_token` válido para ese usuario/curso
 *    e `idempotency_key`. Si la operación se reintenta con la misma `idempotency_key` o si la actividad ya
 *    fue creada para ese curso/asignatura/período/fecha/nombre, devuelve el registro existente sin duplicar.
 */

import {
  assertNoManipulatedIdentityParams,
  MCPAuthorizationError,
  verifyCourseAndSubjectAccess,
} from '../authGuard';
import { invalidateCourseCache } from '../cache';
import { recordMCPAudit } from '../auditLogger';
import type {
  AuthenticatedContext,
  BCKey,
  CieloDataRepository,
  IndicadorInput,
  PeriodoAcademico,
} from '../types';

const VALID_PERIODS: PeriodoAcademico[] = ['P1', 'P2', 'P3', 'P4'];
const VALID_BCS: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];
const PREVIEW_TTL_MS = 15 * 60 * 1000; // 15 minutos

interface PendingActivityPreview {
  confirmationToken: string;
  idempotencyKey: string;
  userId: string;
  centroId: string | null;
  cursoId: number;
  grado: string;
  seccion: string;
  asignatura: string;
  sharedCourseId: string;
  titulo: string;
  descripcion: string | null;
  periodo: PeriodoAcademico;
  competencias: BCKey[];
  indicadorTexto: string;
  indicadoresJson: Array<{ id?: string | number; codigo?: string; descripcion: string; competencia?: BCKey }>;
  productoEvidencia: string;
  criteriosEvaluacion: string[];
  puntajeMaximo: number;
  fechaEntrega: string;
  esProductoFinal: boolean;
  esRecuperacion: boolean;
  createdAt: number;
  expiresAt: number;
}

interface IdempotencyResult {
  actividadId: number;
  responsePayload: Record<string, unknown>;
  timestamp: number;
}

const previewStore = new Map<string, PendingActivityPreview>();
const idempotencyStore = new Map<string, IdempotencyResult>();

function computeDeterministicHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function normalizeCompetencias(raw: unknown): BCKey[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new MCPAuthorizationError(
      'Debes indicar al menos un bloque de competencia fundamental (`BC1`, `BC2`, `BC3` o `BC4`).',
      'INVALID_INPUT',
      400
    );
  }
  const normalized: BCKey[] = [];
  for (const item of raw) {
    const val = String(item || '').trim().toUpperCase() as BCKey;
    if (!VALID_BCS.includes(val)) {
      throw new MCPAuthorizationError(
        `Competencia inválida '${item}'. Valores permitidos en CIELO: BC1, BC2, BC3, BC4.`,
        'INVALID_INPUT',
        400
      );
    }
    if (!normalized.includes(val)) {
      normalized.push(val);
    }
  }
  return normalized;
}

function normalizeIndicadores(
  raw: unknown
): {
  indicadorTexto: string;
  indicadoresJson: Array<{ id?: string | number; codigo?: string; descripcion: string; competencia?: BCKey }>;
} {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new MCPAuthorizationError(
      'Debes proporcionar al menos un indicador de logro válido para la actividad.',
      'INVALID_INPUT',
      400
    );
  }

  const list: Array<{ id?: string | number; codigo?: string; descripcion: string; competencia?: BCKey }> = [];

  for (const item of raw) {
    if (typeof item === 'string') {
      const desc = item.trim();
      if (desc) list.push({ descripcion: desc });
    } else if (item && typeof item === 'object') {
      const obj = item as IndicadorInput;
      const desc = String(obj.descripcion || '').trim();
      if (desc) {
        list.push({
          id: obj.id,
          codigo: obj.codigo,
          descripcion: desc,
          competencia: obj.competencia,
        });
      }
    }
  }

  if (list.length === 0) {
    throw new MCPAuthorizationError(
      'Los indicadores de logro proporcionados están vacíos.',
      'INVALID_INPUT',
      400
    );
  }

  return {
    indicadorTexto: list.map(i => (i.codigo ? `${i.codigo}: ${i.descripcion}` : i.descripcion)).join(' | '),
    indicadoresJson: list,
  };
}

export async function handleCrearActividad(
  rawInput: Record<string, unknown>,
  auth: AuthenticatedContext,
  repo: CieloDataRepository
) {
  assertNoManipulatedIdentityParams(rawInput, auth);

  const accion = typeof rawInput.accion === 'string' ? rawInput.accion.trim().toLowerCase() : 'preparar';
  const cursoId = Number(rawInput.curso_id);
  const asignaturaInput = typeof rawInput.asignatura === 'string' ? rawInput.asignatura.trim() : '';

  if (accion !== 'preparar' && accion !== 'confirmar') {
    throw new MCPAuthorizationError(
      `Acción inválida '${accion}'. Debe ser 'preparar' (para generar vista previa) o 'confirmar' (tras confirmación explícita del docente).`,
      'INVALID_INPUT',
      400
    );
  }

  try {
    // 1. Validar que el docente tiene permiso de ESCRITURA sobre el curso y la asignatura
    const { curso, resolvedAsignatura } = await verifyCourseAndSubjectAccess({
      auth,
      repo,
      cursoId,
      asignatura: asignaturaInput,
      requireWriteSubject: true,
    });

    const titulo = typeof rawInput.titulo === 'string' ? rawInput.titulo.trim() : '';
    if (!titulo || titulo.length < 3) {
      throw new MCPAuthorizationError(
        'El título de la actividad es obligatorio y debe tener al menos 3 caracteres.',
        'INVALID_INPUT',
        400
      );
    }

    const periodo = String(rawInput.periodo || '').trim().toUpperCase() as PeriodoAcademico;
    if (!VALID_PERIODS.includes(periodo)) {
      throw new MCPAuthorizationError(
        `Período académico inválido '${rawInput.periodo}'. Valores permitidos: P1, P2, P3, P4.`,
        'INVALID_INPUT',
        400
      );
    }

    const competencias = normalizeCompetencias(rawInput.competencias);
    const { indicadorTexto, indicadoresJson } = normalizeIndicadores(rawInput.indicadores);

    const productoEvidencia =
      typeof rawInput.producto_evidencia === 'string' && rawInput.producto_evidencia.trim()
        ? rawInput.producto_evidencia.trim()
        : 'Producción escrita / Evidencia de aprendizaje';

    const criteriosEvaluacion = Array.isArray(rawInput.criterios_evaluacion)
      ? rawInput.criterios_evaluacion.map(c => String(c).trim()).filter(Boolean)
      : [];

    const puntajeMaximo =
      rawInput.puntaje_maximo !== undefined && rawInput.puntaje_maximo !== null
        ? Number(rawInput.puntaje_maximo)
        : 100;

    if (!Number.isFinite(puntajeMaximo) || puntajeMaximo <= 0 || puntajeMaximo > 100) {
      throw new MCPAuthorizationError(
        'El puntaje máximo debe estar entre 1 y 100 puntos según la escala oficial de CIELO.',
        'INVALID_INPUT',
        400
      );
    }

    const fechaEntrega =
      typeof rawInput.fecha_entrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawInput.fecha_entrega.trim())
        ? rawInput.fecha_entrega.trim()
        : new Date().toISOString().slice(0, 10);

    const descripcionBase = typeof rawInput.descripcion === 'string' ? rawInput.descripcion.trim() : '';
    const descripcionCompuesta = [
      descripcionBase,
      criteriosEvaluacion.length > 0 ? `Criterios de evaluación: ${criteriosEvaluacion.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n') || null;

    const esProductoFinal = Boolean(rawInput.es_producto_final);
    const esRecuperacion = Boolean(rawInput.es_recuperacion);

    const deterministicPayloadSignature = [
      auth.userId,
      curso.id,
      resolvedAsignatura.toLowerCase(),
      periodo,
      titulo.toLowerCase(),
      fechaEntrega,
      competencias.slice().sort().join(','),
    ].join('|');

    const computedIdempotencyKey =
      typeof rawInput.idempotency_key === 'string' && rawInput.idempotency_key.trim()
        ? rawInput.idempotency_key.trim()
        : `idem_${computeDeterministicHash(deterministicPayloadSignature)}`;

    const computedConfirmationToken = `conf_${computeDeterministicHash(`token|${deterministicPayloadSignature}`)}`;

    // =========================================================================
    // PASO 1: MODO PREPARAR (VISTA PREVIA OBLIGATORIA SIN ESCRITURA)
    // =========================================================================
    if (accion === 'preparar') {
      const now = Date.now();
      const preview: PendingActivityPreview = {
        confirmationToken: computedConfirmationToken,
        idempotencyKey: computedIdempotencyKey,
        userId: auth.userId,
        centroId: auth.centroId,
        cursoId: curso.id,
        grado: curso.grado,
        seccion: curso.seccion,
        asignatura: resolvedAsignatura,
        sharedCourseId: curso.sharedCourseId,
        titulo,
        descripcion: descripcionCompuesta,
        periodo,
        competencias,
        indicadorTexto,
        indicadoresJson,
        productoEvidencia,
        criteriosEvaluacion,
        puntajeMaximo,
        fechaEntrega,
        esProductoFinal,
        esRecuperacion,
        createdAt: now,
        expiresAt: now + PREVIEW_TTL_MS,
      };

      previewStore.set(computedConfirmationToken, preview);

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        toolName: 'crear_actividad',
        cursoId: curso.id,
        asignatura: resolvedAsignatura,
        status: 'PREVIEW',
        details: `Vista previa generada para actividad '${titulo}' (${periodo}). Pendiente de confirmación.`,
      });

      return {
        ok: true,
        estado: 'PENDIENTE_CONFIRMACION_USUARIO',
        requiere_confirmacion_explicita: true,
        mensaje_instruccion:
          'Presenta este resumen estructurado al docente y solicita su confirmación explícita antes de invocar crear_actividad con accion="confirmar", confirmado=true, confirmation_token e idempotency_key.',
        resumen_actividad: {
          curso_id: curso.id,
          curso_nombre: `${curso.grado} ${curso.seccion} (${curso.nombre})`,
          asignatura: resolvedAsignatura,
          periodo,
          titulo,
          descripcion: descripcionCompuesta,
          competencias_fundamentales: competencias,
          indicadores_logro: indicadoresJson,
          producto_evidencia: productoEvidencia,
          criterios_evaluacion: criteriosEvaluacion,
          puntaje_maximo: puntajeMaximo,
          fecha_entrega: fechaEntrega,
          es_producto_final: esProductoFinal,
          es_recuperacion: esRecuperacion,
        },
        confirmation_token: computedConfirmationToken,
        idempotency_key: computedIdempotencyKey,
      };
    }

    // =========================================================================
    // PASO 2: MODO CONFIRMAR (ESCRITURA CON CONFIRMACIÓN EXPLÍCITA + IDEMPOTENCIA)
    // =========================================================================
    if (rawInput.confirmado !== true) {
      throw new MCPAuthorizationError(
        'Operación bloqueada: no se puede guardar la actividad sin confirmación explícita del usuario (`confirmado: true`). Primero ejecuta `accion: "preparar"` y solicita confirmación al docente.',
        'INVALID_INPUT',
        400
      );
    }

    const providedToken =
      typeof rawInput.confirmation_token === 'string' ? rawInput.confirmation_token.trim() : '';

    if (!providedToken) {
      throw new MCPAuthorizationError(
        'Operación bloqueada: falta `confirmation_token`. Debes generar primero la vista previa con `accion: "preparar"`.',
        'INVALID_INPUT',
        400
      );
    }

    const storedPreview = previewStore.get(providedToken);
    if (!storedPreview || storedPreview.userId !== auth.userId || storedPreview.cursoId !== curso.id) {
      throw new MCPAuthorizationError(
        'El `confirmation_token` no es válido, expiró o no corresponde a la actividad preparada por este usuario.',
        'INVALID_INPUT',
        400
      );
    }

    if (Date.now() > storedPreview.expiresAt) {
      previewStore.delete(providedToken);
      throw new MCPAuthorizationError(
        'La vista previa de la actividad ha expirado. Ejecuta nuevamente `accion: "preparar"` para confirmar.',
        'INVALID_INPUT',
        400
      );
    }

    // 2.1 Verificar clave de idempotencia en memoria
    const scopedIdemKey = `${auth.userId}:${curso.id}:${computedIdempotencyKey}`;
    const existingIdem = idempotencyStore.get(scopedIdemKey);
    if (existingIdem) {
      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        toolName: 'crear_actividad',
        cursoId: curso.id,
        asignatura: resolvedAsignatura,
        status: 'SUCCESS',
        createdRecordId: existingIdem.actividadId,
        details: `Reintento idempotente detectado (${computedIdempotencyKey}). Se devolvió la actividad existente #${existingIdem.actividadId} sin duplicar.`,
      });
      return {
        ...existingIdem.responsePayload,
        idempotente_reutilizado: true,
      };
    }

    // 2.2 Verificar duplicado exacto en base de datos (protección contra reintentos entre instancias serverless)
    const existingDbAct = await repo.findExistingActividad({
      cursoId: curso.id,
      asignatura: resolvedAsignatura,
      periodo,
      nombre: titulo,
      fecha: fechaEntrega,
    });

    if (existingDbAct) {
      const duplicateResponse = {
        ok: true,
        estado: 'CREADA',
        idempotente_reutilizado: true,
        mensaje: `La actividad '${titulo}' ya se encontraba registrada en CIELO para ${curso.grado} ${curso.seccion} (${resolvedAsignatura} - ${periodo}). No se duplicó el registro.`,
        actividad: {
          id: existingDbAct.id,
          titulo: existingDbAct.nombre,
          curso_id: curso.id,
          grado: curso.grado,
          seccion: curso.seccion,
          asignatura: resolvedAsignatura,
          periodo,
          competencias,
          indicador: indicadorTexto,
          producto_evidencia: productoEvidencia,
          fecha_entrega: existingDbAct.fecha,
        },
      };

      idempotencyStore.set(scopedIdemKey, {
        actividadId: existingDbAct.id,
        responsePayload: duplicateResponse,
        timestamp: Date.now(),
      });

      recordMCPAudit({
        userId: auth.userId,
        centroId: auth.centroId,
        toolName: 'crear_actividad',
        cursoId: curso.id,
        asignatura: resolvedAsignatura,
        status: 'SUCCESS',
        createdRecordId: existingDbAct.id,
        details: `Actividad existente en BD detectada (#${existingDbAct.id}). No se duplicó.`,
      });

      return duplicateResponse;
    }

    // 2.3 Insertar en la tabla `actividades` usando el modelo exacto de CIELO
    const inserted = await repo.insertActividad({
      nombre: titulo,
      fecha: fechaEntrega,
      periodo,
      curso_id: curso.id,
      bc_asignados: competencias,
      is_rec: esRecuperacion,
      is_producto_final: esProductoFinal,
      user_id: auth.userId,
      asignatura: resolvedAsignatura,
      shared_course_id: curso.sharedCourseId,
      indicador: indicadorTexto,
      indicadores_json: indicadoresJson,
      producto: productoEvidencia,
      descripcion: descripcionCompuesta,
    });

    // Invalidar caché del curso tras escritura
    invalidateCourseCache(auth.userId, auth.centroId, curso.id);

    const successPayload = {
      ok: true,
      estado: 'CREADA',
      idempotente_reutilizado: false,
      mensaje: `Actividad '${inserted.nombre}' creada exitosamente en CIELO (ID #${inserted.id}).`,
      actividad: {
        id: inserted.id,
        titulo: inserted.nombre,
        curso_id: inserted.curso_id,
        grado: curso.grado,
        seccion: curso.seccion,
        asignatura: inserted.asignatura,
        periodo: inserted.periodo,
        competencias: inserted.bc_asignados,
        indicador: inserted.indicador,
        producto_evidencia: inserted.producto,
        fecha_entrega: inserted.fecha,
      },
    };

    idempotencyStore.set(scopedIdemKey, {
      actividadId: inserted.id,
      responsePayload: successPayload,
      timestamp: Date.now(),
    });

    recordMCPAudit({
      userId: auth.userId,
      centroId: auth.centroId,
      toolName: 'crear_actividad',
      cursoId: curso.id,
      asignatura: resolvedAsignatura,
      status: 'SUCCESS',
      createdRecordId: inserted.id,
      details: `Actividad creada exitosamente: '${inserted.nombre}' (ID #${inserted.id}).`,
    });

    return successPayload;
  } catch (err: any) {
    recordMCPAudit({
      userId: auth.userId,
      centroId: auth.centroId,
      toolName: 'crear_actividad',
      cursoId: Number.isFinite(cursoId) ? cursoId : null,
      asignatura: asignaturaInput || null,
      status: err instanceof MCPAuthorizationError ? 'DENIED' : 'ERROR',
      details: err?.message,
    });
    throw err;
  }
}

export function clearActivityPreviewAndIdempotencyStores(): void {
  previewStore.clear();
  idempotencyStore.clear();
}

