'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Room, RoomStatus, RoomType } from '@/types';
import { getStatusLabel, getStatusColor, cn } from '@/lib/utils';
import { CheckCircle, Wrench, Ban, Sparkles, Edit2, Save, SprayCan, Settings, X } from 'lucide-react';

const STATUS_OPTIONS: { value: RoomStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'available', label: '판매가능', icon: <CheckCircle size={14} />, color: 'bg-green-500' },
  { value: 'cleaning', label: '청소중', icon: <Sparkles size={14} />, color: 'bg-yellow-500' },
  { value: 'maintenance', label: '유지보수', icon: <Wrench size={14} />, color: 'bg-orange-500' },
  { value: 'blocked', label: '판매중지', icon: <Ban size={14} />, color: 'bg-red-500' },
];

const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'standard', label: '스탠다드' },
  { value: 'deluxe', label: '디럭스' },
  { value: 'suite', label: '스위트' },
];

const ROOM_TYPE_COLORS: Record<string, string> = {
  standard: 'bg-blue-100 text-blue-700',
  deluxe: 'bg-yellow-100 text-yellow-700',
  suite: 'bg-blue-100 text-blue-700',
};

export default function RoomManager() {
  const { rooms, updateRoomStatus, updateRoomNotes, updateRoom, getReservationsForRoom, selectedDate } = useStore();
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [requestingRoom, setRequestingRoom] = useState<string | null>(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  // 객실 수정 모달
  const [editModal, setEditModal] = useState<Room | null>(null);
  const [editForm, setEditForm] = useState({ room_type: '' as RoomType, floor: 0, notes: '', is_active: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (roomNumber: string, currentNotes: string) => {
    setEditingRoom(roomNumber);
    setNoteText(currentNotes);
  };

  const saveNote = (roomNumber: string) => {
    updateRoomNotes(roomNumber, noteText);
    setEditingRoom(null);
  };

  const openEditModal = (room: Room) => {
    setEditModal(room);
    setEditForm({
      room_type: room.room_type,
      floor: room.floor,
      notes: room.notes,
      is_active: room.is_active,
    });
  };

  const saveRoomEdit = async () => {
    if (!editModal || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateRoom(editModal.room_number, editForm);
      setEditModal(null);
    } catch {
      alert('객실 수정에 실패했습니다.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openCleaningRequest = (roomNumber: string) => {
    setRequestingRoom(roomNumber);
    setRequestMsg(`${roomNumber}호 청소 부탁드립니다`);
  };

  const sendCleaningRequest = async () => {
    if (!requestingRoom || sendingRequest) return;
    setSendingRequest(true);
    try {
      const res = await fetch('/api/housekeeping/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: requestingRoom,
          requested_by: '관리자',
          message: requestMsg,
        }),
      });
      const result = await res.json();
      if (result.data) {
        // 로컬 store도 청소중으로 변경
        updateRoomStatus(requestingRoom, 'cleaning');
      }
      setRequestingRoom(null);
    } catch {
      alert('청소 요청 전송에 실패했습니다.');
    } finally {
      setSendingRequest(false);
    }
  };

  const activeRooms = rooms.filter((r) => r.is_active);
  const blockedRooms = activeRooms.filter((r) => r.status === 'blocked');
  const normalRooms = activeRooms.filter((r) => r.status !== 'blocked');
  const groupedRooms = ROOM_TYPE_OPTIONS.map((opt) => ({
    ...opt,
    rooms: normalRooms.filter((r) => r.room_type === opt.value),
  })).filter((g) => g.rooms.length > 0);

  return (
    <>
      {groupedRooms.map((group) => (
        <div key={group.value} className="mb-8">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200">
            <div className={cn('w-1 h-6 rounded-full', group.value === 'standard' ? 'bg-blue-500' : group.value === 'deluxe' ? 'bg-yellow-500' : 'bg-blue-400')} />
            <h2 className="text-base font-bold text-gray-800">객실 타입: {group.label}</h2>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROOM_TYPE_COLORS[group.value])}>
              {group.rooms.length}실
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {group.rooms.map((room) => {
          const reservations = getReservationsForRoom(room.room_number, selectedDate);
          const isOccupied = reservations.some((r) => r.status === 'checked_in');
          const effectiveStatus = isOccupied ? 'occupied' : room.status;

          return (
            <div
              key={room.room_number}
              className={cn(
                'bg-white rounded-xl border-2 p-4 transition-all',
                effectiveStatus === 'available' && 'border-green-300 hover:border-green-400',
                effectiveStatus === 'occupied' && 'border-blue-300 bg-blue-50',
                effectiveStatus === 'cleaning' && 'border-yellow-300 bg-yellow-50',
                effectiveStatus === 'maintenance' && 'border-orange-300 bg-orange-50',
                effectiveStatus === 'blocked' && 'border-red-300 bg-red-50',
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-2xl font-bold text-gray-800">{room.room_number}</h3>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', ROOM_TYPE_COLORS[room.room_type])}>
                    {ROOM_TYPE_OPTIONS.find((o) => o.value === room.room_type)?.label || room.room_type}
                  </span>
                  <button
                    onClick={() => openEditModal(room)}
                    className="p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="객실 수정"
                  >
                    <Settings size={14} />
                  </button>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(effectiveStatus)}`}>
                  {getStatusLabel(effectiveStatus)}
                </span>
              </div>

              {/* Current Guest */}
              {isOccupied && reservations.length > 0 && (
                <div className="text-xs bg-white/80 rounded-lg p-2 mb-3 border">
                  <p className="font-medium">{reservations[0].guest_name}</p>
                  <p className="text-gray-500">{reservations[0].guest_phone}</p>
                </div>
              )}

              {/* Notes */}
              <div className="mb-3">
                {editingRoom === room.room_number ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="flex-1 text-xs border rounded px-2 py-1"
                      placeholder="특이사항 입력"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveNote(room.room_number)}
                    />
                    <button onClick={() => saveNote(room.room_number)} className="text-green-600 hover:text-green-700">
                      <Save size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-start gap-1 cursor-pointer group"
                    onClick={() => startEdit(room.room_number, room.notes)}
                  >
                    <Edit2 size={12} className="text-gray-300 group-hover:text-gray-500 mt-0.5" />
                    <p className="text-xs text-gray-500">
                      {room.notes || '특이사항 없음'}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Buttons + Cleaning Request */}
              {!isOccupied && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateRoomStatus(room.room_number, opt.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-xs text-white transition-opacity',
                          opt.color,
                          room.status === opt.value ? 'opacity-100 ring-2 ring-offset-1 ring-gray-300' : 'opacity-40 hover:opacity-70'
                        )}
                        title={opt.label}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                  {/* 청소 요청 버튼 */}
                  <button
                    onClick={() => openCleaningRequest(room.room_number)}
                    className={cn(
                      'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      effectiveStatus === 'cleaning'
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                        : 'bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100'
                    )}
                  >
                    <SprayCan size={12} />
                    {effectiveStatus === 'cleaning' ? '청소 요청됨' : '청소 요청'}
                  </button>
                </div>
              )}

              {/* Occupied indicator */}
              {effectiveStatus === 'occupied' && (
                <p className="text-xs text-center text-blue-500 mt-2">투숙중</p>
              )}

              {room.last_cleaned && (
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  마지막 청소: {new Date(room.last_cleaned).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              )}
            </div>
          );
        })}
          </div>
        </div>
      ))}

      {/* ── 판매중지 객실 ── */}
      {blockedRooms.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b border-red-200">
            <div className="w-1 h-6 rounded-full bg-red-500" />
            <h2 className="text-base font-bold text-gray-800">판매중지</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
              {blockedRooms.length}실
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {blockedRooms.map((room) => {
              const reservations = getReservationsForRoom(room.room_number, selectedDate);
              const isOccupied = reservations.some((r) => r.status === 'checked_in');
              const effectiveStatus = isOccupied ? 'occupied' : room.status;

              return (
                <div
                  key={room.room_number}
                  className="bg-white rounded-xl border-2 border-red-300 bg-red-50 p-4 transition-all opacity-60"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-2xl font-bold text-gray-800">{room.room_number}</h3>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', ROOM_TYPE_COLORS[room.room_type])}>
                        {ROOM_TYPE_OPTIONS.find((o) => o.value === room.room_type)?.label || room.room_type}
                      </span>
                      <button
                        onClick={() => openEditModal(room)}
                        className="p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="객실 수정"
                      >
                        <Settings size={14} />
                      </button>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-600">
                      판매중지
                    </span>
                  </div>

                  {room.notes && (
                    <p className="text-xs text-gray-500 mb-3">{room.notes}</p>
                  )}

                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateRoomStatus(room.room_number, opt.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-xs text-white transition-opacity',
                          opt.color,
                          room.status === opt.value ? 'opacity-100 ring-2 ring-offset-1 ring-gray-300' : 'opacity-40 hover:opacity-70'
                        )}
                        title={opt.label}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 객실 수정 모달 ── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setEditModal(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">{editModal.room_number}호 객실 수정</h3>
              <button onClick={() => setEditModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 객실 타입 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">객실 타입</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROOM_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setEditForm((f) => ({ ...f, room_type: opt.value }))}
                      className={cn(
                        'py-2 rounded-lg text-sm font-medium border transition-colors',
                        editForm.room_type === opt.value
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 층수 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">층수</label>
                <input
                  type="number"
                  value={editForm.floor}
                  onChange={(e) => setEditForm((f) => ({ ...f, floor: parseInt(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  min={1}
                />
              </div>

              {/* 특이사항 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">특이사항</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={2}
                  placeholder="특이사항 입력"
                />
              </div>

              {/* 활성 상태 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">객실 활성화</label>
                  <p className="text-xs text-gray-400">비활성 시 모든 화면에서 숨겨집니다</p>
                </div>
                <button
                  onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    editForm.is_active ? 'bg-blue-500' : 'bg-gray-300'
                  )}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: editForm.is_active ? 'translateX(22px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>
            </div>

            <div className="flex border-t">
              <button
                disabled={savingEdit}
                onClick={saveRoomEdit}
                className="flex-1 py-3.5 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {savingEdit ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    저장 중...
                  </div>
                ) : '저장'}
              </button>
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-3.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 청소 요청 팝업 ── */}
      {requestingRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setRequestingRoom(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-pink-50 pt-6 pb-4 flex flex-col items-center">
              <div className="w-14 h-14 bg-pink-600 rounded-full flex items-center justify-center mb-3">
                <SprayCan size={24} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{requestingRoom}호</h3>
              <p className="text-sm text-pink-600 mt-1">청소 요청</p>
            </div>

            <div className="p-5">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">메시지</label>
              <textarea
                value={requestMsg}
                onChange={(e) => setRequestMsg(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
                rows={2}
                placeholder="청소 요청 메시지"
              />
            </div>

            <div className="flex border-t">
              <button
                disabled={sendingRequest}
                onClick={sendCleaningRequest}
                className="flex-1 py-3.5 text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 transition-colors disabled:opacity-50 border-r border-pink-400"
              >
                {sendingRequest ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    전송 중...
                  </div>
                ) : '요청 보내기'}
              </button>
              <button
                onClick={() => setRequestingRoom(null)}
                className="flex-1 py-3.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
