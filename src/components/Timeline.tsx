'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Reservation } from '@/types';
import { cn, getSourceColor, getSourceLabel, formatCurrency, formatTime, getDaysInRange } from '@/lib/utils';
import { ChevronLeft, ChevronRight, AlertCircle, GripVertical, Wand2 } from 'lucide-react';
import ReservationModal from './ReservationModal';
import WalkinModal from './WalkinModal';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// 두 예약의 시간이 겹치는지 확인
function isOverlapping(a: { check_in: string; check_out: string }, b: { check_in: string; check_out: string }): boolean {
  const aIn = new Date(a.check_in).getTime();
  const aOut = new Date(a.check_out).getTime();
  const bIn = new Date(b.check_in).getTime();
  const bOut = new Date(b.check_out).getTime();
  return aIn < bOut && bIn < aOut;
}

export default function Timeline() {
  const { rooms, reservations, selectedDate, setSelectedDate, updateReservation, batchAssignRooms } = useStore();
  const [viewDays, setViewDays] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [walkinRoom, setWalkinRoom] = useState<string | null>(null);
  const [walkinCheckIn, setWalkinCheckIn] = useState<string | undefined>(undefined);
  const [dragReservation, setDragReservation] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const dates = useMemo(() => getDaysInRange(selectedDate, viewDays), [selectedDate, viewDays]);

  const filteredReservations = useMemo(() => {
    const start = new Date(dates[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dates[dates.length - 1]);
    end.setDate(end.getDate() + 1);

    return reservations.filter((r) => {
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      return checkIn < end && checkOut > start && r.status !== 'cancelled';
    });
  }, [reservations, dates]);

  // 미배정 예약 (객실 번호 없음)
  const unassigned = useMemo(() =>
    reservations.filter((r) => !r.room_number && r.status !== 'cancelled'),
  [reservations]);

  const getReservationStyle = (res: Reservation) => {
    const dayStart = new Date(dates[0]);
    dayStart.setHours(0, 0, 0, 0);
    const totalHours = viewDays * 24;
    const checkIn = new Date(res.check_in);
    const checkOut = new Date(res.check_out);
    const startHour = Math.max(0, (checkIn.getTime() - dayStart.getTime()) / (1000 * 60 * 60));
    const endHour = Math.min(totalHours, (checkOut.getTime() - dayStart.getTime()) / (1000 * 60 * 60));
    const duration = endHour - startHour;
    return {
      left: `${(startHour / totalHours) * 100}%`,
      width: `${Math.max(1, (duration / totalHours) * 100)}%`,
    };
  };

  const getBlockColor = (res: Reservation) => {
    if (res.stay_type === 'hourly') {
      return res.source === 'yanolja' ? 'bg-pink-400' : res.source === 'yeogi' ? 'bg-blue-400' : 'bg-green-400';
    }
    return getSourceColor(res.source);
  };

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // 드래그앤드롭: 미배정 예약 → 객실 배정
  const handleDrop = async (roomNumber: string) => {
    if (!dragReservation) return;
    await updateReservation(dragReservation, { room_number: roomNumber });
    setDragReservation(null);
  };

  // 자동 배정: 미배정 예약을 시간 충돌 없는 객실에 자동 배치 (일괄 처리)
  const handleAutoAssign = async () => {
    if (unassigned.length === 0 || autoAssigning) return;
    setAutoAssigning(true);

    const activeRooms = rooms.filter((r) => r.is_active).map((r) => r.room_number);
    const roomSchedule: Record<string, { check_in: string; check_out: string }[]> = {};
    for (const room of activeRooms) {
      roomSchedule[room] = reservations
        .filter((r) => r.room_number === room && r.status !== 'cancelled')
        .map((r) => ({ check_in: r.check_in, check_out: r.check_out }));
    }

    // 체크인 시간순 정렬
    const sorted = [...unassigned].sort(
      (a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    );

    // 배정 계획을 먼저 계산 (DB 호출 없이)
    const assignments: { id: string; room_number: string }[] = [];
    for (const res of sorted) {
      for (const room of activeRooms) {
        const schedule = roomSchedule[room];
        const hasConflict = schedule.some((existing) => isOverlapping(existing, res));
        if (!hasConflict) {
          assignments.push({ id: res.id, room_number: room });
          schedule.push({ check_in: res.check_in, check_out: res.check_out });
          break;
        }
      }
    }

    // 한 번에 일괄 업데이트
    if (assignments.length > 0) {
      await batchAssignRooms(assignments);
    }

    setAutoAssigning(false);
  };

  const totalHours = viewDays * 24;
  const hourWidth = 100 / totalHours;

  return (
    <div className="space-y-4">
      {/* Unassigned Queue */}
      {unassigned.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <AlertCircle size={16} /> 미배정 예약 ({unassigned.length}건)
            </h3>
            <button
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                autoAssigning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              )}
            >
              <Wand2 size={14} className={autoAssigning ? 'animate-spin' : ''} />
              {autoAssigning ? '배정 중...' : '자동 배정'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((res) => (
              <div
                key={res.id}
                draggable
                onDragStart={() => setDragReservation(res.id)}
                onDragEnd={() => setDragReservation(null)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing text-sm',
                  'bg-white border-orange-200 hover:border-orange-400 shadow-sm',
                )}
              >
                <GripVertical size={14} className="text-gray-400" />
                <span className={cn('w-2 h-2 rounded-full', getSourceColor(res.source))} />
                <span className="font-medium">{res.guest_name}</span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded',
                  res.stay_type === 'hourly' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                )}>
                  {res.stay_type === 'hourly' ? '대실' : '숙박'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(res.check_in)}~{formatTime(res.check_out)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border shadow-sm">
        {/* Header Controls */}
        <div className="flex items-center justify-between p-4 border-b flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="p-1.5 hover:bg-gray-100 rounded">
              <ChevronLeft size={18} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            />
            <button onClick={() => navigateDate(1)} className="p-1.5 hover:bg-gray-100 rounded">
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="text-sm text-pink-600 hover:text-pink-700 font-medium ml-2"
            >
              오늘
            </button>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {[1, 3, 7].map((d) => (
              <button
                key={d}
                onClick={() => setViewDays(d)}
                className={cn(
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  viewDays === d ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {d}일
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink-500" /> 야놀자</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> 여기어때</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> 현장</span>
            <span className="flex items-center gap-1"><span className="w-6 h-3 rounded bg-amber-300 border border-amber-400" /> 대실</span>
            <span className="flex items-center gap-1"><span className="w-6 h-3 rounded bg-indigo-500" /> 숙박</span>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: viewDays > 1 ? `${viewDays * 600}px` : '100%' }}>
            {/* Time Header */}
            <div className="flex border-b bg-gray-50 sticky top-0 z-20">
              <div className="w-20 min-w-[80px] flex-shrink-0 p-2 text-xs font-semibold text-gray-600 border-r">
                객실
              </div>
              <div className="flex-1 flex">
                {dates.map((date) =>
                  HOURS.map((hour) => (
                    <div
                      key={`${date}-${hour}`}
                      style={{ width: `${hourWidth}%` }}
                      className="text-center text-xs text-gray-500 py-2 border-r border-gray-200"
                    >
                      {hour === 0 ? (
                        <span className="font-semibold text-gray-700">
                          {new Date(date).getMonth() + 1}/{new Date(date).getDate()}
                        </span>
                      ) : hour % 2 === 0 ? `${hour}시` : ''}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Room Rows */}
            {rooms.filter((r) => r.is_active).map((room) => {
              const roomReservations = filteredReservations.filter(
                (r) => r.room_number === room.room_number
              );

              return (
                <div
                  key={room.room_number}
                  className={cn(
                    'flex border-b hover:bg-gray-50/50 group',
                    dragReservation && 'hover:bg-green-50/50'
                  )}
                  onDragOver={(e) => { if (dragReservation) e.preventDefault(); }}
                  onDrop={() => handleDrop(room.room_number)}
                >
                  <div
                    className={cn(
                      'w-20 min-w-[80px] flex-shrink-0 p-2 border-r bg-white flex items-center justify-center cursor-pointer hover:bg-green-50',
                      dragReservation && 'bg-green-50 border-green-200'
                    )}
                    onClick={() => !dragReservation && setWalkinRoom(room.room_number)}
                  >
                    <span className="text-sm font-semibold text-gray-700">{room.room_number}</span>
                  </div>
                  <div
                    className="flex-1 relative cursor-pointer"
                    style={{ height: '48px' }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const ratio = x / rect.width;
                      const clickedHour = Math.floor(ratio * totalHours);
                      const dayOffset = Math.floor(clickedHour / 24);
                      const hour = clickedHour % 24;
                      const clickedDate = new Date(dates[0]);
                      clickedDate.setDate(clickedDate.getDate() + dayOffset);
                      clickedDate.setHours(hour, 0, 0, 0);
                      setWalkinCheckIn(clickedDate.toISOString().slice(0, 16));
                      setWalkinRoom(room.room_number);
                    }}
                  >
                    {Array.from({ length: totalHours }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-gray-100"
                        style={{ left: `${(i / totalHours) * 100}%`, width: `${hourWidth}%` }}
                      />
                    ))}
                    {roomReservations.map((res) => {
                      const style = getReservationStyle(res);
                      const isHourly = res.stay_type === 'hourly';
                      return (
                        <div
                          key={res.id}
                          className={cn(
                            'reservation-block flex items-center px-2 text-white text-xs font-medium overflow-hidden border',
                            isHourly
                              ? `${getBlockColor(res)} border-dashed border-white/50`
                              : `${getBlockColor(res)} border-transparent`
                          )}
                          style={style}
                          onClick={(e) => { e.stopPropagation(); setSelectedReservation(res); }}
                          title={`${res.guest_name} | ${getSourceLabel(res.source)} | ${isHourly ? '대실' : '숙박'} | ${formatCurrency(res.sale_price)}`}
                        >
                          <span className="truncate">
                            {isHourly && '[대] '}
                            {res.guest_name} ({formatTime(res.check_in)}-{formatTime(res.check_out)})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
        />
      )}

      {walkinRoom && (
        <WalkinModal
          roomNumber={walkinRoom}
          initialCheckIn={walkinCheckIn}
          onClose={() => { setWalkinRoom(null); setWalkinCheckIn(undefined); }}
        />
      )}
    </div>
  );
}
