import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room_number, cleaner_name } = body;

    if (!room_number || !cleaner_name) {
      return NextResponse.json({ error: 'room_number and cleaner_name required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. 청소 기록 저장
    const { data: log, error: logError } = await supabase
      .from('housekeeping_logs')
      .insert({ room_number, cleaner_name, cleaned_at: now })
      .select()
      .single();

    if (logError) {
      console.error('[API] housekeeping log insert failed:', logError);
      return NextResponse.json({ error: 'Failed to insert log', detail: logError.message }, { status: 500 });
    }

    // 2. 객실 상태를 판매가능으로 변경
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ status: 'available', last_cleaned: now })
      .eq('room_number', room_number);

    if (roomError) {
      console.error('[API] room status update failed:', roomError);
      return NextResponse.json({
        log,
        room_updated: false,
        room_error: roomError.message,
      });
    }

    console.log(`[API] Room ${room_number} → available, log saved`);
    return NextResponse.json({ log, room_updated: true });
  } catch (err) {
    console.error('[API] housekeeping complete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
