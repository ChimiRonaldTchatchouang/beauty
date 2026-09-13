import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { Queryable } from './pool.js';

const SCHEMA_PATH = fileURLToPath(new URL('./schema.sql', import.meta.url));

export interface KbRow {
  id: string;
  category: string;
  operator: string | null;
  title: string;
  content: string;
  source: string | null;
  last_verified: string | null;
  verified: boolean;
  updated_at: string;
}

export interface CallRow {
  id: string;
  caller_number: string;
  dialed: string;
  sim_operator: string;
  access_mode: string;
  phone_quality: boolean;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  status: string;
  reason: string | null;
  usage_json: string | null;
}

export interface SmsRow {
  id: number;
  call_id: string | null;
  to_number: string;
  from_label: string;
  body: string;
  at: string;
}

export interface TicketRow {
  id: number;
  reference: string;
  call_id: string | null;
  category: string;
  summary: string;
  priority: string;
  status: string;
  at: string;
}

export interface CaseRow {
  reference: string;
  owner_number: string;
  status: string;
  detail: string;
  next_step: string;
  updated_at: string;
}

/**
 * Accès PostgreSQL (Neon) via un `Queryable` (pg.Pool en prod, PGlite en test).
 * Toutes les méthodes sont asynchrones. Les outils restant sous les 300 ms
 * imposent une base proche du serveur (voir docs/DEPLOIEMENT.md).
 */
export class Repository {
  constructor(private readonly q: Queryable) {}

