'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Reservation, Room, Expense } from '@/types';
import { Loader2 } from 'lucide-react';
import { showToast } from './Toast';

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { initialize, loading, error, _syncReservation, _removeReservation, _syncRoom, _syncExpense, _removeExpense } = useStore();
  const [realtimeOk, setRealtimeOk] = useState(false);

  // 앱 시작 시 데이터 로드
  useEffect(() => {
    initialize().catch(() => {});
  }, [initialize]);

  // Realtime 구독 - 에러 핸들링 포함
  useEffect(() => {
    let channels: ReturnType<typeof supabase.channel>[] = [];

    try {
      const reservationsChannel = supabase
        .channel('reservations-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reservations' },
          (payload) => {
            try {
              if (payload.eventType === 'DELETE') {
                _removeReservation((payload.old as { id: string }).id);
              } else {
                const newRes = payload.new as Reservation;
                _syncReservation({ ...newRes, stay_type: newRes.stay_type || 'nightly' });

                // VIP 체크인 자동 알림
                if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && newRes.status === 'checked_in')) {
                  const { vipGuests } = useStore.getState();
                  const vip = vipGuests.find(
                    (v) => v.name === newRes.guest_name || v.phone === newRes.guest_phone
                  );
                  if (vip) {
                    showToast({
                      type: 'warning',
                      title: `VIP 고객 알림`,
                      message: `${vip.name}님 체크인! ${vip.preferred_room ? vip.preferred_room + '호 선호' : ''}`,
                    });
                  }
                }
              }
            } catch { /* ignore payload errors */ }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') setRealtimeOk(true);
        });

      const roomsChannel = supabase
        .channel('rooms-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rooms' },
          (payload) => {
            try { _syncRoom(payload.new as Room); } catch { /* ignore */ }
          }
        )
        .subscribe();

      const expensesChannel = supabase
        .channel('expenses-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expenses' },
          (payload) => {
            try {
              if (payload.eventType === 'DELETE') {
                _removeExpense((payload.old as { id: string }).id);
              } else {
                _syncExpense(payload.new as Expense);
              }
            } catch { /* ignore */ }
          }
        )
        .subscribe();

      channels = [reservationsChannel, roomsChannel, expensesChannel];
    } catch {
      // Realtime 구독 실패 시 무시 (오프라인 모드)
    }

    return () => {
      channels.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch { /* ignore */ }
      });
    };
  }, [_syncReservation, _removeReservation, _syncRoom, _syncExpense, _removeExpense]);

  // 에러 자동 클리어 (5초)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (error) {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        useStore.setState({ error: null });
      }, 5000);
    }
    return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); };
  }, [error]);

  return (
    <>
      {loading && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 border">
          <Loader2 className="animate-spin text-pink-500" size={16} />
          <span className="text-sm text-gray-500">데이터 동기화 중...</span>
        </div>
      )}
      {error && !loading && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 border border-red-200">
          <span className="text-sm text-red-600">{error}</span>
          <button onClick={() => initialize().catch(() => {})} className="text-xs text-red-500 underline ml-2">재시도</button>
        </div>
      )}
      {children}
    </>
  );
}
