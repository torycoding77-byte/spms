'use client';

import CrmManager from '@/components/CrmManager';

export default function CrmPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">고객 관리 (CRM)</h1>
        <p className="text-sm text-gray-500">VIP 고객 및 단골 고객을 관리합니다</p>
      </div>
      <CrmManager />
    </div>
  );
}
