-- Flamingo PMS - V2 Migration (3단계 + 4단계)
-- Supabase SQL Editor에서 실행하세요.

-- 1. 유지보수 기록 테이블
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_number TEXT NOT NULL REFERENCES rooms(room_number),
  category TEXT NOT NULL DEFAULT 'repair',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  cost INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_maintenance_room ON maintenance_logs (room_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_logs (status);

-- 2. 수수료율 관리 테이블
CREATE TABLE IF NOT EXISTS commission_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source TEXT NOT NULL CHECK (source IN ('yanolja', 'yeogi')),
  room_type TEXT NOT NULL DEFAULT 'standard',
  rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  promo_rate_percent NUMERIC(5,2),
  promo_start DATE,
  promo_end DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기본 수수료율 삽입 (야놀자 15%, 여기어때 12%)
INSERT INTO commission_rates (source, room_type, rate_percent) VALUES
  ('yanolja', 'standard', 15.0),
  ('yanolja', 'deluxe', 15.0),
  ('yeogi', 'standard', 12.0),
  ('yeogi', 'deluxe', 12.0)
ON CONFLICT DO NOTHING;

-- 3. 일 마감 기록 테이블
CREATE TABLE IF NOT EXISTS daily_closings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL UNIQUE,
  total_sales INTEGER NOT NULL DEFAULT 0,
  cash_sales INTEGER NOT NULL DEFAULT 0,
  card_sales INTEGER NOT NULL DEFAULT 0,
  ota_sales INTEGER NOT NULL DEFAULT 0,
  total_commission INTEGER NOT NULL DEFAULT 0,
  total_expenses INTEGER NOT NULL DEFAULT 0,
  net_profit INTEGER NOT NULL DEFAULT 0,
  occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  reservation_count INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_closings_date ON daily_closings (date);

-- 4. RLS 정책
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to maintenance_logs" ON maintenance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to commission_rates" ON commission_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to daily_closings" ON daily_closings FOR ALL USING (true) WITH CHECK (true);

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_logs;
