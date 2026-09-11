import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

const SCHEMA_PATH = fileURLToPath(new URL('./schema.sql', import.meta.url));

export interface KbRow {
  id: string;
  category: string;
  operator: string | null;
  title: string;
  content: string;
  source: string | null;
  last_verified: string | null;
  verified: number;
  updated_at: string;
}

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
 * Accès SQLite (better-sqlite3, synchrone — parfait pour des outils < 300 ms).
 * Ouvre/crée le fichier, applique le schéma, sème les données fictives au
 * premier démarrage.
 */
export class Repository {
  private readonly db: Database.Database;

  constructor(dbPath: string = config.dbPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  }

  // ── Base de connaissances ──────────────────────────────────
  kbCount(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM kb').get() as { n: number }).n;
  }

  kbAll(): KbRow[] {
    return this.db.prepare('SELECT * FROM kb ORDER BY category, title').all() as KbRow[];
  }

  /** Fiches candidates pour la recherche (Fuse.js filtre ensuite). */
  kbForSearch(category?: string, operator?: string): KbRow[] {
    let sql = 'SELECT * FROM kb WHERE verified = 1';
    const params: string[] = [];
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (operator) {
      sql += ' AND (operator = ? OR operator IS NULL)';
      params.push(operator);
    }
    return this.db.prepare(sql).all(...params) as KbRow[];
  }

  kbUpsert(row: Omit<KbRow, 'updated_at'>): void {
    this.db
      .prepare(
        `INSERT INTO kb (id, category, operator, title, content, source, last_verified, verified, updated_at)
         VALUES (@id, @category, @operator, @title, @content, @source, @last_verified, @verified, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           category=@category, operator=@operator, title=@title, content=@content,
           source=@source, last_verified=@last_verified, verified=@verified, updated_at=datetime('now')`,
      )
      .run(row);
  }

  kbSetVerified(id: string, verified: boolean, lastVerified: string): void {
    this.db
      .prepare("UPDATE kb SET verified = ?, last_verified = ?, updated_at = datetime('now') WHERE id = ?")
      .run(verified ? 1 : 0, lastVerified, id);
  }

  kbDelete(id: string): void {
    this.db.prepare('DELETE FROM kb WHERE id = ?').run(id);
  }

  // ── Appels ─────────────────────────────────────────────────
  createCall(row: Omit<CallRow, 'started_at' | 'ended_at' | 'duration_sec' | 'status' | 'reason' | 'usage_json'>): void {
    this.db
      .prepare(
        `INSERT INTO calls (id, caller_number, dialed, sim_operator, access_mode, phone_quality)
         VALUES (@id, @caller_number, @dialed, @sim_operator, @access_mode, @phone_quality)`,
      )
      .run(row);
  }

  endCall(id: string, durationSec: number, status: string, reason: string, usageJson: string | null): void {
    this.db
      .prepare(
        `UPDATE calls SET ended_at = datetime('now'), duration_sec = ?, status = ?, reason = ?, usage_json = ?
         WHERE id = ?`,
      )
      .run(durationSec, status, reason, usageJson, id);
  }

  setCallStatus(id: string, status: string): void {
    this.db.prepare('UPDATE calls SET status = ? WHERE id = ?').run(status, id);
  }

  getCall(id: string): CallRow | undefined {
    return this.db.prepare('SELECT * FROM calls WHERE id = ?').get(id) as CallRow | undefined;
  }

  listCalls(limit = 100): CallRow[] {
    return this.db.prepare('SELECT * FROM calls ORDER BY started_at DESC LIMIT ?').all(limit) as CallRow[];
  }

  // ── Tours / transcription ──────────────────────────────────
  addTurn(callId: string, who: 'user' | 'agent', text: string, latencyMs: number | null): void {
    this.db.prepare('INSERT INTO turns (call_id, who, text, latency_ms) VALUES (?, ?, ?, ?)').run(
      callId,
      who,
      text,
      latencyMs,
    );
  }

  listTurns(callId: string): { who: string; text: string; latency_ms: number | null; at: string }[] {
    return this.db.prepare('SELECT who, text, latency_ms, at FROM turns WHERE call_id = ? ORDER BY id').all(callId) as {
      who: string;
      text: string;
      latency_ms: number | null;
      at: string;
    }[];
  }

  // ── Outils ─────────────────────────────────────────────────
  addToolCall(callId: string, name: string, argsJson: string, ok: boolean, resultJson: string): void {
    this.db
      .prepare('INSERT INTO tool_calls (call_id, name, args_json, ok, result_json) VALUES (?, ?, ?, ?, ?)')
      .run(callId, name, argsJson, ok ? 1 : 0, resultJson);
  }

  listToolCalls(callId: string): { name: string; args_json: string; ok: number; at: string }[] {
    return this.db
      .prepare('SELECT name, args_json, ok, at FROM tool_calls WHERE call_id = ? ORDER BY id')
      .all(callId) as { name: string; args_json: string; ok: number; at: string }[];
  }

  // ── SMS ────────────────────────────────────────────────────
  addSms(callId: string | null, toNumber: string, body: string, fromLabel = 'Nextiaa Voice'): SmsRow {
    const info = this.db
      .prepare('INSERT INTO sms (call_id, to_number, from_label, body) VALUES (?, ?, ?, ?)')
      .run(callId, toNumber, fromLabel, body);
    return this.db.prepare('SELECT * FROM sms WHERE id = ?').get(info.lastInsertRowid as number) as SmsRow;
  }

