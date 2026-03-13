'use client';

import { useState } from 'react';
import CommissionSettings from '@/components/CommissionSettings';
import PermissionSettings from '@/components/PermissionSettings';
import { cn } from '@/lib/utils';
import { Percent, Shield } from 'lucide-react';

type Tab = 'commission' | 'permission';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('commission');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">설정</h1>
        <p className="text-sm text-gray-500">수수료율, 권한 및 계정 관리</p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        <button
          onClick={() => setTab('commission')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'commission' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Percent size={14} /> 수수료 설정
        </button>
        <button
          onClick={() => setTab('permission')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'permission' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Shield size={14} /> 권한 설정
        </button>
      </div>

      {tab === 'commission' && <CommissionSettings />}
      {tab === 'permission' && <PermissionSettings />}
    </div>
  );
}
