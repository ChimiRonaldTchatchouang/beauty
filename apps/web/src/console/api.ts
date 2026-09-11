/**
 * Client API de la console. Le mot de passe (usage local) est conservé en
 * sessionStorage et envoyé dans l'en-tête x-console-password à chaque requête.
 */
const KEY = 'nextiaa-console-password';

export function getPassword(): string {
  try {
    return sessionStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setPassword(pw: string): void {
  try {
    sessionStorage.setItem(KEY, pw);
  } catch {
    /* ignore */
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      'x-console-password': getPassword(),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const consoleApi = {
  login: () => req<{ ok: boolean }>('POST', '/api/console/login'),
  dashboard: () =>
    req<{ total: number; avgDurationSec: number; transferredPct: number; avgLatencyMs: number; topQueries: { query: string; count: number }[] }>(
      'GET',
      '/api/console/dashboard',
    ),
  calls: () => req<{ calls: CallRow[] }>('GET', '/api/console/calls'),
  call: (id: string) => req<CallDetail>('GET', `/api/console/calls/${id}`),
  kb: () => req<{ fiches: KbFiche[] }>('GET', '/api/console/kb'),
  kbUpsert: (f: KbFiche) => req<{ ok: boolean }>('POST', '/api/console/kb', f),
  kbSetVerified: (id: string, verified: boolean) =>
    req<{ ok: boolean }>('PATCH', `/api/console/kb/${id}/verified`, { verified }),
  kbDelete: (id: string) => req<{ ok: boolean }>('DELETE', `/api/console/kb/${id}`),
  tickets: () => req<{ tickets: TicketRow[] }>('GET', '/api/console/tickets'),
  settings: () => req<Settings>('GET', '/api/console/settings'),
  updateSettings: (s: Partial<Settings>) => req<Settings>('PUT', '/api/console/settings', s),
};

export interface CallRow {
  id: string;
  caller_number: string;
  dialed: string;
  sim_operator: string;
  access_mode: string;
  phone_quality: number;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  status: string;
  reason: string | null;
}

export interface CallDetail {
  call: CallRow | null;
  turns: { who: string; text: string; latency_ms: number | null; at: string }[];
  tools: { name: string; args_json: string; ok: number; at: string }[];
  sms: { body: string; at: string; to_number: string }[];
}

export interface KbFiche {
  id: string;
  category: string;
  operator: string | null;
  title: string;
  content: string;
  source: string | null;
  last_verified: string | null;
  verified: number | boolean;
}

export interface TicketRow {
  reference: string;
  category: string;
  summary: string;
  priority: string;
  status: string;
  at: string;
}

export interface Settings {
  voice: string;
  vadSilenceMs: number;
  maxCallMinutes: number;
  systemPromptOverride: string | null;
}
