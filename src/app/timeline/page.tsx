'use client';

import Timeline from '@/components/Timeline';

export default function TimelinePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">예약 타임라인</h1>
        <p className="text-sm text-gray-500">객실별 예약 현황을 실시간으로 확인합니다</p>
      </div>
      <Timeline />
    </div>
  );
}
