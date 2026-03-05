'use client';

import MonthlyReport from '@/components/MonthlyReport';

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">월간 정산 리포트</h1>
        <p className="text-sm text-gray-500">일별 마감 및 월간 매출 분석</p>
      </div>
      <MonthlyReport />
    </div>
  );
}
