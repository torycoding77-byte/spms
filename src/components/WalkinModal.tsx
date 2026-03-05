'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Reservation, PaymentMethod, StayType } from '@/types';
import { X } from 'lucide-react';

interface Props {
  roomNumber: string;
  onClose: () => void;
}

export default function WalkinModal({ roomNumber, onClose }: Props) {
  const { addReservations } = useStore();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(11, 0, 0, 0);

  const [form, setForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_vehicle: '',
    stay_type: 'nightly' as StayType,
    check_in: now.toISOString().slice(0, 16),
    check_out: tomorrow.toISOString().slice(0, 16),
    sale_price: '',
    payment_method: 'cash' as PaymentMethod,
    memo: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guest_name || !form.sale_price) return;

    const price = parseInt(form.sale_price);
    const reservation: Reservation = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      external_id: `WALK-${Date.now()}`,
      source: 'walkin',
      room_number: roomNumber,
      room_type: 'standard',
      stay_type: form.stay_type,
      guest_name: form.guest_name,
      guest_phone: form.guest_phone,
      guest_vehicle: form.guest_vehicle,
      check_in: new Date(form.check_in).toISOString(),
      check_out: new Date(form.check_out).toISOString(),
      sale_price: price,
      settlement_price: price,
      commission: 0,
      payment_method: form.payment_method,
      status: 'checked_in',
      memo: form.memo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await addReservations([reservation]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b bg-green-50 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-green-800">현장 예약 등록</h3>
            <p className="text-sm text-green-600">{roomNumber}호</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-green-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">고객명 *</span>
              <input
                type="text"
                required
                value={form.guest_name}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                placeholder="홍길동"
              />
            </label>
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
          </div>

          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer has-[:checked]:bg-amber-50 has-[:checked]:border-amber-400">
              <input
                type="radio"
                name="stay_type"
                value="hourly"
                checked={form.stay_type === 'hourly'}
                onChange={() => {
                  const checkout = new Date(now);
                  checkout.setHours(checkout.getHours() + 4);
                  setForm({ ...form, stay_type: 'hourly', check_out: checkout.toISOString().slice(0, 16) });
                }}
                className="accent-amber-500"
              />
              <span className="text-sm font-medium">대실</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400">
              <input
                type="radio"
                name="stay_type"
                value="nightly"
                checked={form.stay_type === 'nightly'}
                onChange={() => setForm({ ...form, stay_type: 'nightly', check_out: tomorrow.toISOString().slice(0, 16) })}
                className="accent-indigo-500"
              />
              <span className="text-sm font-medium">숙박</span>
            </label>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">금액 *</span>
              <input
                type="number"
                required
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                placeholder="50000"
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
              placeholder="특이사항 입력"
            />
          </label>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            예약 등록
          </button>
        </form>
      </div>
    </div>
  );
}
