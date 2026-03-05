'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { DailyClosing } from '@/types';
import { fetchDailyClosings, upsertDailyClosing } from '@/lib/supabase-db-v2';
import { formatCurrency, getDaysInRange, cn } from '@/lib/utils';
import { showToast } from './Toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { Lock, Download, CalendarCheck } from 'lucide-react';

export default function MonthlyReport() {
  const { getDailySummary } = useStore();
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  // 월의 시작/끝 날짜
  const [startDate, endDate] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return [start, end];
  }, [selectedMonth]);

  useEffect(() => {
    setLoading(true);
    fetchDailyClosings(startDate, endDate).then((data) => {
      setClosings(data);
      setLoading(false);
    });
  }, [startDate, endDate]);

  const closedDates = useMemo(() => new Set(closings.map((c) => c.date)), [closings]);

  // 월간 일별 데이터
  const dailyData = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const days = getDaysInRange(startDate, lastDay);

    return days.map((date) => {
      const closed = closings.find((c) => c.date === date);
      if (closed) {
        return {
          date: `${new Date(date).getDate()}일`,
          rawDate: date,
          매출: closed.total_sales,
          지출: closed.total_expenses,
          순수익: closed.net_profit,
          가동률: closed.occupancy_rate,
          closed: true,
        };
      }
      const summary = getDailySummary(date);
      return {
        date: `${new Date(date).getDate()}일`,
        rawDate: date,
        매출: summary.total_sales,
        지출: summary.total_expenses,
        순수익: summary.net_profit,
        가동률: summary.occupancy_rate,
        closed: false,
      };
    });
  }, [selectedMonth, closings, getDailySummary, startDate]);

  // 월간 합계
  const monthlyTotal = useMemo(() => {
    return dailyData.reduce(
      (acc, d) => ({
        sales: acc.sales + d.매출,
        expenses: acc.expenses + d.지출,
        profit: acc.profit + d.순수익,
        avgOccupancy: acc.avgOccupancy + d.가동률,
      }),
      { sales: 0, expenses: 0, profit: 0, avgOccupancy: 0 }
    );
  }, [dailyData]);

  // 일 마감 처리
  const handleDailyClose = async (date: string) => {
    const summary = getDailySummary(date);
    const saved = await upsertDailyClosing({
      date,
      total_sales: summary.total_sales,
      cash_sales: summary.cash_sales,
      card_sales: summary.card_sales,
      ota_sales: summary.ota_sales,
      total_commission: summary.total_commission,
      total_expenses: summary.total_expenses,
      net_profit: summary.net_profit,
      occupancy_rate: summary.occupancy_rate,
      reservation_count: summary.reservation_count,
    });
    setClosings((prev) => [...prev.filter((c) => c.date !== date), saved]);
    showToast({ type: 'success', title: '일 마감 완료', message: `${date} 마감이 확정되었습니다.` });
  };

  const daysCount = dailyData.length;
  const avgOccupancy = daysCount > 0 ? monthlyTotal.avgOccupancy / daysCount : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <div className="text-xs text-gray-400">
          마감 완료: {closedDates.size}일 / {daysCount}일
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">월간 총 매출</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(monthlyTotal.sales)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">월간 총 지출</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(monthlyTotal.expenses)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">월간 순수익</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(monthlyTotal.profit)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">평균 가동률</p>
          <p className="text-xl font-bold text-purple-600">{avgOccupancy.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">일별 매출/순수익</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="매출" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="순수익" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">일별 가동률</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Area type="monotone" dataKey="가동률" stroke="#8b5cf6" fill="#8b5cf680" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Closing Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">일별 마감 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">날짜</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">매출</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">지출</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">순수익</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">가동률</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dailyData.map((d) => (
                <tr key={d.rawDate} className={cn('hover:bg-gray-50', d.closed && 'bg-green-50/30')}>
                  <td className="px-4 py-3 font-medium">{d.date}</td>
                  <td className="px-4 py-3">{formatCurrency(d.매출)}</td>
                  <td className="px-4 py-3 text-red-500">{formatCurrency(d.지출)}</td>
                  <td className={cn('px-4 py-3 font-medium', d.순수익 >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {formatCurrency(d.순수익)}
                  </td>
                  <td className="px-4 py-3">{d.가동률.toFixed(0)}%</td>
                  <td className="px-4 py-3">
                    {d.closed ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <Lock size={12} /> 마감완료
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDailyClose(d.rawDate)}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                      >
                        <CalendarCheck size={12} /> 마감
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
