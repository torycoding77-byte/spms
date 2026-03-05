'use client';

import SettlementReport from '@/components/SettlementReport';

export default function SettlementPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">정산 보고서</h1>
        <p className="text-sm text-gray-500">채널별 정산 현황 및 순수익 분석</p>
      </div>
      <SettlementReport />
    </div>
  );
}
