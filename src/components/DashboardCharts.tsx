'use client';

import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const PIE_COLORS = ['#e91e63', '#2196f3', '#4caf50'];

interface Props {
  weeklyData: { date: string; 매출: number; 지출: number; 순수익: number }[];
  sourceData: { name: string; value: number }[];
}

export default function DashboardCharts({ weeklyData, sourceData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">주간 매출 추이</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="매출" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="지출" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="순수익" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">채널별 매출 비중</h3>
        <div style={{ height: 280 }}>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              해당 날짜의 매출 데이터가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
