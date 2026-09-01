-- Drop auth/users entirely
DROP TABLE IF EXISTS watchlist_items;
DROP TABLE IF EXISTS watchlists;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS users;

-- Symbols master table (shared)
CREATE TABLE IF NOT EXISTS symbols (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO symbols(symbol, name) VALUES
('AAPL','Apple Inc.'),
('MSFT','Microsoft'),
('GOOG','Alphabet')
ON CONFLICT DO NOTHING;

-- Registered accounts (guests never get a row here)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cash balance per session (guest or registered), seeded with starting capital
CREATE TABLE IF NOT EXISTS account_balances (
  session_id TEXT PRIMARY KEY,
  cash_balance NUMERIC NOT NULL DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Positions (scoped to a session/browser)
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  symbol TEXT NOT NULL REFERENCES symbols(symbol),
  quantity NUMERIC NOT NULL,
  avg_cost NUMERIC NOT NULL,
  UNIQUE(session_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_positions_session ON positions(session_id);

-- Alerts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_dir') THEN
    CREATE TYPE alert_dir AS ENUM ('gte','lte');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  symbol TEXT NOT NULL REFERENCES symbols(symbol),
  alert_type TEXT NOT NULL DEFAULT 'price_threshold' CHECK (alert_type IN ('price_threshold', 'percent_move')),
  direction alert_dir,
  target NUMERIC,
  movement_direction TEXT CHECK (movement_direction IN ('up', 'down', 'either')),
  percent_threshold NUMERIC,
  baseline_price NUMERIC,
  last_state TEXT,
  last_triggered_at TIMESTAMPTZ,
  CONSTRAINT alerts_shape_chk CHECK (
    (alert_type = 'price_threshold' AND direction IS NOT NULL AND target IS NOT NULL AND movement_direction IS NULL AND percent_threshold IS NULL)
    OR
    (alert_type = 'percent_move' AND direction IS NULL AND target IS NULL AND movement_direction IS NOT NULL AND percent_threshold IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_session ON alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_alerts_session_symbol ON alerts(session_id, symbol);
