'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Reservation, PaymentMethod, ReservationStatus, RoomType, StayType } from '@/types';
import { X } from 'lucide-react';
import { showToast } from './Toast';

interface Props {
  roomNumber?: string;  // 호출한 곳에서 미리 지정한 객실번호 (없으면 사용자가 입력)
  initialCheckIn?: string; // ISO datetime-local string (YYYY-MM-DDTHH:mm)
  onClose: () => void;
}

// Date → "YYYY-MM-DDTHH:mm" (로컬 시간대 기준, datetime-local input 용)
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function WalkinModal({ roomNumber, initialCheckIn, onClose }: Props) {
  const { addReservations, getEffectiveRate, rooms, reservations } = useStore();
  const baseCheckIn = initialCheckIn ? new Date(initialCheckIn) : new Date();
  const defaultCheckOut = new Date(baseCheckIn);
  defaultCheckOut.setDate(defaultCheckOut.getDate() + 1);
  defaultCheckOut.setHours(11, 0, 0, 0);

  // 체크인 시각이 미래면 예약확정, 현재/과거면 체크인 상태
  const defaultStatus: ReservationStatus = baseCheckIn.getTime() > Date.now() ? 'confirmed' : 'checked_in';

  // 초기 객실타입: roomNumber가 주어진 경우 해당 객실의 타입
  const initialRoomType: RoomType | '' = roomNumber
    ? (rooms.find((r) => r.room_number === roomNumber)?.room_type || '')
    : '';

  const [form, setForm] = useState({
    room_type: initialRoomType as RoomType | '',
    room_number: roomNumber || '',
    guest_name: '',
    guest_phone: '',
    guest_vehicle: '',
    stay_type: 'nightly' as StayType,
    check_in: toLocalInputValue(baseCheckIn),
    check_out: toLocalInputValue(defaultCheckOut),
    sale_price: '',
    payment_method: 'cash' as PaymentMethod,
    status: defaultStatus as ReservationStatus,
    memo: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 객실타입 필터링된 객실 목록
  const filteredRooms = rooms.filter((r) => {
    if (!r.is_active) return false;
    if (form.room_type && r.room_type !== form.room_type) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guest_name || !form.sale_price) return;

    // 객실이 지정된 경우에만 중복 체크 (미배정이면 건너뜀)
    if (form.room_number) {
      const newIn = new Date(form.check_in).getTime();
      const newOut = new Date(form.check_out).getTime();
      const conflict = reservations.find((r) => {
        if (r.room_number !== form.room_number) return false;
        if (r.status === 'cancelled' || r.status === 'no_show' || r.status === 'checked_out') return false;
        const existIn = new Date(r.check_in).getTime();
        const existOut = new Date(r.check_out).getTime();
        return existIn < newOut && existOut > newIn;
      });
      if (conflict) {
        const ok = confirm(
          `해당 객실(${form.room_number}호)에 이미 ${conflict.guest_name}님의 예약이 있습니다.\n그래도 등록하시겠습니까?`
        );
        if (!ok) return;
      }
    }

    const price = parseInt(form.sale_price);
    const roomType: RoomType = form.room_type || 'standard';
    const commissionRate = getEffectiveRate('walkin', roomType);
    const commission = Math.round(price * commissionRate / 100);
    const now = new Date().toISOString();
    const reservation: Reservation = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      external_id: `WALK-${Date.now()}`,
      source: 'walkin',
      room_number: form.room_number, // 빈 문자열이면 미배정
      room_type: roomType,
      stay_type: form.stay_type,
      guest_name: form.guest_name,
      guest_phone: form.guest_phone,
      guest_vehicle: form.guest_vehicle,
      check_in: new Date(form.check_in).toISOString(),
      check_out: new Date(form.check_out).toISOString(),
      reserved_at: now,
      sale_price: price,
      settlement_price: price - commission,
      commission,
      payment_method: form.payment_method,
      status: form.status,
      memo: form.memo,
      created_at: now,
      updated_at: now,
    };

    setSubmitting(true);
    try {
      await addReservations([reservation]);
      showToast({
        type: 'success',
        title: '예약 등록 완료',
        message: `${form.guest_name}님 ${form.room_number ? form.room_number + '호' : '(미배정)'}`,
      });
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: '예약 등록 실패',
        message: err instanceof Error ? err.message : '알 수 없는 오류. DB 연결을 확인하세요.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b bg-green-50 rounded-t-2xl sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-green-800">현장 예약 등록</h3>
            <p className="text-sm text-green-600">
              {form.room_number ? `${form.room_number}호` : '미배정 (나중에 배정 가능)'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-green-100 rounded-full"
            aria-label="창 닫기"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">객실타입</span>
              <select
                value={form.room_type}
                onChange={(e) => {
                  const newType = e.target.value as RoomType | '';
                  // 현재 선택된 객실이 새 타입에 맞지 않으면 초기화
                  const roomMatches = form.room_number
                    ? rooms.find((r) => r.room_number === form.room_number)?.room_type === newType
                    : true;
                  setForm({
                    ...form,
                    room_type: newType,
                    room_number: newType && !roomMatches ? '' : form.room_number,
                  });
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">전체</option>
                <option value="standard">일반실</option>
                <option value="deluxe">디럭스</option>
                <option value="suite">스위트</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">
                객실번호 (선택)
                {form.room_type && (
                  <span className="ml-1 text-[10px] text-gray-400">
                    · {filteredRooms.length}개 가능
                  </span>
                )}
              </span>
              <input
                type="text"
                list="room-list"
                value={form.room_number}
                onChange={(e) => setForm({ ...form, room_number: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                placeholder={form.room_type ? '타입 내 객실 선택' : '예: 305 (미배정 가능)'}
                inputMode="numeric"
              />
              <datalist id="room-list">
                {filteredRooms.map((r) => (
                  <option key={r.room_number} value={r.room_number}>
                    {r.room_number}호 ({r.room_type === 'standard' ? '일반실' : r.room_type === 'deluxe' ? '디럭스' : '스위트'})
                  </option>
                ))}
              </datalist>
            </label>
          </div>

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
                  const checkout = new Date(form.check_in);
                  checkout.setHours(checkout.getHours() + 3);
                  setForm({ ...form, stay_type: 'hourly', check_out: toLocalInputValue(checkout) });
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
                onChange={() => {
                  const co = new Date(form.check_in);
                  co.setDate(co.getDate() + 1);
                  co.setHours(11, 0, 0, 0);
                  setForm({ ...form, stay_type: 'nightly', check_out: toLocalInputValue(co) });
                }}
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
            <span className="text-xs text-gray-500">예약 상태</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ReservationStatus })}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option value="confirmed">예약확정 (미입실)</option>
              <option value="checked_in">체크인 (입실완료)</option>
            </select>
          </label>

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
            disabled={submitting}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '예약 등록'}
          </button>
        </form>
      </div>
    </div>
  );
}
