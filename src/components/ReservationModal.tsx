'use client';

import { useState } from 'react';
import { Reservation, PaymentMethod, StayType } from '@/types';
import { useStore } from '@/store/useStore';
import {
  formatCurrency, formatDateTime, getSourceLabel,
  getStatusLabel, getStatusColor, getSourceBgColor
} from '@/lib/utils';
import { X, Phone, Car, CreditCard, Edit2, Check, RotateCcw, MessageSquare } from 'lucide-react';

interface Props {
  reservation: Reservation;
  onClose: () => void;
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export default function ReservationModal({ reservation: res, onClose }: Props) {
  const { updateReservation, rooms } = useStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    room_number: res.room_number,
    guest_name: res.guest_name,
    guest_phone: res.guest_phone || '',
    guest_vehicle: res.guest_vehicle || '',
    stay_type: res.stay_type,
    check_in: toLocalDatetime(res.check_in),
    check_out: toLocalDatetime(res.check_out),
    sale_price: res.sale_price.toString(),
    commission: res.commission.toString(),
    payment_method: res.payment_method,
    memo: res.memo || '',
  });

  const handleStatusChange = async (status: Reservation['status']) => {
    await updateReservation(res.id, { status });
    if (status === 'checked_out') onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    const salePrice = parseInt(form.sale_price) || 0;
    const commission = parseInt(form.commission) || 0;
    await updateReservation(res.id, {
      room_number: form.room_number,
      guest_name: form.guest_name,
      guest_phone: form.guest_phone,
      guest_vehicle: form.guest_vehicle,
      stay_type: form.stay_type as StayType,
      check_in: new Date(form.check_in).toISOString(),
      check_out: new Date(form.check_out).toISOString(),
      sale_price: salePrice,
      commission,
      settlement_price: salePrice - commission,
      payment_method: form.payment_method as PaymentMethod,
      memo: form.memo,
    });
    setSaving(false);
    setEditing(false);
  };

  const activeRooms = rooms.filter((r) => r.is_active);

  // 편집 모드
  if (editing) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={`p-4 rounded-t-2xl border ${getSourceBgColor(res.source)}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-medium px-2 py-0.5 bg-white/80 rounded-full">
                  {getSourceLabel(res.source)}
                </span>
                <h3 className="text-lg font-bold mt-2">예약 수정</h3>
                <p className="text-sm text-gray-600">예약번호: {res.external_id}</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Edit Form */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">고객명 *</span>
                <input
                  type="text"
                  value={form.guest_name}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">객실</span>
                <select
                  value={form.room_number}
                  onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                >
                  {form.room_number && !activeRooms.find(r => r.room_number === form.room_number) && (
                    <option value={form.room_number}>{form.room_number}호</option>
                  )}
                  {activeRooms.map((r) => (
                    <option key={r.room_number} value={r.room_number}>{r.room_number}호</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">연락처</span>
                <input
                  type="tel"
                  value={form.guest_phone}
                  onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="010-0000-0000"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">차량번호</span>
                <input
                  type="text"
                  value={form.guest_vehicle}
                  onChange={(e) => setForm({ ...form, guest_vehicle: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="12가 3456"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer has-[:checked]:bg-amber-50 has-[:checked]:border-amber-400">
                <input
                  type="radio" name="edit_stay_type" value="hourly"
                  checked={form.stay_type === 'hourly'}
                  onChange={() => setForm({ ...form, stay_type: 'hourly' })}
                  className="accent-amber-500"
                />
                <span className="text-sm font-medium">대실</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400">
                <input
                  type="radio" name="edit_stay_type" value="nightly"
                  checked={form.stay_type === 'nightly'}
                  onChange={() => setForm({ ...form, stay_type: 'nightly' })}
                  className="accent-indigo-500"
                />
                <span className="text-sm font-medium">숙박</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">체크인</span>
                <input
                  type="datetime-local"
                  value={form.check_in}
                  onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">체크아웃</span>
                <input
                  type="datetime-local"
                  value={form.check_out}
                  onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">판매금액</span>
                <input
                  type="number"
                  value={form.sale_price}
                  onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">수수료</span>
                <input
                  type="number"
                  value={form.commission}
                  onChange={(e) => setForm({ ...form, commission: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">결제방법</span>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                >
                  <option value="cash">현금</option>
                  <option value="card">카드</option>
                  <option value="ota_transfer">OTA 정산</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-gray-500">메모</span>
              <textarea
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                rows={2}
              />
            </label>
          </div>

          {/* Save / Cancel */}
          <div className="p-4 border-t flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.guest_name}
              className="flex-1 bg-pink-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={16} />
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              <RotateCcw size={14} />
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 조회 모드
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 hover:bg-white/50 rounded-full"
                title="예약 수정"
              >
                <Edit2 size={16} />
              </button>
              <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full">
                <X size={20} />
              </button>
            </div>
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
              <>
                <a href={`tel:${res.guest_phone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <Phone size={14} /> {res.guest_phone}
                </a>
                <a href={`sms:${res.guest_phone}`} className="flex items-center gap-1 text-sm text-green-600 hover:underline">
                  <MessageSquare size={14} /> 문자
                </a>
              </>
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
