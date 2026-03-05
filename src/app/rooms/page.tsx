'use client';

import RoomManager from '@/components/RoomManager';

export default function RoomsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">객실 관리</h1>
        <p className="text-sm text-gray-500">301호~325호 객실 상태 및 하우스키핑 관리</p>
      </div>
      <RoomManager />
    </div>
  );
}
