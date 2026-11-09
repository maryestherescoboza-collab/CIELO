/**
 * FASE 6: Registro y Auditoría de operaciones MCP.
 *
 * Registra:
 * - Usuario autenticado (userId)
 * - Centro educativo (centroId)
 * - Herramienta ejecutada (toolName)
 * - Fecha y hora ISO-8601 (timestamp)
 * - Curso y asignatura (cursoId, asignatura)
 * - Resultado de la operación (SUCCESS, DENIED, PREVIEW, ERROR)
 * - ID del registro creado cuando aplica (createdRecordId)
 *
 * PROHIBICIÓN ESTRICTA:
 * NUNCA registra tokens OAuth, JWTs, contraseñas ni datos sensibles.
 */

import type { AuditLogEntry } from './types';

const MAX_IN_MEMORY_LOGS = 500;
const auditLogs: AuditLogEntry[] = [];

const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]*/g,
  /("?(?:access_token|refresh_token|password|secret|authorization|token)"?\s*:\s*")[^"]+(")/gi,
];

export function sanitizeAuditText(input?: string | null): string | undefined {
  if (!input) return undefined;
  let sanitized = String(input);
  for (const regex of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(regex, '[REDACTED]');
  }
  return sanitized.slice(0, 500);
}

export function recordMCPAudit(params: {
  userId: string;
  centroId: string | null;
  toolName: string;
  cursoId?: number | null;
  asignatura?: string | null;
  status: 'SUCCESS' | 'DENIED' | 'PREVIEW' | 'ERROR';
  createdRecordId?: number | string | null;
  details?: string;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `mcp_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    userId: params.userId || 'anonymous',
    centroId: params.centroId ?? null,
    toolName: params.toolName,
    cursoId: params.cursoId ?? null,
    asignatura: params.asignatura ?? null,
    status: params.status,
    createdRecordId: params.createdRecordId ?? null,
    details: sanitizeAuditText(params.details),
  };

  auditLogs.unshift(entry);
  if (auditLogs.length > MAX_IN_MEMORY_LOGS) {
    auditLogs.length = MAX_IN_MEMORY_LOGS;
  }

  console.info(`[CIELO-MCP-AUDIT] ${JSON.stringify(entry)}`);
  return entry;
}

export function getMCPAuditLogs(userId?: string): AuditLogEntry[] {
  if (!userId) return [...auditLogs];
  return auditLogs.filter(e => e.userId === userId);
}

export function clearMCPAuditLogs(): void {
  auditLogs.length = 0;
}

