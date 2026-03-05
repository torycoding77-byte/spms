'use client';

import Dashboard from '@/components/Dashboard';
import { useStore } from '@/store/useStore';

export default function Home() {
  const { selectedDate, setSelectedDate } = useStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>
          <p className="text-sm text-gray-500">매출 현황 및 운영 요약</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <Dashboard />
    </div>
  );
}
