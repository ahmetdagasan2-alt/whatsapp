// Minimal HTTP client for SAP (S/4HANA OData, CPI iFlow, or any REST endpoint).
// Supports Basic and OAuth2 client-credentials auth, and fetches an
// X-CSRF-Token before write requests when the target requires it (OData).
//
// Credentials are never stored in the DB: a route only stores a `credential_key`,
// and secrets are read from env vars named SAP_<CREDENTIAL_KEY>_<FIELD>.

import { mask, sapDebug } from '@/app/api/sap/debug';

export type SapAuthType = 'basic' | 'oauth2' | 'none';

export interface SapCredentials {
  authType: SapAuthType;
  username?: string;
  password?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  sapClient?: string;
}

export function loadCredentials(credentialKey: string, authType: SapAuthType): SapCredentials {
  const prefix = `SAP_${credentialKey.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_`;
  const env = (name: string) => process.env[prefix + name];
  sapDebug('6. loadCredentials: env vars', {
    authType,
    prefix,
    [`${prefix}USER`]: env('USER') ?? '(missing)',
    [`${prefix}PASSWORD`]: mask(env('PASSWORD')),
    [`${prefix}CLIENT`]: env('CLIENT') ?? '(missing)',
    [`${prefix}TOKEN_URL`]: env('TOKEN_URL') ?? '(missing)',
    [`${prefix}CLIENT_ID`]: env('CLIENT_ID') ?? '(missing)',
    [`${prefix}CLIENT_SECRET`]: mask(env('CLIENT_SECRET')),
  });
  return {
    authType,
    username: env('USER'),
    password: env('PASSWORD'),
    tokenUrl: env('TOKEN_URL'),
    clientId: env('CLIENT_ID'),
    clientSecret: env('CLIENT_SECRET'),
    sapClient: env('CLIENT'),
  };
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getOAuthToken(creds: SapCredentials): Promise<string> {
  if (!creds.tokenUrl || !creds.clientId || !creds.clientSecret) {
    throw new Error('SAP oauth2 credentials incomplete (TOKEN_URL / CLIENT_ID / CLIENT_SECRET)');
  }
  const cacheKey = `${creds.tokenUrl}|${creds.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    sapDebug('7. OAuth: using cached token');
    return cached.token;
  }
  sapDebug('7. OAuth: requesting token', { tokenUrl: creds.tokenUrl, clientId: creds.clientId });

  const res = await fetch(creds.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  sapDebug('7. OAuth: token response', { status: res.status });
  if (!res.ok) throw new Error(`SAP OAuth token request failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 });
  return data.access_token;
}

async function authHeader(creds: SapCredentials): Promise<Record<string, string>> {
  switch (creds.authType) {
    case 'basic':
      if (!creds.username || !creds.password) throw new Error('SAP basic credentials incomplete (USER / PASSWORD)');
      return { Authorization: 'Basic ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64') };
    case 'oauth2':
      return { Authorization: 'Bearer ' + (await getOAuthToken(creds)) };
    default:
      return {};
  }
}

function withSapClient(url: string, sapClient?: string): string {
  if (!sapClient) return url;
  const u = new URL(url);
  if (!u.searchParams.has('sap-client')) u.searchParams.set('sap-client', sapClient);
  return u.toString();
}

async function fetchCsrf(url: string, headers: Record<string, string>): Promise<{ token?: string; cookie?: string }> {
  sapDebug('8. CSRF: fetching token (HEAD)', { url });
  const res = await fetch(url, { method: 'HEAD', headers: { ...headers, 'X-CSRF-Token': 'Fetch' } });
  const token = res.headers.get('x-csrf-token') ?? undefined;
  // SAP binds the CSRF token to the session cookies, so they must be sent back.
  const cookie = res.headers
    .getSetCookie?.()
    .map((c) => c.split(';')[0])
    .join('; ');
  sapDebug('8. CSRF: response', {
    status: res.status,
    token: token ? mask(token) : '(none returned)',
    cookies: cookie ? cookie.split('; ').map((c) => c.split('=')[0]) : [],
  });
  return { token, cookie: cookie || undefined };
}

export interface SapRequest {
  url: string;
  method?: string;
  body: unknown;
  csrf?: boolean;
  timeoutMs?: number;
}

export async function callSap(creds: SapCredentials, req: SapRequest): Promise<{ status: number; body: string }> {
  const url = withSapClient(req.url, creds.sapClient);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(await authHeader(creds)),
  };

  if (req.csrf) {
    const { token, cookie } = await fetchCsrf(url, headers);
    if (token) headers['X-CSRF-Token'] = token;
    if (cookie) headers['Cookie'] = cookie;
  }

  sapDebug('9. callSap: sending request', {
    method: req.method ?? 'POST',
    url,
    authType: creds.authType,
    headers: Object.keys(headers),
  });
  const res = await fetch(url, {
    method: req.method ?? 'POST',
    headers,
    body: JSON.stringify(req.body),
    signal: AbortSignal.timeout(req.timeoutMs ?? 15_000),
  });
  const body = await res.text();
  sapDebug('9. callSap: response', { status: res.status, body: body.slice(0, 2000) });
  if (!res.ok) throw new Error(`SAP ${res.status} ${req.method ?? 'POST'} ${req.url}: ${body.slice(0, 500)}`);
  return { status: res.status, body };
}
