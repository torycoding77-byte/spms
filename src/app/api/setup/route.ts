import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 테이블 존재 여부 확인
  const { error: checkError } = await supabase
    .from('housekeeping_logs')
    .select('id')
    .limit(1);

  if (!checkError) {
    return NextResponse.json({ message: 'Table already exists', status: 'ok' });
  }

  // 테이블이 없으면 RPC로 생성 시도 (service_role 필요)
  // anon key로는 DDL 불가 - 수동 생성 안내
  return NextResponse.json({
    status: 'table_missing',
    message: 'housekeeping_logs 테이블이 없습니다. Supabase 대시보드 SQL Editor에서 아래 SQL을 실행해주세요.',
    sql: `CREATE TABLE IF NOT EXISTS housekeeping_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_number TEXT NOT NULL,
  cleaner_name TEXT NOT NULL,
  cleaned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_housekeeping_cleaned_at ON housekeeping_logs(cleaned_at);
CREATE INDEX IF NOT EXISTS idx_housekeeping_room ON housekeeping_logs(room_number);

-- RLS 정책 (anon 키 사용을 위해)
ALTER TABLE housekeeping_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON housekeeping_logs FOR ALL USING (true) WITH CHECK (true);`,
  });
}
