'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { ReservationSource } from '@/types';
import { formatCurrency, formatDate, formatDateTime, getSourceLabel, cn } from '@/lib/utils';
import { Search, Filter, TrendingUp, ClipboardList } from 'lucide-react';

const SOURCE_OPTIONS: { value: '' | ReservationSource; label: string }[] = [
  { value: '', label: '모든 채널' },
  { value: 'yanolja', label: '야놀자' },
  { value: 'yeogi', label: '여기어때' },
  { value: 'walkin', label: '현장' },
];

function getSourceBadgeColor(source: ReservationSource): string {
  switch (source) {
    case 'yanolja': return 'bg-pink-100 text-pink-700';
    case 'yeogi': return 'bg-blue-100 text-blue-700';
    case 'walkin': return 'bg-green-100 text-green-700';
  }
}

function monthRange(yyyymm: string): { start: Date; end: Date } {
  const [y, m] = yyyymm.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

export default function SalesList() {
  const { reservations } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'' | ReservationSource>('');
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  // 취소/노쇼 제외 + 월 필터 (체크인 기준)
  const filtered = useMemo(() => {
    const { start, end } = monthRange(monthFilter);
    return reservations
      .filter((r) => r.status !== 'cancelled' && r.status !== 'no_show')
      .filter((r) => {
        const checkIn = new Date(r.check_in);
        return checkIn >= start && checkIn < end;
      })
      .filter((r) => {
        if (sourceFilter && r.source !== sourceFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            r.guest_name.toLowerCase().includes(q) ||
            r.room_number.toLowerCase().includes(q) ||
            r.external_id.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
  }, [reservations, monthFilter, sourceFilter, searchQuery]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        sale: acc.sale + (r.sale_price || 0),
        settlement: acc.settlement + (r.settlement_price || 0),
        commission: acc.commission + (r.commission || 0),
      }),
      { sale: 0, settlement: 0, commission: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="매출 건수" value={`${filtered.length}건`} />
        <SummaryCard label="총 판매금액" value={formatCurrency(totals.sale)} color="text-gray-900" />
        <SummaryCard label="입금예정 합계" value={formatCurrency(totals.settlement)} color="text-green-600" />
        <SummaryCard label="수수료 합계" value={formatCurrency(totals.commission)} color="text-red-500" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter size={16} />
          필터
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="고객명 / 객실번호 / 예약번호"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as '' | ReservationSource)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <TrendingUp size={16} className="text-pink-500" />
          <h2 className="text-sm font-semibold text-gray-800">
            매출 목록 ({filtered.length}건)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-500">예약일시</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">날짜</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">예약자명</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">객실번호</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">채널</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">숙박타입</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">투숙기간</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">금액</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">입금예정</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">수수료</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <ClipboardList size={40} className="mx-auto mb-2 text-gray-300" />
                    해당 월의 매출 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                filtered.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {res.reserved_at ? formatDateTime(res.reserved_at) : '-'}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {formatDate(res.check_in)}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">{res.guest_name}</td>
                    <td className="px-3 py-3 text-gray-600">
                      {res.room_number ? `${res.room_number}호` : (
                        <span className="text-orange-500 text-xs">미배정</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        getSourceBadgeColor(res.source)
                      )}>
                        {getSourceLabel(res.source)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        res.stay_type === 'hourly' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      )}>
                        {res.stay_type === 'hourly' ? '대실' : '숙박'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(res.check_in)} ~ {formatDate(res.check_out)}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(res.sale_price)}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-green-600">
                      {formatCurrency(res.settlement_price)}
                    </td>
                    <td className="px-3 py-3 text-right text-red-500">
                      {formatCurrency(res.commission)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-gray-50 border-t">
                <tr className="font-bold">
                  <td colSpan={7} className="px-3 py-3 text-right text-gray-600">합계</td>
                  <td className="px-3 py-3 text-right text-gray-900">{formatCurrency(totals.sale)}</td>
                  <td className="px-3 py-3 text-right text-green-600">{formatCurrency(totals.settlement)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{formatCurrency(totals.commission)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={cn('text-xl font-bold', color || 'text-gray-900')}>{value}</p>
    </div>
  );
}
