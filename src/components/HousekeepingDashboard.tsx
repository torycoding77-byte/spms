'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { HousekeepingLog } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { CalendarDays, Clock, SprayCan, TrendingUp, ChevronLeft, ChevronRight, User, Trash2 } from 'lucide-react';
import { fetchHousekeepingLogs, deleteHousekeepingLog } from '@/lib/supabase-db-v2';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addDays, addWeeks, addMonths, subWeeks, subMonths, subDays, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';

type ViewMode = 'daily' | 'weekly' | 'monthly';

// 타임라인 범위: 6시 ~ 24시
const TIMELINE_START = 6;
const TIMELINE_END = 24;
const TIMELINE_SPAN = TIMELINE_END - TIMELINE_START;
const TIMELINE_HOURS = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);

export default function HousekeepingDashboard() {
  const { rooms } = useStore();
  const [logs, setLogs] = useState<HousekeepingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  const activeRooms = rooms.filter((r) => r.is_active);

  const dateRange = useMemo(() => {
    if (viewMode === 'daily') {
      const d = format(currentDate, 'yyyy-MM-dd');
      return { start: d, end: d, label: format(currentDate, 'yyyy년 M월 d일 (EEE)', { locale: ko }) };
    }
    if (viewMode === 'weekly') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        start: format(s, 'yyyy-MM-dd'),
        end: format(e, 'yyyy-MM-dd'),
        label: `${format(s, 'M/d')} ~ ${format(e, 'M/d')}`,
      };
    }
    // monthly
    const s = startOfMonth(currentDate);
    const e = endOfMonth(currentDate);
    return {
      start: format(s, 'yyyy-MM-dd'),
      end: format(e, 'yyyy-MM-dd'),
      label: format(currentDate, 'yyyy년 M월', { locale: ko }),
    };
  }, [viewMode, currentDate]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHousekeepingLogs(dateRange.start, dateRange.end);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const navigate = (dir: -1 | 1) => {
    if (viewMode === 'daily') setCurrentDate((d) => dir === 1 ? addDays(d, 1) : subDays(d, 1));
    else if (viewMode === 'weekly') setCurrentDate((d) => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate((d) => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('이 청소 이력을 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await deleteHousekeepingLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  // === Stats ===
  const stats = useMemo(() => {
    const uniqueRooms = new Set(logs.map((l) => l.room_number)).size;
    const totalCleanings = logs.length;

    // Average time between cleanings per day
    const byDay = new Map<string, HousekeepingLog[]>();
    logs.forEach((l) => {
      const day = l.cleaned_at.split('T')[0];
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(l);
    });

    let avgPerDay = 0;
    if (byDay.size > 0) {
      avgPerDay = totalCleanings / byDay.size;
    }

    // Cleaner stats
    const byCleaner = new Map<string, number>();
    logs.forEach((l) => {
      byCleaner.set(l.cleaner_name, (byCleaner.get(l.cleaner_name) || 0) + 1);
    });

    // Time distribution (by hour)
    const byHour = new Map<number, number>();
    logs.forEach((l) => {
      const hour = new Date(l.cleaned_at).getHours();
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    });

    // Room coverage rate
    const coverageRate = activeRooms.length > 0
      ? (uniqueRooms / activeRooms.length) * 100
      : 0;

    return { totalCleanings, uniqueRooms, avgPerDay, byCleaner, byHour, coverageRate, byDay };
  }, [logs, activeRooms.length]);

  // === Daily detail: room-by-room (복수 청소 지원) ===
  const dailyRoomDetail = useMemo(() => {
    if (viewMode !== 'daily') return [];
    // 객실별 로그 그룹핑
    const byRoom = new Map<string, HousekeepingLog[]>();
    logs.forEach((l) => {
      if (!byRoom.has(l.room_number)) byRoom.set(l.room_number, []);
      byRoom.get(l.room_number)!.push(l);
    });
    byRoom.forEach((roomLogs) => roomLogs.sort((a, b) => a.cleaned_at.localeCompare(b.cleaned_at)));

    return activeRooms
      .map((room) => {
        const roomLogs = byRoom.get(room.room_number) || [];
        return {
          room_number: room.room_number,
          cleaned: roomLogs.length > 0,
          logs: roomLogs,
        };
      })
      .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
  }, [viewMode, activeRooms, logs]);

  // === Weekly chart data ===
  const weeklyData = useMemo(() => {
    if (viewMode !== 'weekly') return [];
    const s = startOfWeek(currentDate, { weekStartsOn: 1 });
    const e = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: s, end: e });
    return days.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const dayLogs = stats.byDay.get(key) || [];
      return {
        label: format(day, 'EEE', { locale: ko }),
        date: key,
        count: dayLogs.length,
        rooms: new Set(dayLogs.map((l) => l.room_number)).size,
      };
    });
  }, [viewMode, currentDate, stats.byDay]);

  // === Monthly chart data ===
  const monthlyData = useMemo(() => {
    if (viewMode !== 'monthly') return [];
    const s = startOfMonth(currentDate);
    const e = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: s, end: e });
    return days.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const dayLogs = stats.byDay.get(key) || [];
      return {
        label: format(day, 'd'),
        date: key,
        count: dayLogs.length,
      };
    });
  }, [viewMode, currentDate, stats.byDay]);

  const maxChartValue = useMemo(() => {
    if (viewMode === 'weekly') return Math.max(...weeklyData.map((d) => d.count), 1);
    if (viewMode === 'monthly') return Math.max(...monthlyData.map((d) => d.count), 1);
    return 1;
  }, [viewMode, weeklyData, monthlyData]);

  // Peak hour
  const peakHour = useMemo(() => {
    let maxH = 0, maxC = 0;
    stats.byHour.forEach((count, hour) => {
      if (count > maxC) { maxC = count; maxH = hour; }
    });
    return maxC > 0 ? `${maxH}:00~${maxH + 1}:00` : '-';
  }, [stats.byHour]);

  return (
    <div className="space-y-6">
      {/* View mode toggle + Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {mode === 'daily' ? '일별' : mode === 'weekly' ? '주별' : '월별'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
            {dateRange.label}
          </span>
          <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<SprayCan size={20} />}
              label="총 청소 횟수"
              value={stats.totalCleanings}
              color="bg-blue-50 text-blue-600"
            />
            <SummaryCard
              icon={<CalendarDays size={20} />}
              label="청소 객실 수"
              value={`${stats.uniqueRooms} / ${activeRooms.length}`}
              color="bg-green-50 text-green-600"
            />
            <SummaryCard
              icon={<TrendingUp size={20} />}
              label="커버리지"
              value={`${stats.coverageRate.toFixed(0)}%`}
              color="bg-purple-50 text-purple-600"
            />
            <SummaryCard
              icon={<Clock size={20} />}
              label="피크 시간대"
              value={peakHour}
              color="bg-orange-50 text-orange-600"
            />
          </div>

          {/* Cleaner Performance */}
          {stats.byCleaner.size > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User size={16} /> 청소 담당자별 실적
              </h3>
              <div className="space-y-2">
                {Array.from(stats.byCleaner.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-16 shrink-0">{name}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max((count / stats.totalCleanings) * 100, 10)}%` }}
                        >
                          <span className="text-[10px] text-white font-medium">{count}건</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Daily View: Timeline */}
          {viewMode === 'daily' && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">객실별 청소 타임라인</h3>
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* 시간 헤더 (6시~24시) */}
                  <div className="flex">
                    <div className="w-16 shrink-0" />
                    <div className="flex-1 flex">
                      {TIMELINE_HOURS.map((h) => (
                        <div key={h} className="flex-1 text-center text-[10px] text-gray-400 font-medium border-l border-gray-100">
                          {h}:00
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 객실 행 */}
                  <div className="mt-1 space-y-0">
                    {dailyRoomDetail.map((r) => (
                      <div key={r.room_number} className="flex items-center group hover:bg-gray-50/50">
                        {/* 객실 번호 */}
                        <div className={cn(
                          'w-16 shrink-0 py-2 pr-2 text-right text-xs font-bold',
                          r.cleaned ? 'text-gray-800' : 'text-gray-300'
                        )}>
                          {r.room_number}
                          {r.logs.length > 1 && (
                            <span className="ml-1 text-[9px] text-green-500 font-normal">×{r.logs.length}</span>
                          )}
                        </div>
                        {/* 타임라인 바 */}
                        <div className="flex-1 relative h-8 border-l border-gray-100">
                          {/* 시간 구분선 */}
                          {TIMELINE_HOURS.map((h) => (
                            <div
                              key={h}
                              className="absolute top-0 bottom-0 border-l border-gray-100"
                              style={{ left: `${((h - TIMELINE_START) / TIMELINE_SPAN) * 100}%` }}
                            />
                          ))}
                          {/* 배경 바 */}
                          <div className={cn(
                            'absolute inset-y-1 left-0 right-0 rounded',
                            r.cleaned ? 'bg-green-50' : 'bg-gray-50'
                          )} />
                          {/* 청소 마커 */}
                          {r.logs.map((log) => {
                            const d = new Date(log.cleaned_at);
                            const hours = d.getHours() + d.getMinutes() / 60;
                            const pct = Math.max(0, Math.min(100, ((hours - TIMELINE_START) / TIMELINE_SPAN) * 100));
                            const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div
                                key={log.id}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group/marker"
                                style={{ left: `${pct}%` }}
                              >
                                {/* 마커 점 */}
                                <div className="w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-150 transition-transform" />
                                {/* 툴팁 */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/marker:block z-20">
                                  <div className="bg-gray-800 text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
                                    <p className="font-bold">{timeStr}</p>
                                    <p className="text-gray-300">{log.cleaner_name}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 미청소 객실 표시 */}
                  {dailyRoomDetail.filter((r) => !r.cleaned).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed">
                      <p className="text-[10px] text-gray-400 mb-1">미완료 객실</p>
                      <div className="flex flex-wrap gap-1">
                        {dailyRoomDetail.filter((r) => !r.cleaned).map((r) => (
                          <span key={r.room_number} className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                            {r.room_number}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Weekly View: Bar Chart */}
          {viewMode === 'weekly' && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">요일별 청소 현황</h3>
              <div className="flex items-end gap-2 h-48">
                {weeklyData.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-medium">{d.count}건</span>
                    <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '140px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-pink-500 rounded-t-lg transition-all"
                        style={{ height: `${(d.count / maxChartValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{d.label}</span>
                    <span className="text-[10px] text-gray-400">{d.rooms}실</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly View: Chart */}
          {viewMode === 'monthly' && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">일별 청소 추이</h3>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-[2px] h-40 min-w-[600px]">
                  {monthlyData.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '120px' }}>
                        <div
                          className="absolute bottom-0 w-full bg-pink-400 rounded-t transition-all"
                          style={{ height: `${(d.count / maxChartValue) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Time Distribution */}
          {stats.byHour.size > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock size={16} /> 시간대별 청소 분포
              </h3>
              <div className="flex items-end gap-1 h-32">
                {Array.from({ length: 24 }, (_, h) => {
                  const count = stats.byHour.get(h) || 0;
                  const maxHourCount = Math.max(...Array.from(stats.byHour.values()), 1);
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100px' }}>
                        <div
                          className={cn(
                            'absolute bottom-0 w-full rounded-t transition-all',
                            count > 0 ? 'bg-blue-400' : 'bg-gray-100'
                          )}
                          style={{ height: `${(count / maxHourCount) * 100}%` }}
                        />
                      </div>
                      {h % 3 === 0 && <span className="text-[8px] text-gray-400">{h}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-1">
                <span>0시</span>
                <span>6시</span>
                <span>12시</span>
                <span>18시</span>
                <span>24시</span>
              </div>
            </div>
          )}

          {/* Recent Logs Table */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">청소 이력</h3>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">해당 기간 청소 이력이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-left py-2 px-2 font-medium">객실</th>
                      <th className="text-left py-2 px-2 font-medium">담당자</th>
                      <th className="text-left py-2 px-2 font-medium">완료 시간</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 100).map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium">{log.room_number}</td>
                        <td className="py-2 px-2 text-gray-600">{log.cleaner_name}</td>
                        <td className="py-2 px-2 text-gray-500">
                          {format(new Date(log.cleaned_at), 'M/d HH:mm', { locale: ko })}
                        </td>
                        <td className="py-2 px-1">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            disabled={deletingId === log.id}
                            className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="삭제"
                          >
                            {deletingId === log.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', color)}>
        {icon}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}