  listSms(limit = 100): SmsRow[] {
    return this.db.prepare('SELECT * FROM sms ORDER BY at DESC LIMIT ?').all(limit) as SmsRow[];
  }

  // ── Tickets ────────────────────────────────────────────────
  /** Génère une référence NXV-<année>-NNNN séquentielle. */
  nextTicketReference(): string {
    const year = new Date().getFullYear();
    const prefix = `NXV-${year}-`;
    const row = this.db
      .prepare("SELECT reference FROM tickets WHERE reference LIKE ? ORDER BY reference DESC LIMIT 1")
      .get(`${prefix}%`) as { reference: string } | undefined;
    const last = row ? parseInt(row.reference.slice(prefix.length), 10) : 0;
    return `${prefix}${String(last + 1).padStart(4, '0')}`;
  }

  createTicket(row: { reference: string; callId: string | null; category: string; summary: string; priority: string }): TicketRow {
    this.db
      .prepare('INSERT INTO tickets (reference, call_id, category, summary, priority) VALUES (?, ?, ?, ?, ?)')
      .run(row.reference, row.callId, row.category, row.summary, row.priority);
    return this.db.prepare('SELECT * FROM tickets WHERE reference = ?').get(row.reference) as TicketRow;
  }

  listTickets(limit = 100): TicketRow[] {
    return this.db.prepare('SELECT * FROM tickets ORDER BY at DESC LIMIT ?').all(limit) as TicketRow[];
  }

  getTicket(reference: string): TicketRow | undefined {
    return this.db.prepare('SELECT * FROM tickets WHERE reference = ?').get(reference) as TicketRow | undefined;
  }

  // ── Dossiers (assurance) ───────────────────────────────────
  getCase(reference: string): CaseRow | undefined {
    return this.db.prepare('SELECT * FROM cases WHERE reference = ?').get(reference) as CaseRow | undefined;
  }

  caseCount(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM cases').get() as { n: number }).n;
  }

  upsertCase(row: Omit<CaseRow, 'updated_at'>): void {
    this.db
      .prepare(
        `INSERT INTO cases (reference, owner_number, status, detail, next_step, updated_at)
         VALUES (@reference, @owner_number, @status, @detail, @next_step, datetime('now'))
         ON CONFLICT(reference) DO UPDATE SET
           owner_number=@owner_number, status=@status, detail=@detail, next_step=@next_step, updated_at=datetime('now')`,
      )
      .run(row);
  }

  // ── Statistiques (console) ─────────────────────────────────
  topKbQueries(limit = 10): { query: string; count: number }[] {
    // Les requêtes envoyées à search_knowledge_base (extraites du JSON des args).
    const rows = this.db
      .prepare("SELECT args_json FROM tool_calls WHERE name = 'search_knowledge_base'")
      .all() as { args_json: string }[];
    const counts = new Map<string, number>();
    for (const r of rows) {
      try {
        const q = (JSON.parse(r.args_json) as { query?: string }).query?.trim().toLowerCase();
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

  /** Statistiques agrégées du tableau de bord. */
  dashboard(): { total: number; avgDurationSec: number; transferredPct: number; avgLatencyMs: number } {
    const total = (this.db.prepare('SELECT COUNT(*) AS n FROM calls').get() as { n: number }).n;
    const avgDur = (this.db.prepare('SELECT AVG(duration_sec) AS a FROM calls WHERE duration_sec IS NOT NULL').get() as {
      a: number | null;
    }).a;
    const transferred = (this.db.prepare("SELECT COUNT(*) AS n FROM calls WHERE status = 'transferred'").get() as {
      n: number;
    }).n;
    const avgLat = (this.db.prepare('SELECT AVG(latency_ms) AS a FROM turns WHERE latency_ms IS NOT NULL').get() as {
      a: number | null;
    }).a;
    return {
      total,
      avgDurationSec: Math.round(avgDur ?? 0),
      transferredPct: total > 0 ? Math.round((transferred / total) * 100) : 0,
      avgLatencyMs: Math.round(avgLat ?? 0),
    };
  }

  /** Sème la base de connaissances depuis data/knowledge/*.json (si vide). */
  seedKnowledgeIfEmpty(): void {
    if (this.kbCount() > 0) return;
    const dir = config.knowledgeDir;
    if (!existsSync(dir)) {
      logger.warn({ dir }, 'Dossier data/knowledge introuvable : base de connaissances vide');
      return;
    }
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    let count = 0;
    const insert = this.db.transaction((rows: Omit<KbRow, 'updated_at'>[]) => {
      for (const r of rows) this.kbUpsert(r);
    });
    for (const file of files) {
      try {
        const raw = readFileSync(resolve(dir, file), 'utf8');
        const parsed = JSON.parse(raw) as Partial<KbRow>[];
        const rows = parsed.map((f) => ({
          id: String(f.id),
          category: String(f.category),
          operator: (f.operator as string | null) ?? null,
          title: String(f.title),
          content: String(f.content),
          source: (f.source as string | null) ?? null,
          last_verified: (f.last_verified as string | null) ?? (f as { lastVerified?: string }).lastVerified ?? null,
          verified: f.verified ? 1 : 0,
        }));
        insert(rows);
        count += rows.length;
      } catch (err) {
        logger.error({ file, err }, 'Échec import fiche KB');
      }
    }
    logger.info({ count }, 'Base de connaissances initialisée');
  }

  close(): void {
    this.db.close();
  }
}
