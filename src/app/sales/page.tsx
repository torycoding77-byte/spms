'use client';

import SalesList from '@/components/SalesList';

export default function SalesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">매출내역</h1>
        <p className="text-sm text-gray-500">예약별 매출 현황을 조회합니다</p>
      </div>
      <SalesList />
    </div>
  );
}
