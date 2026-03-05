'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { RoomStatus } from '@/types';
import { getStatusLabel, getStatusColor, cn } from '@/lib/utils';
import { CheckCircle, Wrench, Ban, Sparkles, Edit2, Save } from 'lucide-react';

const STATUS_OPTIONS: { value: RoomStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'available', label: '판매가능', icon: <CheckCircle size={14} />, color: 'bg-green-500' },
  { value: 'cleaning', label: '청소중', icon: <Sparkles size={14} />, color: 'bg-yellow-500' },
  { value: 'maintenance', label: '유지보수', icon: <Wrench size={14} />, color: 'bg-orange-500' },
  { value: 'blocked', label: '판매중지', icon: <Ban size={14} />, color: 'bg-red-500' },
];

export default function RoomManager() {
  const { rooms, updateRoomStatus, updateRoomNotes, getReservationsForRoom, selectedDate } = useStore();
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const startEdit = (roomNumber: string, currentNotes: string) => {
    setEditingRoom(roomNumber);
    setNoteText(currentNotes);
  };

  const saveNote = (roomNumber: string) => {
    updateRoomNotes(roomNumber, noteText);
    setEditingRoom(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {rooms.filter((r) => r.is_active).map((room) => {
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
              <h3 className="text-2xl font-bold text-gray-800">{room.room_number}</h3>
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

            {/* Status Buttons */}
            {!isOccupied && (
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
            )}

            {/* Clean button for occupied rooms */}
            {effectiveStatus === 'occupied' && (
              <p className="text-xs text-center text-blue-500 mt-2">투숙중</p>
            )}

            {room.last_cleaned && (
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                마지막 청소: {new Date(room.last_cleaned).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
