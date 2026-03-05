'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { exportReservationsToExcel } from '@/lib/excel-parser';
import { formatCurrency, getDaysInRange, cn } from '@/lib/utils';
import { Download, FileSpreadsheet, TrendingUp, Building2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#e91e63', '#2196f3', '#4caf50'];

export default function SettlementReport() {
  const { reservations, expenses, getDailySummary } = useStore();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [y, m] = selectedMonth.split('-').map(Number);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // 월간 예약 데이터
  const monthReservations = useMemo(() =>
    reservations.filter((r) => {
      const d = r.check_in.split('T')[0];
      return d >= startDate && d <= endDate && r.status !== 'cancelled';
    }),
  [reservations, startDate, endDate]);

  const monthExpenses = useMemo(() =>
    expenses.filter((e) => e.date >= startDate && e.date <= endDate),
  [expenses, startDate, endDate]);

  // 채널별 정산
  const channelBreakdown = useMemo(() => {
    const channels = [
      { key: 'yanolja', name: '야놀자', color: '#e91e63' },
      { key: 'yeogi', name: '여기어때', color: '#2196f3' },
      { key: 'walkin', name: '현장', color: '#4caf50' },
    ];

    return channels.map((ch) => {
      const items = monthReservations.filter((r) => r.source === ch.key);
      const totalSales = items.reduce((s, r) => s + r.sale_price, 0);
      const totalSettlement = items.reduce((s, r) => s + r.settlement_price, 0);
      const totalCommission = items.reduce((s, r) => s + r.commission, 0);
      return {
        ...ch,
        count: items.length,
        totalSales,
        totalSettlement,
        totalCommission,
        hourlyCount: items.filter((r) => r.stay_type === 'hourly').length,
        nightlyCount: items.filter((r) => r.stay_type === 'nightly').length,
      };
    });
  }, [monthReservations]);

  // 기간별 차트 데이터
  const chartData = useMemo(() => {
    const days = getDaysInRange(startDate, lastDay);
    if (period === 'daily') {
      return days.map((d) => {
        const summary = getDailySummary(d);
        return {
          label: `${new Date(d).getDate()}`,
          매출: summary.total_sales,
          정산: summary.ota_sales,
          순수익: summary.net_profit,
        };
      });
    }
    // weekly
    const weeks: { label: string; 매출: number; 정산: number; 순수익: number }[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      const totals = weekDays.reduce(
        (acc, d) => {
          const s = getDailySummary(d);
          return { 매출: acc.매출 + s.total_sales, 정산: acc.정산 + s.ota_sales, 순수익: acc.순수익 + s.net_profit };
        },
        { 매출: 0, 정산: 0, 순수익: 0 }
      );
      weeks.push({ label: `${Math.floor(i / 7) + 1}주`, ...totals });
    }
    return weeks;
  }, [startDate, lastDay, period, getDailySummary]);

  // 총합
  const grandTotal = useMemo(() => {
    const totalSales = channelBreakdown.reduce((s, ch) => s + ch.totalSales, 0);
    const totalSettlement = channelBreakdown.reduce((s, ch) => s + ch.totalSettlement, 0);
    const totalCommission = channelBreakdown.reduce((s, ch) => s + ch.totalCommission, 0);
    const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
    return {
      totalSales,
      totalSettlement,
      totalCommission,
      totalExpenses,
      netProfit: totalSettlement - totalExpenses,
      totalCount: channelBreakdown.reduce((s, ch) => s + ch.count, 0),
    };
  }, [channelBreakdown, monthExpenses]);

  const pieData = channelBreakdown
    .filter((ch) => ch.totalSales > 0)
    .map((ch) => ({ name: ch.name, value: ch.totalSales }));

  // 엑셀 다운로드
  const handleExport = () => {
    const blob = exportReservationsToExcel(monthReservations);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `정산보고서_${selectedMonth}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(['daily', 'weekly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md',
                  period === p ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500'
                )}
              >
                {p === 'daily' ? '일별' : '주별'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
        >
          <Download size={16} /> 엑셀 다운로드
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryBox label="총 예약" value={`${grandTotal.totalCount}건`} />
        <SummaryBox label="총 판매액" value={formatCurrency(grandTotal.totalSales)} color="text-blue-600" />
        <SummaryBox label="총 수수료" value={`-${formatCurrency(grandTotal.totalCommission)}`} color="text-red-500" />
        <SummaryBox label="입금 예정" value={formatCurrency(grandTotal.totalSettlement)} color="text-green-600" />
        <SummaryBox label="총 지출" value={`-${formatCurrency(grandTotal.totalExpenses)}`} color="text-red-500" />
        <SummaryBox label="순수익" value={formatCurrency(grandTotal.netProfit)}
          color={grandTotal.netProfit >= 0 ? 'text-green-700' : 'text-red-700'} highlight />
      </div>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {channelBreakdown.map((ch) => (
          <div key={ch.key} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: ch.color }} />
              <h3 className="font-semibold text-gray-800">{ch.name}</h3>
              <span className="text-xs text-gray-400 ml-auto">{ch.count}건</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">판매금액</span>
                <span className="font-medium">{formatCurrency(ch.totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">수수료</span>
                <span className="text-red-500">-{formatCurrency(ch.totalCommission)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">입금 예정</span>
                <span className="font-bold text-green-600">{formatCurrency(ch.totalSettlement)}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3 text-xs text-gray-500">
              <span className="bg-amber-50 px-2 py-0.5 rounded">대실 {ch.hourlyCount}</span>
              <span className="bg-indigo-50 px-2 py-0.5 rounded">숙박 {ch.nightlyCount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {period === 'daily' ? '일별' : '주별'} 매출 추이
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="매출" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="정산" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="순수익" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">채널별 매출 비중</h3>
          <div style={{ height: 280 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                데이터 없음
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Net Profit Formula */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
        <h3 className="text-sm text-gray-400 mb-3">정산 공식</h3>
        <div className="flex items-center gap-4 text-lg flex-wrap">
          <div className="text-center">
            <p className="text-xs text-gray-400">총 판매</p>
            <p className="font-bold">{formatCurrency(grandTotal.totalSales)}</p>
          </div>
          <span className="text-gray-500 text-2xl">-</span>
          <div className="text-center">
            <p className="text-xs text-gray-400">수수료</p>
            <p className="font-bold text-red-400">{formatCurrency(grandTotal.totalCommission)}</p>
          </div>
          <span className="text-gray-500 text-2xl">-</span>
          <div className="text-center">
            <p className="text-xs text-gray-400">지출</p>
            <p className="font-bold text-red-400">{formatCurrency(grandTotal.totalExpenses)}</p>
          </div>
          <span className="text-gray-500 text-2xl">=</span>
          <div className="text-center">
            <p className="text-xs text-green-400">순수익</p>
            <p className="font-bold text-2xl text-green-400">{formatCurrency(grandTotal.netProfit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, color, highlight }: {
  label: string; value: string; color?: string; highlight?: boolean;
}) {
  return (
    <div className={cn('rounded-xl border p-4', highlight ? 'bg-green-50 border-green-200' : 'bg-white')}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-lg font-bold', color || 'text-gray-800')}>{value}</p>
    </div>
  );
}
