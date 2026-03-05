'use client';

import ExpenseManager from '@/components/ExpenseManager';

export default function ExpensesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">지출 관리</h1>
        <p className="text-sm text-gray-500">일별 지출 내역을 관리합니다</p>
      </div>
      <ExpenseManager />
    </div>
  );
}
