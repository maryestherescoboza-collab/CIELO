/**
 * FASE 3: Gestor de OAuth 2.0 (Authorization Code Flow + PKCE, Token Refresh y Revocación)
 * Compatible con conectores MCP de ChatGPT (OpenAI Actions / MCP Connectors).
 *
 * - Cada docente autoriza su propia cuenta individual de CIELO.
 * - Soporta revocación inmediata de tokens (`/oauth/revoke`).
 * - Una vez revocado o expirado el token, cualquier invocación MCP falla con 401.
 */

export interface OAuthAuthorizationCode {
  code: string;
  userId: string;
  email: string;
  supabaseAccessToken: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  scope: string;
  expiresAt: number;
  used: boolean;
}

export interface OAuthTokenRecord {
  tokenId: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  supabaseAccessToken: string;
  clientId: string;
  scope: string;
  issuedAt: number;
  expiresAt: number;
  revoked: boolean;
}

const authCodes = new Map<string, OAuthAuthorizationCode>();
const accessTokens = new Map<string, OAuthTokenRecord>();
const refreshTokens = new Map<string, OAuthTokenRecord>();
const revokedTokens = new Set<string>();

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function generateRandomHex(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function computeS256Challenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Emite un código de autorización OAuth 2.0 tras autenticar al usuario en Supabase Auth.
 */
export function issueAuthorizationCode(params: {
  userId: string;
  email: string;
  supabaseAccessToken: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  scope?: string;
}): OAuthAuthorizationCode {
  const code = `cielo_ac_${generateRandomHex(20)}`;
  const record: OAuthAuthorizationCode = {
    code,
    userId: params.userId,
    email: params.email,
    supabaseAccessToken: params.supabaseAccessToken,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod || 'S256',
    scope: params.scope || 'mcp:students:read mcp:activities:write mcp:reports:read',
    expiresAt: Date.now() + CODE_TTL_MS,
    used: false,
  };
  authCodes.set(code, record);
  return record;
}

/**
 * Canjea un código de autorización por un par `{ access_token, refresh_token }`.
 */
export async function exchangeCodeForToken(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<{
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}> {
  const record = authCodes.get(params.code);
  if (!record) {
    throw new Error('invalid_grant: Código de autorización inexistente.');
  }
  if (record.used) {
    authCodes.delete(params.code);
    throw new Error('invalid_grant: El código de autorización ya fue utilizado.');
  }
  if (Date.now() > record.expiresAt) {
    authCodes.delete(params.code);
    throw new Error('invalid_grant: El código de autorización ha expirado.');
  }
  if (record.redirectUri !== params.redirectUri) {
    throw new Error('invalid_grant: redirect_uri no coincide.');
  }

  if (record.codeChallenge) {
    if (!params.codeVerifier) {
      throw new Error('invalid_grant: Falta code_verifier para PKCE.');
    }
    const expected =
      record.codeChallengeMethod === 'plain'
        ? params.codeVerifier
        : await computeS256Challenge(params.codeVerifier);
    if (expected !== record.codeChallenge) {
      throw new Error('invalid_grant: Verificación PKCE fallida.');
    }
  }

  record.used = true;

  const tokenRecord = issueOAuthTokenDirect({
    userId: record.userId,
    email: record.email,
    supabaseAccessToken: record.supabaseAccessToken,
    clientId: record.clientId,
    scope: record.scope,
  });

  return {
    access_token: tokenRecord.accessToken,
    token_type: 'Bearer',
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: tokenRecord.refreshToken,
    scope: tokenRecord.scope,
  };
}

/**
 * Emite un token OAuth vinculado al usuario autenticado.
 */
export function issueOAuthTokenDirect(params: {
  userId: string;
  email: string;
  supabaseAccessToken: string;
  clientId?: string;
  scope?: string;
}): OAuthTokenRecord {
  const tokenId = `tid_${generateRandomHex(12)}`;
  const accessToken = `cielo_at_${generateRandomHex(24)}`;
  const refreshToken = `cielo_rt_${generateRandomHex(24)}`;
  const now = Date.now();

  const tokenRecord: OAuthTokenRecord = {
    tokenId,
    accessToken,
    refreshToken,
    userId: params.userId,
    email: params.email,
    supabaseAccessToken: params.supabaseAccessToken,
    clientId: params.clientId || 'chatgpt-mcp-connector',
    scope: params.scope || 'mcp:students:read mcp:activities:write mcp:reports:read',
    issuedAt: now,
    expiresAt: now + ACCESS_TOKEN_TTL_MS,
    revoked: false,
  };

  accessTokens.set(accessToken, tokenRecord);
  refreshTokens.set(refreshToken, tokenRecord);
  return tokenRecord;
}

/**
 * Valida un token de acceso OAuth y verifica que no esté revocado ni expirado.
 */
export function validateOAuthAccessToken(token: string): OAuthTokenRecord {
  if (!token || revokedTokens.has(token)) {
    throw new Error('Token de acceso revocado o inválido.');
  }

  const record = accessTokens.get(token);
  if (!record) {
    throw new Error('Token de acceso no reconocido.');
  }

  if (record.revoked) {
    throw new Error('El acceso de esta cuenta fue revocado por el usuario.');
  }

  if (Date.now() > record.expiresAt) {
    throw new Error('El token de acceso ha expirado.');
  }

  return record;
}

/**
 * Revoca inmediatamente un access_token o refresh_token (o todos los tokens de un usuario).
 */
export function revokeOAuthToken(token: string): boolean {
  revokedTokens.add(token);

  const byAccess = accessTokens.get(token);
  if (byAccess) {
    byAccess.revoked = true;
    revokedTokens.add(byAccess.refreshToken);
    return true;
  }

  const byRefresh = refreshTokens.get(token);
  if (byRefresh) {
    byRefresh.revoked = true;
    revokedTokens.add(byRefresh.accessToken);
    return true;
  }

  return false;
}

/**
 * Revoca todos los tokens activos de un usuario específico (desconexión total de ChatGPT).
 */
export function revokeAllUserOAuthTokens(userId: string): number {
  let count = 0;
  for (const record of accessTokens.values()) {
    if (record.userId === userId && !record.revoked) {
      record.revoked = true;
      revokedTokens.add(record.accessToken);
      revokedTokens.add(record.refreshToken);
      count++;
    }
  }
  return count;
}

