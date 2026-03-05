'use client';

import CommissionSettings from '@/components/CommissionSettings';

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">설정</h1>
        <p className="text-sm text-gray-500">수수료율 및 프로모션 관리</p>
      </div>
      <CommissionSettings />
    </div>
  );
}
