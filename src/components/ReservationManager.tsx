'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Reservation, ReservationStatus, ReservationSource } from '@/types';
import {
  formatCurrency, formatDate, getSourceLabel,
  getStatusLabel, getStatusColor, cn
} from '@/lib/utils';
import { Search, Filter, Plus, MoreHorizontal, ClipboardList } from 'lucide-react';
import ReservationModal from './ReservationModal';
import WalkinModal from './WalkinModal';

const STATUS_OPTIONS: { value: '' | ReservationStatus; label: string }[] = [
  { value: '', label: '모든 상태' },
  { value: 'confirmed', label: '예약확정' },
  { value: 'checked_in', label: '체크인' },
  { value: 'checked_out', label: '체크아웃' },
  { value: 'cancelled', label: '취소' },
  { value: 'no_show', label: '노쇼' },
];

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

export default function ReservationManager() {
  const { reservations } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ReservationStatus>('');
  const [sourceFilter, setSourceFilter] = useState<'' | ReservationSource>('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const dateFiltered = useMemo(() => {
    if (!dateFilter) return reservations;
    const target = new Date(dateFilter);
    target.setHours(0, 0, 0, 0);
    const nextDay = new Date(target);
    nextDay.setDate(nextDay.getDate() + 1);
    return reservations.filter((r) => {
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      return checkIn < nextDay && checkOut > target;
    });
  }, [reservations, dateFilter]);

  const filtered = useMemo(() => {
    return dateFiltered.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (sourceFilter && r.source !== sourceFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.guest_name.toLowerCase().includes(q) ||
          r.room_number.toLowerCase().includes(q) ||
          r.external_id.toLowerCase().includes(q) ||
          (r.guest_phone && r.guest_phone.includes(q))
        );
      }
      return true;
    }).sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
  }, [dateFiltered, searchQuery, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    const total = dateFiltered.length;
    const confirmed = dateFiltered.filter((r) => r.status === 'confirmed').length;
    const checkedIn = dateFiltered.filter((r) => r.status === 'checked_in').length;
    const checkedOut = dateFiltered.filter((r) => r.status === 'checked_out').length;
    return { total, confirmed, checkedIn, checkedOut };
  }, [dateFiltered]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">예약 관리</h1>
          <p className="text-sm text-gray-500 mt-1">예약 생성, 조회 및 상태 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 mr-2"
          >
            <Plus size={16} />
            현장 예약 등록
          </button>
          <button
            onClick={() => {
              const d = new Date(dateFilter);
              d.setDate(d.getDate() - 1);
              setDateFilter(d.toISOString().split('T')[0]);
            }}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
          >
            &lt;
          </button>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              const d = new Date(dateFilter);
              d.setDate(d.getDate() + 1);
              setDateFilter(d.toISOString().split('T')[0]);
            }}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
          >
            &gt;
          </button>
          <button
            onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
            className="text-sm text-pink-600 hover:text-pink-700 font-medium ml-1"
          >
            오늘
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="전체 예약" count={stats.total} color="border-gray-200 bg-white" />
        <SummaryCard label="체크대기" count={stats.confirmed} color="border-green-200 bg-green-50" />
        <SummaryCard label="체크인" count={stats.checkedIn} color="border-green-200 bg-green-50" />
        <SummaryCard label="체크아웃" count={stats.checkedOut} color="border-gray-200 bg-white" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter size={16} />
          필터
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="고객명 또는 객실번호로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | ReservationStatus)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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

      {/* Reservation Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-800">
            예약 목록 ({filtered.length}건)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">고객명</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">객실</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">투숙기간</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">숙박타입</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">결제금액</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">채널</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">상태</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <ClipboardList size={40} className="mx-auto mb-2 text-gray-300" />
                    예약 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                filtered.map((res) => (
                  <tr
                    key={res.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedRes(res)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{res.guest_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {res.room_number ? `${res.room_number}호` : <span className="text-orange-500 text-xs">미배정</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(res.check_in)} ~ {formatDate(res.check_out)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        res.stay_type === 'hourly' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      )}>
                        {res.stay_type === 'hourly' ? '대실' : '숙박'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(res.sale_price)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        getSourceBadgeColor(res.source)
                      )}>
                        {getSourceLabel(res.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        getStatusColor(res.status)
                      )}>
                        {getStatusLabel(res.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRes(res);
                        }}
                      >
                        <MoreHorizontal size={16} className="text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reservation Detail Modal */}
      {selectedRes && (
        <ReservationModal
          reservation={selectedRes}
          onClose={() => setSelectedRes(null)}
        />
      )}

      {/* New Walk-in Reservation Modal */}
      {showNewModal && (
        <WalkinModal
          initialCheckIn={`${dateFilter}T17:00`}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn('rounded-xl border p-4', color)}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{count}</p>
    </div>
  );
}
