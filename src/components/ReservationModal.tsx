'use client';

import { Reservation } from '@/types';
import { useStore } from '@/store/useStore';
import {
  formatCurrency, formatDateTime, getSourceLabel,
  getStatusLabel, getStatusColor, getSourceBgColor
} from '@/lib/utils';
import { X, Phone, Car, CreditCard, Edit2 } from 'lucide-react';

interface Props {
  reservation: Reservation;
  onClose: () => void;
}

export default function ReservationModal({ reservation: res, onClose }: Props) {
  const { updateReservation } = useStore();

  const handleStatusChange = async (status: Reservation['status']) => {
    await updateReservation(res.id, { status });
    if (status === 'checked_out') onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 rounded-t-2xl border ${getSourceBgColor(res.source)}`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-medium px-2 py-0.5 bg-white/80 rounded-full">
                {getSourceLabel(res.source)}
              </span>
              <h3 className="text-xl font-bold mt-2">{res.guest_name}</h3>
              <p className="text-sm text-gray-600">예약번호: {res.external_id}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="객실" value={`${res.room_number}호`} />
            <InfoRow label="유형">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                res.stay_type === 'hourly' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {res.stay_type === 'hourly' ? '대실' : '숙박'}
              </span>
            </InfoRow>
            <InfoRow label="상태">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(res.status)}`}>
                {getStatusLabel(res.status)}
              </span>
            </InfoRow>
            <InfoRow label="체크인" value={formatDateTime(res.check_in)} />
            <InfoRow label="체크아웃" value={formatDateTime(res.check_out)} />
          </div>

          <div className="flex gap-3">
            {res.guest_phone && (
              <a href={`tel:${res.guest_phone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <Phone size={14} /> {res.guest_phone}
              </a>
            )}
            {res.guest_vehicle && (
              <span className="flex items-center gap-1 text-sm text-gray-600">
                <Car size={14} /> {res.guest_vehicle}
              </span>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">판매금액</span>
              <span className="font-medium">{formatCurrency(res.sale_price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">수수료</span>
              <span className="text-red-500">-{formatCurrency(res.commission)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">정산금액</span>
              <span className="font-bold text-green-600">{formatCurrency(res.settlement_price)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <CreditCard size={12} />
              {res.payment_method === 'cash' ? '현금' : res.payment_method === 'card' ? '카드' : 'OTA 정산'}
            </div>
          </div>

          {res.memo && (
            <div className="flex items-start gap-2 text-sm">
              <Edit2 size={14} className="text-gray-400 mt-0.5" />
              <span className="text-gray-600">{res.memo}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-2">
          {res.status === 'confirmed' && (
            <button
              onClick={() => handleStatusChange('checked_in')}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              체크인 처리
            </button>
          )}
          {res.status === 'checked_in' && (
            <button
              onClick={() => handleStatusChange('checked_out')}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              체크아웃 처리
            </button>
          )}
          {(res.status === 'confirmed' || res.status === 'checked_in') && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              className="px-4 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      {children || <p className="text-sm font-medium text-gray-800">{value}</p>}
    </div>
  );
}
