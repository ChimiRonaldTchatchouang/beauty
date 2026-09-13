-- Schéma PostgreSQL Nextiaa Voice (Neon) — données de démonstration FICTIVES.
-- Exécuté au démarrage, instruction par instruction (idempotent : IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS kb (
  id            TEXT PRIMARY KEY,
  category      TEXT NOT NULL,           -- operateurs | depannage | assurance | general
  operator      TEXT,                    -- orange | mtn | NULL
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  source        TEXT,
  last_verified TEXT,                    -- date ISO (AAAA-MM-JJ)
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calls (
  id            TEXT PRIMARY KEY,        -- callId
  caller_number TEXT NOT NULL,
  dialed        TEXT NOT NULL,
  sim_operator  TEXT NOT NULL,
  access_mode   TEXT NOT NULL,           -- direct | ussd_callback
  phone_quality BOOLEAN NOT NULL DEFAULT FALSE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  duration_sec  INTEGER,
  status        TEXT NOT NULL DEFAULT 'in_progress',
  reason        TEXT,
  usage_json    TEXT
);

CREATE TABLE IF NOT EXISTS turns (
  id         BIGSERIAL PRIMARY KEY,
  call_id    TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  who        TEXT NOT NULL,             -- user | agent
  text       TEXT NOT NULL,
  latency_ms INTEGER,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id          BIGSERIAL PRIMARY KEY,
  call_id     TEXT REFERENCES calls(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  args_json   TEXT NOT NULL,
  ok          BOOLEAN NOT NULL DEFAULT TRUE,
  result_json TEXT,
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms (
  id         BIGSERIAL PRIMARY KEY,
  call_id    TEXT REFERENCES calls(id) ON DELETE SET NULL,
  to_number  TEXT NOT NULL,
  from_label TEXT NOT NULL DEFAULT 'Nextiaa Voice',
  body       TEXT NOT NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id        BIGSERIAL PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,        -- NXV-2026-0001
  call_id   TEXT REFERENCES calls(id) ON DELETE SET NULL,
  category  TEXT NOT NULL,
  summary   TEXT NOT NULL,
  priority  TEXT NOT NULL,              -- haute | moyenne | normale
  status    TEXT NOT NULL DEFAULT 'ouvert',
  at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cases (
  reference    TEXT PRIMARY KEY,         -- SIN-2026-001
  owner_number TEXT NOT NULL,
  status       TEXT NOT NULL,
  detail       TEXT NOT NULL,
  next_step    TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_turns_call ON turns(call_id);
CREATE INDEX IF NOT EXISTS idx_toolcalls_call ON tool_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_sms_call ON sms(call_id);
CREATE INDEX IF NOT EXISTS idx_kb_category ON kb(category);
