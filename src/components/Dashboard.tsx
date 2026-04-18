'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/store/useStore';
import { formatCurrency, getDaysInRange, formatDateKey } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, BedDouble, DollarSign,
  CreditCard, Banknote, Building2
} from 'lucide-react';

const DashboardCharts = dynamic(() => import('./DashboardCharts'), {
  ssr: false,
  loading: () => <div className="h-[320px] bg-gray-50 rounded-xl animate-pulse" />,
});

export default function Dashboard() {
  const { selectedDate, getDailySummary, reservations } = useStore();

  const today = getDailySummary(selectedDate);

  const weeklyData = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 6);
    const dates = getDaysInRange(formatDateKey(d), 7);
    return dates.map((date) => {
      const summary = getDailySummary(date);
      return {
        date: `${new Date(date).getMonth() + 1}/${new Date(date).getDate()}`,
        매출: summary.total_sales,
        지출: summary.total_expenses,
        순수익: summary.net_profit,
      };
    });
  }, [selectedDate, getDailySummary]);

  const sourceData = useMemo(() => {
    const dayRes = reservations.filter((r) => {
      const checkIn = formatDateKey(new Date(r.check_in));
      return checkIn === selectedDate && r.status !== 'cancelled';
    });
    const sources = [
      { name: '야놀자', value: dayRes.filter((r) => r.source === 'yanolja').reduce((s, r) => s + r.sale_price, 0) },
      { name: '여기어때', value: dayRes.filter((r) => r.source === 'yeogi').reduce((s, r) => s + r.sale_price, 0) },
      { name: '현장', value: dayRes.filter((r) => r.source === 'walkin').reduce((s, r) => s + r.sale_price, 0) },
    ];
    return sources.filter((s) => s.value > 0);
  }, [reservations, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<DollarSign />} label="총 매출" value={formatCurrency(today.total_sales)} color="text-blue-600 bg-blue-50" />
        <SummaryCard icon={<TrendingDown />} label="총 지출" value={formatCurrency(today.total_expenses)} color="text-red-600 bg-red-50" />
        <SummaryCard icon={<TrendingUp />} label="순수익" value={formatCurrency(today.net_profit)} color="text-green-600 bg-green-50" />
        <SummaryCard icon={<BedDouble />} label="객실 가동률" value={`${today.occupancy_rate.toFixed(0)}%`} sub={`${today.reservation_count}실 / 25실`} color="text-purple-600 bg-purple-50" />
      </div>

      {/* Payment Method Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote size={16} className="text-green-600" />
            <span className="text-sm text-gray-500">현금</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(today.cash_sales)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={16} className="text-blue-600" />
            <span className="text-sm text-gray-500">카드</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(today.card_sales)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-pink-600" />
            <span className="text-sm text-gray-500">OTA 정산</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(today.ota_sales)}</p>
          <p className="text-xs text-red-400 mt-0.5">수수료: -{formatCurrency(today.total_commission)}</p>
        </div>
      </div>

      {/* Charts - lazy loaded */}
      <DashboardCharts weeklyData={weeklyData} sourceData={sourceData} />
    </div>
  );
}

function SummaryCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
