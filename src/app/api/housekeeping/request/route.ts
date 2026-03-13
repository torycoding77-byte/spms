import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function getKSTToday() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

// 청소 요청 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';
  const today = getKSTToday();

  try {
    const { data, error } = await supabase
      .from('cleaning_requests')
      .select('*')
      .eq('status', status)
      .gte('created_at', today + 'T00:00:00+09:00')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ data: [], fallback: true });
    }
    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ data: [], fallback: true });
  }
}

// 청소 요청 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room_number, requested_by, message } = body;

    if (!room_number) {
      return NextResponse.json({ error: 'room_number required' }, { status: 400 });
    }

    // 객실 상태를 '청소중'으로 변경
    await supabase
      .from('rooms')
      .update({ status: 'cleaning' })
      .eq('room_number', room_number);

    // 청소 요청 저장
    const { data, error } = await supabase
      .from('cleaning_requests')
      .insert({
        room_number,
        requested_by: requested_by || '관리자',
        message: message || `${room_number}호 청소 요청`,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      const fallbackData = {
        id: crypto.randomUUID(),
        room_number,
        requested_by: requested_by || '관리자',
        message: message || `${room_number}호 청소 요청`,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      return NextResponse.json({ data: fallbackData, fallback: true });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] cleaning request error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 청소 요청 상태 변경 (accepted, completed)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cleaning_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ data: { id, status }, fallback: true });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] cleaning request patch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
