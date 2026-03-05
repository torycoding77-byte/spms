'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { VipGuest } from '@/types';
import { formatDate } from '@/lib/utils';
import { Star, Plus, UserCheck, Phone, BedDouble, Trash2 } from 'lucide-react';

export default function CrmManager() {
  const { vipGuests, addVipGuest, updateVipGuest, reservations } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    preferred_room: '',
    notes: '',
  });

  // 자동 VIP 감지: 3회 이상 방문 고객
  const autoVips = useMemo(() => {
    const guestVisits: Record<string, { name: string; phone: string; count: number; rooms: Set<string>; lastVisit: string }> = {};

    reservations.forEach((r) => {
      if (r.status === 'cancelled' || !r.guest_name) return;
      const key = r.guest_name + (r.guest_phone || '');
      if (!guestVisits[key]) {
        guestVisits[key] = { name: r.guest_name, phone: r.guest_phone, count: 0, rooms: new Set(), lastVisit: r.check_in };
      }
      guestVisits[key].count++;
      if (r.room_number) guestVisits[key].rooms.add(r.room_number);
      if (r.check_in > guestVisits[key].lastVisit) guestVisits[key].lastVisit = r.check_in;
    });

    return Object.values(guestVisits)
      .filter((g) => g.count >= 3)
      .sort((a, b) => b.count - a.count);
  }, [reservations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    const guest: VipGuest = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      name: form.name,
      phone: form.phone,
      visit_count: 0,
      preferred_room: form.preferred_room || undefined,
      notes: form.notes,
    };

    addVipGuest(guest);
    setForm({ name: '', phone: '', preferred_room: '', notes: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Auto-detected VIPs */}
      {autoVips.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <h3 className="text-sm font-semibold text-yellow-800 flex items-center gap-2 mb-3">
            <UserCheck size={16} /> 자동 감지 단골 고객 (3회 이상 방문)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {autoVips.map((guest, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-yellow-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{guest.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone size={10} /> {guest.phone || '-'}
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    {guest.count}회
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <BedDouble size={10} />
                  선호: {[...guest.rooms].join(', ')}호
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  마지막 방문: {formatDate(guest.lastVisit)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual VIP List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="text-yellow-500" size={20} /> VIP 고객 관리
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
          >
            <Plus size={16} /> VIP 등록
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">이름 *</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">연락처</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">선호 객실</span>
                <input
                  type="text"
                  value={form.preferred_room}
                  onChange={(e) => setForm({ ...form, preferred_room: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="312"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">메모</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="특이사항"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">취소</button>
              <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">등록</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border divide-y">
          {vipGuests.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Star className="mx-auto mb-3" size={40} />
              <p>등록된 VIP 고객이 없습니다</p>
            </div>
          ) : (
            vipGuests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star size={16} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{guest.name}</p>
                    <p className="text-xs text-gray-500">{guest.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {guest.preferred_room && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                      {guest.preferred_room}호 선호
                    </span>
                  )}
                  {guest.notes && <span className="text-gray-400 text-xs">{guest.notes}</span>}
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{guest.visit_count}회 방문</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
