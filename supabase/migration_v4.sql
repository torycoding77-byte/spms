-- V4: Add reserved_at / cancelled_at to reservations
-- Run this in Supabase SQL Editor

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 기존 레코드는 created_at을 reserved_at 기본값으로 사용
UPDATE reservations
SET reserved_at = created_at
WHERE reserved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_reserved_at ON reservations (reserved_at);
