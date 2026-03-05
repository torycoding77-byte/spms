'use client';

import { useEffect, useMemo, useState } from 'react';
import { MaintenanceLog, MaintenancePriority, MaintenanceStatus } from '@/types';
import { fetchMaintenanceLogs, insertMaintenanceLog, updateMaintenanceLogDb } from '@/lib/supabase-db-v2';
import { useStore } from '@/store/useStore';
import { formatCurrency, cn } from '@/lib/utils';
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';

const PRIORITY_CONFIG: Record<MaintenancePriority, { label: string; color: string }> = {
  low: { label: '낮음', color: 'bg-gray-100 text-gray-600' },
  medium: { label: '보통', color: 'bg-blue-100 text-blue-700' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: '긴급', color: 'bg-red-100 text-red-700' },
};

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; icon: React.ReactNode }> = {
  open: { label: '접수', icon: <AlertTriangle size={14} className="text-red-500" /> },
  in_progress: { label: '진행중', icon: <Clock size={14} className="text-yellow-500" /> },
  resolved: { label: '완료', icon: <CheckCircle size={14} className="text-green-500" /> },
};

const CATEGORIES = ['전기', '배관', '가구', '도어/잠금', '냉난방', '청소', '기타'];

export default function MaintenanceManager() {
  const { rooms } = useStore();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MaintenanceStatus | 'all'>('all');
  const [form, setForm] = useState({
    room_number: '301',
    category: CATEGORIES[0],
    description: '',
    priority: 'medium' as MaintenancePriority,
    cost: '',
  });

  useEffect(() => {
    fetchMaintenanceLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return logs;
    return logs.filter((l) => l.status === filterStatus);
  }, [logs, filterStatus]);

  const stats = useMemo(() => ({
    open: logs.filter((l) => l.status === 'open').length,
    in_progress: logs.filter((l) => l.status === 'in_progress').length,
    resolved: logs.filter((l) => l.status === 'resolved').length,
    totalCost: logs.filter((l) => l.status === 'resolved').reduce((s, l) => s + l.cost, 0),
  }), [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description) return;

    const saved = await insertMaintenanceLog({
      room_number: form.room_number,
      category: form.category,
      description: form.description,
      priority: form.priority,
      status: 'open',
      cost: parseInt(form.cost) || 0,
    });
    setLogs((prev) => [saved, ...prev]);
    setForm({ room_number: '301', category: CATEGORIES[0], description: '', priority: 'medium', cost: '' });
    setShowForm(false);
  };

  const handleStatusChange = async (id: string, status: MaintenanceStatus) => {
    const updates: Partial<MaintenanceLog> = {
      status,
      ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
    };
    const saved = await updateMaintenanceLogDb(id, updates);
    setLogs((prev) => prev.map((l) => (l.id === id ? saved : l)));
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.open}</p>
          <p className="text-xs text-red-500">미처리</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
          <p className="text-xs text-yellow-500">진행중</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          <p className="text-xs text-green-500">완료</p>
        </div>
        <div className="bg-gray-50 rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-gray-700">{formatCurrency(stats.totalCost)}</p>
          <p className="text-xs text-gray-500">총 수리비</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['all', 'open', 'in_progress', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md transition-colors',
                filterStatus === s ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {s === 'all' ? '전체' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700"
        >
          <Plus size={16} /> 유지보수 등록
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">객실 *</span>
              <select
                value={form.room_number}
                onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                {rooms.map((r) => (
                  <option key={r.room_number} value={r.room_number}>{r.room_number}호</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">카테고리</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">우선순위</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as MaintenancePriority })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">예상 비용</span>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                placeholder="0"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-gray-500">상세 내용 *</span>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              rows={2}
              placeholder="예: 304호 도어락 자동 잠김 고장"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">취소</button>
            <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">등록</button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border divide-y">
        {loading ? (
          <div className="p-8 text-center text-gray-400">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Wrench className="mx-auto mb-3" size={40} />
            <p>유지보수 기록이 없습니다</p>
          </div>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {STATUS_CONFIG[log.status].icon}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{log.room_number}호</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{log.category}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_CONFIG[log.priority].color)}>
                        {PRIORITY_CONFIG[log.priority].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.reported_at).toLocaleString('ko-KR')}
                      {log.cost > 0 && ` | 비용: ${formatCurrency(log.cost)}`}
                      {log.resolved_at && ` | 완료: ${new Date(log.resolved_at).toLocaleString('ko-KR')}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {log.status === 'open' && (
                    <button
                      onClick={() => handleStatusChange(log.id, 'in_progress')}
                      className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                    >
                      진행
                    </button>
                  )}
                  {(log.status === 'open' || log.status === 'in_progress') && (
                    <button
                      onClick={() => handleStatusChange(log.id, 'resolved')}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      완료
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
