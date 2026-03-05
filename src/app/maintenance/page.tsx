'use client';

import MaintenanceManager from '@/components/MaintenanceManager';

export default function MaintenancePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">유지보수 관리</h1>
        <p className="text-sm text-gray-500">객실별 시설 점검 및 수리 기록을 관리합니다</p>
      </div>
      <MaintenanceManager />
    </div>
  );
}
