-- Flamingo PMS - Supabase Migration
-- Supabase SQL Editor에서 이 스크립트를 실행하세요.

-- 1. Reservations 테이블
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('yanolja', 'yeogi', 'walkin')),
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'standard',
  guest_name TEXT NOT NULL,
  guest_phone TEXT DEFAULT '',
  guest_vehicle TEXT,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  sale_price INTEGER NOT NULL DEFAULT 0,
  settlement_price INTEGER NOT NULL DEFAULT 0,
  commission INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'ota_transfer' CHECK (payment_method IN ('cash', 'card', 'ota_transfer')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- external_id 기반 upsert용 unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_external_id ON reservations (external_id);
-- 날짜 범위 조회 최적화
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations (check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON reservations (check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations (room_number);

-- 2. Rooms 테이블
CREATE TABLE IF NOT EXISTS rooms (
  room_number TEXT PRIMARY KEY,
  room_type TEXT NOT NULL DEFAULT 'standard',
  floor INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance', 'blocked')),
  notes TEXT NOT NULL DEFAULT '',
  last_cleaned TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 301호~325호 초기 데이터 삽입
INSERT INTO rooms (room_number, room_type, floor, status, notes, is_active)
SELECT
  (300 + i)::text,
  'standard',
  3,
  'available',
  '',
  true
FROM generate_series(1, 25) AS i
ON CONFLICT (room_number) DO NOTHING;

-- 3. Expenses 테이블
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);

-- 4. VIP Guests 테이블
CREATE TABLE IF NOT EXISTS vip_guests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  visit_count INTEGER NOT NULL DEFAULT 0,
  preferred_room TEXT,
  notes TEXT NOT NULL DEFAULT '',
  last_visit TIMESTAMPTZ
);

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 6. RLS (Row Level Security) - 공개 접근 허용 (인증 추가 시 변경)
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to vip_guests" ON vip_guests FOR ALL USING (true) WITH CHECK (true);

-- 7. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
