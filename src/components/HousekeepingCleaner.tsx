'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { HousekeepingLog } from '@/types';
import { cn } from '@/lib/utils';
import { SprayCan, X, Trash2, Clock, Check } from 'lucide-react';
import { fetchHousekeepingLogs, deleteHousekeepingLog } from '@/lib/supabase-db-v2';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatNow() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function HousekeepingCleaner() {
  const { rooms } = useStore();
  const { adminName } = useAuthStore();
  const [todayLogs, setTodayLogs] = useState<HousekeepingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  // 확인 팝업: 어떤 방을 청소 완료할지
  const [confirmRoom, setConfirmRoom] = useState<string | null>(null);
  const [confirmTime, setConfirmTime] = useState('');
  // 이력 상세 모달
  const [detailRoom, setDetailRoom] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadToday = useCallback(async () => {
    try {
      const logs = await fetchHousekeepingLogs(today, today);
      setTodayLogs(logs);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  // 확인 팝업이 열려있는 동안 시간 업데이트
  useEffect(() => {
    if (!confirmRoom) return;
    setConfirmTime(formatNow());
    const timer = setInterval(() => setConfirmTime(formatNow()), 1000);
    return () => clearInterval(timer);
  }, [confirmRoom]);

  const activeRooms = rooms.filter((r) => r.is_active).sort((a, b) =>
    a.room_number.localeCompare(b.room_number, undefined, { numeric: true })
  );

  // 객실별 로그 그룹핑
  const logsByRoom = new Map<string, HousekeepingLog[]>();
  todayLogs.forEach((l) => {
    if (!logsByRoom.has(l.room_number)) logsByRoom.set(l.room_number, []);
    logsByRoom.get(l.room_number)!.push(l);
  });
  logsByRoom.forEach((logs) => logs.sort((a, b) => a.cleaned_at.localeCompare(b.cleaned_at)));

  // 객실 클릭 → 확인 팝업 오픈
  const openConfirm = (roomNumber: string) => {
    setConfirmRoom(roomNumber);
  };

  // 확인 → 서버 API로 청소완료 처리 (청소기록 + 객실상태 동시 변경)
  const handleConfirmClean = async () => {
    if (!confirmRoom || saving) return;
    const targetRoom = confirmRoom;
    setSaving(targetRoom);
    try {
      const res = await fetch('/api/housekeeping/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: targetRoom,
          cleaner_name: adminName,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        console.error(`[HK] API error:`, result);
        alert(`청소 완료 실패: ${result.error || '서버 오류'}`);
        return;
      }

      // 청소 기록 UI 반영
      if (result.log) {
        setTodayLogs((prev) => [result.log, ...prev]);
      }

      // 객실 상태 확인
      if (result.room_updated) {
        console.log(`[HK] Room ${targetRoom} → available 성공`);
      } else {
        console.warn(`[HK] Room ${targetRoom} 상태 변경 실패:`, result.room_error);
        alert(`청소 기록은 저장됐지만 객실 상태 변경 실패: ${result.room_error}`);
      }

      // store 로컬 상태만 동기화 (DB는 이미 API에서 처리됨)
      useStore.setState((state) => ({
        rooms: state.rooms.map((r) =>
          r.room_number === targetRoom
            ? { ...r, status: 'available' as const, last_cleaned: new Date().toISOString() }
            : r
        ),
      }));
    } catch (err) {
      console.error(`[HK] handleConfirmClean 실패:`, err);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(null);
      setConfirmRoom(null);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (saving) return;
    setSaving(logId);
    try {
      await deleteHousekeepingLog(logId);
      setTodayLogs((prev) => {
        const updated = prev.filter((l) => l.id !== logId);
        if (detailRoom) {
          const remaining = updated.filter((l) => l.room_number === detailRoom);
          if (remaining.length === 0) setDetailRoom(null);
        }
        return updated;
      });
    } catch {
      // silently fail
    } finally {
      setSaving(null);
    }
  };

  const cleanedRoomCount = logsByRoom.size;
  const totalCount = activeRooms.length;
  const totalCleanings = todayLogs.length;
  const detailLogs = detailRoom ? (logsByRoom.get(detailRoom) || []) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-3">
          <SprayCan size={16} />
          청소 체크
        </div>
        <p className="text-gray-500 text-sm">{today}</p>
        <div className="mt-2 text-lg font-bold text-gray-800">
          {cleanedRoomCount} <span className="text-sm font-normal text-gray-400">/ {totalCount} 객실</span>
          <span className="text-sm font-normal text-gray-300 ml-2">({totalCleanings}건)</span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(cleanedRoomCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-3 gap-3">
        {activeRooms.map((room) => {
          const roomLogs = logsByRoom.get(room.room_number) || [];
          const cleanCount = roomLogs.length;
          const isCleaned = cleanCount > 0;

          return (
            <button
              key={room.room_number}
              onClick={() => openConfirm(room.room_number)}
              className={cn(
                'relative rounded-xl border-2 p-3 transition-all active:scale-95 text-left',
                isCleaned
                  ? 'bg-green-50 border-green-400 text-green-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">{room.room_number}</span>
                {cleanCount > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                    cleanCount > 1 ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'
                  )}>
                    {cleanCount}회
                  </span>
                )}
              </div>
              {isCleaned ? (
                <div className="mt-1.5 space-y-0.5">
                  {roomLogs.map((log, i) => (
                    <div key={log.id} className="text-[10px] text-green-600 flex items-center gap-1">
                      <Check size={8} className="text-green-400 shrink-0" />
                      {formatTime(log.cleaned_at)}
                    </div>
                  ))}
                  <div className="text-[10px] text-green-400 mt-1">탭하여 추가 청소</div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-400">탭하여 완료</div>
              )}
            </button>
          );
        })}
      </div>

      {totalCount === 0 && (
        <div className="text-center text-gray-400 py-12">
          등록된 객실이 없습니다
        </div>
      )}

      {/* ── 청소 완료 확인 팝업 ── */}
      {confirmRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setConfirmRoom(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 상단 아이콘 영역 */}
            <div className="bg-pink-50 pt-6 pb-4 flex flex-col items-center">
              <div className="w-14 h-14 bg-pink-600 rounded-full flex items-center justify-center mb-3">
                <SprayCan size={24} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{confirmRoom}호</h3>
            </div>

            {/* 본문 */}
            <div className="p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-lg font-mono font-bold text-pink-600 mb-2">
                <Clock size={18} />
                {confirmTime}
              </div>
              <p className="text-sm text-gray-600">
                현재 시간으로 청소를 완료하시겠습니까?
              </p>
              {(logsByRoom.get(confirmRoom)?.length ?? 0) > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  오늘 {logsByRoom.get(confirmRoom)!.length}회 청소 완료됨
                </p>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex border-t">
              <button
                disabled={!!saving}
                onClick={handleConfirmClean}
                className="flex-1 py-3.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 border-r border-red-400"
              >
                {saving ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    저장 중...
                  </div>
                ) : '확인'}
              </button>
              <button
                onClick={() => setConfirmRoom(null)}
                className="flex-1 py-3.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 청소 이력 상세 모달 (카드 길게 누르면 열림) ── */}
      {detailRoom && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={() => setDetailRoom(null)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-2xl max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{detailRoom}호 청소 이력</h3>
                <p className="text-xs text-gray-400">{today} · {detailLogs.length}건</p>
              </div>
              <button onClick={() => setDetailRoom(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: 'calc(70vh - 130px)' }}>
              {detailLogs.map((log, i) => (
                <div key={log.id} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5 border border-green-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-green-600 bg-green-100 w-6 h-6 rounded-full flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{formatTime(log.cleaned_at)}</p>
                      <p className="text-[10px] text-gray-400">{log.cleaner_name}</p>
                    </div>
                  </div>
                  <button
                    disabled={saving === log.id}
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    {saving === log.id ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => { setDetailRoom(null); openConfirm(detailRoom); }}
                className="w-full py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 active:bg-pink-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <SprayCan size={16} /> 추가 청소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
