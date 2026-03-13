'use client';

import { useAuthStore } from '@/store/useAuthStore';
import HousekeepingCleaner from '@/components/HousekeepingCleaner';
import HousekeepingDashboard from '@/components/HousekeepingDashboard';

export default function HousekeepingPage() {
  const { role } = useAuthStore();

  if (role === 'housekeeper') {
    return <HousekeepingCleaner />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">하우스키핑</h1>
        <p className="text-sm text-gray-500">청소 이력 관리 및 분석</p>
      </div>
      <HousekeepingDashboard />
    </div>
  );
}