  /** Applique le schéma (instruction par instruction). À appeler au démarrage. */
  async init(): Promise<void> {
    const sql = readFileSync(SCHEMA_PATH, 'utf8')
      // On retire les lignes de commentaire avant de découper sur « ; ».
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await this.q.query(stmt);
    }
  }

  // ── Base de connaissances ──────────────────────────────────
  async kbCount(): Promise<number> {
    const { rows } = await this.q.query('SELECT COUNT(*)::int AS n FROM kb');
    return (rows[0]?.n as number) ?? 0;
  }

  async kbAll(): Promise<KbRow[]> {
    const { rows } = await this.q.query('SELECT * FROM kb ORDER BY category, title');
    return rows as unknown as KbRow[];
  }

  async kbForSearch(category?: string, operator?: string): Promise<KbRow[]> {
    let sql = 'SELECT * FROM kb WHERE verified = TRUE';
    const params: string[] = [];
    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (operator) {
      params.push(operator);
      sql += ` AND (operator = $${params.length} OR operator IS NULL)`;
    }
    const { rows } = await this.q.query(sql, params);
    return rows as unknown as KbRow[];
  }

  async kbUpsert(row: Omit<KbRow, 'updated_at'>): Promise<void> {
    await this.q.query(
      `INSERT INTO kb (id, category, operator, title, content, source, last_verified, verified, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (id) DO UPDATE SET
         category = $2, operator = $3, title = $4, content = $5,
         source = $6, last_verified = $7, verified = $8, updated_at = now()`,
      [row.id, row.category, row.operator, row.title, row.content, row.source, row.last_verified, row.verified],
    );
  }

  async kbSetVerified(id: string, verified: boolean, lastVerified: string): Promise<void> {
    await this.q.query('UPDATE kb SET verified = $1, last_verified = $2, updated_at = now() WHERE id = $3', [
      verified,
      lastVerified,
      id,
    ]);
  }

  async kbDelete(id: string): Promise<void> {
    await this.q.query('DELETE FROM kb WHERE id = $1', [id]);
  }

  // ── Appels ─────────────────────────────────────────────────
  async createCall(row: {
    id: string;
    caller_number: string;
    dialed: string;
    sim_operator: string;
    access_mode: string;
    phone_quality: boolean;
  }): Promise<void> {
    await this.q.query(
      `INSERT INTO calls (id, caller_number, dialed, sim_operator, access_mode, phone_quality)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.id, row.caller_number, row.dialed, row.sim_operator, row.access_mode, row.phone_quality],
    );
  }

  async endCall(id: string, durationSec: number, status: string, reason: string, usageJson: string | null): Promise<void> {
    await this.q.query(
      `UPDATE calls SET ended_at = now(), duration_sec = $1, status = $2, reason = $3, usage_json = $4 WHERE id = $5`,
      [durationSec, status, reason, usageJson, id],
    );
  }

  async setCallStatus(id: string, status: string): Promise<void> {
    await this.q.query('UPDATE calls SET status = $1 WHERE id = $2', [status, id]);
  }

  async getCall(id: string): Promise<CallRow | undefined> {
    const { rows } = await this.q.query('SELECT * FROM calls WHERE id = $1', [id]);
    return rows[0] as unknown as CallRow | undefined;
  }

  async listCalls(limit = 100): Promise<CallRow[]> {
    const { rows } = await this.q.query('SELECT * FROM calls ORDER BY started_at DESC LIMIT $1', [limit]);
    return rows as unknown as CallRow[];
  }

  // ── Tours / transcription ──────────────────────────────────
  async addTurn(callId: string, who: 'user' | 'agent', text: string, latencyMs: number | null): Promise<void> {
    await this.q.query('INSERT INTO turns (call_id, who, text, latency_ms) VALUES ($1, $2, $3, $4)', [
      callId,
      who,
      text,
      latencyMs,
    ]);
  }

  async listTurns(callId: string): Promise<{ who: string; text: string; latency_ms: number | null; at: string }[]> {
    const { rows } = await this.q.query(
      'SELECT who, text, latency_ms, at FROM turns WHERE call_id = $1 ORDER BY id',
      [callId],
    );
    return rows as unknown as { who: string; text: string; latency_ms: number | null; at: string }[];
  }

  // ── Outils ─────────────────────────────────────────────────
  async addToolCall(callId: string, name: string, argsJson: string, ok: boolean, resultJson: string): Promise<void> {
    await this.q.query('INSERT INTO tool_calls (call_id, name, args_json, ok, result_json) VALUES ($1, $2, $3, $4, $5)', [
      callId,
      name,
      argsJson,
      ok,
      resultJson,
    ]);
  }

  async listToolCalls(callId: string): Promise<{ name: string; args_json: string; ok: boolean; at: string }[]> {
    const { rows } = await this.q.query(
      'SELECT name, args_json, ok, at FROM tool_calls WHERE call_id = $1 ORDER BY id',
      [callId],
    );
    return rows as unknown as { name: string; args_json: string; ok: boolean; at: string }[];
  }

  // ── SMS ────────────────────────────────────────────────────
  async addSms(callId: string | null, toNumber: string, body: string, fromLabel = 'Nextiaa Voice'): Promise<SmsRow> {
    const { rows } = await this.q.query(
      'INSERT INTO sms (call_id, to_number, from_label, body) VALUES ($1, $2, $3, $4) RETURNING *',
      [callId, toNumber, fromLabel, body],
    );
    return rows[0] as unknown as SmsRow;
  }

  async listSms(limit = 100): Promise<SmsRow[]> {
    const { rows } = await this.q.query('SELECT * FROM sms ORDER BY at DESC LIMIT $1', [limit]);
    return rows as unknown as SmsRow[];
  }

  async listSmsByCall(callId: string): Promise<SmsRow[]> {
    const { rows } = await this.q.query('SELECT * FROM sms WHERE call_id = $1 ORDER BY at', [callId]);
    return rows as unknown as SmsRow[];
  }

  // ── Tickets ────────────────────────────────────────────────
  async nextTicketReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `NXV-${year}-`;
    const { rows } = await this.q.query(
      'SELECT reference FROM tickets WHERE reference LIKE $1 ORDER BY reference DESC LIMIT 1',
      [`${prefix}%`],
    );
    const last = rows[0] ? parseInt((rows[0].reference as string).slice(prefix.length), 10) : 0;
    return `${prefix}${String(last + 1).padStart(4, '0')}`;
  }

  async createTicket(row: {
    reference: string;
    callId: string | null;
    category: string;
    summary: string;
    priority: string;
  }): Promise<TicketRow> {
    const { rows } = await this.q.query(
      'INSERT INTO tickets (reference, call_id, category, summary, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [row.reference, row.callId, row.category, row.summary, row.priority],
    );
    return rows[0] as unknown as TicketRow;
  }

  async listTickets(limit = 100): Promise<TicketRow[]> {
    const { rows } = await this.q.query('SELECT * FROM tickets ORDER BY at DESC LIMIT $1', [limit]);
    return rows as unknown as TicketRow[];
  }

  async getTicket(reference: string): Promise<TicketRow | undefined> {
    const { rows } = await this.q.query('SELECT * FROM tickets WHERE reference = $1', [reference]);
    return rows[0] as unknown as TicketRow | undefined;
  }

  // ── Dossiers (assurance) ───────────────────────────────────
  async getCase(reference: string): Promise<CaseRow | undefined> {
    const { rows } = await this.q.query('SELECT * FROM cases WHERE reference = $1', [reference]);
    return rows[0] as unknown as CaseRow | undefined;
  }

  async caseCount(): Promise<number> {
    const { rows } = await this.q.query('SELECT COUNT(*)::int AS n FROM cases');
    return (rows[0]?.n as number) ?? 0;
  }

  async upsertCase(row: Omit<CaseRow, 'updated_at'>): Promise<void> {
    await this.q.query(
      `INSERT INTO cases (reference, owner_number, status, detail, next_step, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (reference) DO UPDATE SET
         owner_number = $2, status = $3, detail = $4, next_step = $5, updated_at = now()`,
      [row.reference, row.owner_number, row.status, row.detail, row.next_step],
    );
  }

  // ── Statistiques (console) ─────────────────────────────────
  async topKbQueries(limit = 10): Promise<{ query: string; count: number }[]> {
    const { rows } = await this.q.query("SELECT args_json FROM tool_calls WHERE name = 'search_knowledge_base'");
    const counts = new Map<string, number>();
    for (const r of rows) {
      try {
        const q = (JSON.parse(r.args_json as string) as { query?: string }).query?.trim().toLowerCase();
        if (q) counts.set(q, (counts.get(q) ?? 0) + 1);
      } catch {
        /* ignore */
      }
    }
    return [...counts.entries()]
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async dashboard(): Promise<{ total: number; avgDurationSec: number; transferredPct: number; avgLatencyMs: number }> {
    const { rows } = await this.q.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(AVG(duration_sec), 0)::float AS avgdur,
              COUNT(*) FILTER (WHERE status = 'transferred')::int AS transferred
       FROM calls`,
    );
    const { rows: lat } = await this.q.query(
      'SELECT COALESCE(AVG(latency_ms), 0)::float AS avglat FROM turns WHERE latency_ms IS NOT NULL',
    );
    const total = (rows[0]?.total as number) ?? 0;
    const transferred = (rows[0]?.transferred as number) ?? 0;
    return {
      total,
      avgDurationSec: Math.round((rows[0]?.avgdur as number) ?? 0),
      transferredPct: total > 0 ? Math.round((transferred / total) * 100) : 0,
      avgLatencyMs: Math.round((lat[0]?.avglat as number) ?? 0),
    };
  }

  /** Sème la base de connaissances depuis data/knowledge/*.json (si vide). */
  async seedKnowledgeIfEmpty(): Promise<void> {
    if ((await this.kbCount()) > 0) return;
    const dir = config.knowledgeDir;
    if (!existsSync(dir)) {
      logger.warn({ dir }, 'Dossier data/knowledge introuvable : base de connaissances vide');
      return;
    }
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    let count = 0;
    for (const file of files) {
      try {
        const parsed = JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as Partial<KbRow>[];
        for (const f of parsed) {
          await this.kbUpsert({
            id: String(f.id),
            category: String(f.category),
            operator: (f.operator as string | null) ?? null,
            title: String(f.title),
            content: String(f.content),
            source: (f.source as string | null) ?? null,
            last_verified: (f.last_verified as string | null) ?? (f as { lastVerified?: string }).lastVerified ?? null,
            verified: Boolean(f.verified),
          });
          count++;
        }
      } catch (err) {
        logger.error({ file, err }, 'Échec import fiche KB');
      }
    }
    logger.info({ count }, 'Base de connaissances initialisée');
  }

  async close(): Promise<void> {
    await (this.q as { end?: () => Promise<void> }).end?.();
  }
}
