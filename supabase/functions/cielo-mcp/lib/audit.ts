import type { AuditLogEntry } from './types.ts';

export function recordMCPAudit(params: {
  userId: string;
  centroId?: string | null;
  operation: string;
  toolName?: string;
  parameters: Record<string, unknown>;
  status: 'ALLOWED' | 'DENIED' | 'SUCCESS' | 'ERROR';
  details?: string;
}): void {
  const sanitizedParams = { ...params.parameters };
  delete sanitizedParams.token;
  delete sanitizedParams.accessToken;
  delete sanitizedParams.password;
  delete sanitizedParams.apiKey;

  const entry: AuditLogEntry = {
    id: `mcp_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    userId: params.userId,
    centroId: params.centroId,
    operation: params.operation,
    toolName: params.toolName,
    parameters: sanitizedParams,
    status: params.status,
    details: params.details,
  };

  console.info(`[CIELO-MCP-AUDIT] ${JSON.stringify(entry)}`);
}

