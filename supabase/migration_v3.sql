-- V3: Add stay_type column to reservations
-- Run this in Supabase SQL Editor

-- Add stay_type enum
DO $$ BEGIN
  CREATE TYPE stay_type AS ENUM ('hourly', 'nightly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add column with default 'nightly'
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS stay_type stay_type NOT NULL DEFAULT 'nightly';

-- Update existing records: if check_in to check_out <= 6 hours, mark as hourly
UPDATE reservations
SET stay_type = 'hourly'
WHERE EXTRACT(EPOCH FROM (check_out::timestamp - check_in::timestamp)) / 3600 <= 6
  AND stay_type = 'nightly';
