-- Schéma SQLite Nextiaa Voice (données de démonstration FICTIVES uniquement).
-- Exécuté au démarrage (idempotent grâce à IF NOT EXISTS).

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Base de connaissances (fiches importées depuis data/knowledge/).
CREATE TABLE IF NOT EXISTS kb (
  id            TEXT PRIMARY KEY,
  category      TEXT NOT NULL,           -- operateurs | depannage | assurance | general
  operator      TEXT,                    -- orange | mtn | NULL
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  source        TEXT,
  last_verified TEXT,                    -- ISO date
  verified      INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Appels.
CREATE TABLE IF NOT EXISTS calls (
  id            TEXT PRIMARY KEY,        -- callId
  caller_number TEXT NOT NULL,
  dialed        TEXT NOT NULL,
  sim_operator  TEXT NOT NULL,
  access_mode   TEXT NOT NULL,           -- direct | ussd_callback
  phone_quality INTEGER NOT NULL DEFAULT 0,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at      TEXT,
  duration_sec  INTEGER,
  status        TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | resolved | transferred | error | ended
  reason        TEXT,
  usage_json    TEXT                     -- consommation Gemini (JSON)
);

-- Tours de conversation (transcriptions horodatées + latence).
CREATE TABLE IF NOT EXISTS turns (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id    TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  who        TEXT NOT NULL,             -- user | agent
  text       TEXT NOT NULL,
  latency_ms INTEGER,
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Appels d'outils (function calling) et leurs résultats.
CREATE TABLE IF NOT EXISTS tool_calls (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id     TEXT REFERENCES calls(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  args_json   TEXT NOT NULL,
  ok          INTEGER NOT NULL DEFAULT 1,
  result_json TEXT,
  at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SMS simulés.
CREATE TABLE IF NOT EXISTS sms (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id    TEXT REFERENCES calls(id) ON DELETE SET NULL,
  to_number  TEXT NOT NULL,
  from_label TEXT NOT NULL DEFAULT 'Nextiaa Voice',
  body       TEXT NOT NULL,
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tickets (incidents / transferts).
CREATE TABLE IF NOT EXISTS tickets (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,        -- NXV-2026-0001
  call_id   TEXT REFERENCES calls(id) ON DELETE SET NULL,
  category  TEXT NOT NULL,
  summary   TEXT NOT NULL,
  priority  TEXT NOT NULL,              -- haute | moyenne | normale
  status    TEXT NOT NULL DEFAULT 'ouvert',
  at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dossiers de sinistre (assurance) FICTIFS.
CREATE TABLE IF NOT EXISTS cases (
  reference    TEXT PRIMARY KEY,         -- SIN-2026-001
  owner_number TEXT NOT NULL,           -- numéro fictif rattaché
  status       TEXT NOT NULL,
  detail       TEXT NOT NULL,
  next_step    TEXT NOT NULL,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_turns_call ON turns(call_id);
CREATE INDEX IF NOT EXISTS idx_toolcalls_call ON tool_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_sms_call ON sms(call_id);
CREATE INDEX IF NOT EXISTS idx_kb_category ON kb(category);
