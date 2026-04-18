'use client';

import { useState } from 'react';
import { CommissionRate, ReservationSource } from '@/types';
import { useStore } from '@/store/useStore';
import { getSourceLabel, cn, todayKey } from '@/lib/utils';
import { Save, Percent, Tag, RefreshCw } from 'lucide-react';
import { showToast } from './Toast';

export default function CommissionSettings() {
  const { commissionRates: rates, saveCommissionRate, loading, reservations, updateReservation, getEffectiveRate } = useStore();
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    rate_percent: '',
    promo_rate_percent: '',
    promo_start: '',
    promo_end: '',
  });

  const startEdit = (rate: CommissionRate) => {
    setEditingId(rate.id);
    setEditForm({
      rate_percent: String(rate.rate_percent),
      promo_rate_percent: rate.promo_rate_percent ? String(rate.promo_rate_percent) : '',
      promo_start: rate.promo_start || '',
      promo_end: rate.promo_end || '',
    });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const updates: Partial<CommissionRate> = {
        id,
        rate_percent: parseFloat(editForm.rate_percent),
        promo_rate_percent: editForm.promo_rate_percent ? parseFloat(editForm.promo_rate_percent) : undefined,
        promo_start: editForm.promo_start || undefined,
        promo_end: editForm.promo_end || undefined,
      };

      await saveCommissionRate(updates);
      setEditingId(null);
      showToast({ type: 'success', title: '수수료율 저장', message: '수수료율이 업데이트되었습니다. 새 예약부터 적용됩니다.' });
    } catch (err) {
      showToast({
        type: 'error',
        title: '저장 실패',
        message: err instanceof Error ? err.message : '수수료율 저장에 실패했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  const isPromoActive = (rate: CommissionRate) => {
    if (!rate.promo_start || !rate.promo_end || !rate.promo_rate_percent) return false;
    const now = todayKey();
    return now >= rate.promo_start && now <= rate.promo_end;
  };

  const getDisplayRate = (rate: CommissionRate) => {
    return isPromoActive(rate) ? rate.promo_rate_percent! : rate.rate_percent;
  };

  if (loading) return <div className="text-center text-gray-400 py-8">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Percent size={16} /> OTA 수수료율 설정
          </h3>
          <p className="text-xs text-gray-400 mt-1">프로모션 기간 설정 시 해당 기간에 프로모션 수수료율이 자동 적용됩니다.</p>
        </div>
        <div className="divide-y">
          {rates.map((rate) => {
            const promo = isPromoActive(rate);
            const editing = editingId === rate.id;

            return (
              <div key={rate.id} className={cn('p-4', promo && 'bg-green-50/50')}>
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                        rate.source === 'yanolja' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {getSourceLabel(rate.source as ReservationSource)}
                      </span>
                      <span className="text-xs text-gray-500">{rate.room_type}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <label className="block">
                        <span className="text-xs text-gray-500">기본 수수료율 (%)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.rate_percent}
                          onChange={(e) => setEditForm({ ...editForm, rate_percent: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-500">프로모션 수수료율 (%)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.promo_rate_percent}
                          onChange={(e) => setEditForm({ ...editForm, promo_rate_percent: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                          placeholder="미입력시 비활성"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-500">프로모션 시작</span>
                        <input
                          type="date"
                          value={editForm.promo_start}
                          onChange={(e) => setEditForm({ ...editForm, promo_start: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-500">프로모션 종료</span>
                        <input
                          type="date"
                          value={editForm.promo_end}
                          onChange={(e) => setEditForm({ ...editForm, promo_end: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                        />
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">취소</button>
                      <button
                        onClick={() => saveEdit(rate.id)}
                        disabled={saving || !editForm.rate_percent}
                        className="flex items-center gap-1 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 active:bg-pink-800 disabled:opacity-50"
                      >
                        <Save size={14} /> {saving ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-lg"
                    onClick={() => startEdit(rate)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                        rate.source === 'yanolja' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {getSourceLabel(rate.source as ReservationSource)}
                      </span>
                      <span className="text-sm text-gray-600">{rate.room_type}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn('text-lg font-bold', promo ? 'text-green-600' : 'text-gray-800')}>
                          {getDisplayRate(rate)}%
                        </p>
                        {promo && (
                          <p className="text-xs text-green-500 flex items-center gap-1">
                            <Tag size={10} /> 프로모션 적용중 (기본: {rate.rate_percent}%)
                          </p>
                        )}
                      </div>
                      {rate.promo_start && rate.promo_end && (
                        <div className="text-xs text-gray-400 text-right">
                          <p>{rate.promo_start}</p>
                          <p>~ {rate.promo_end}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 일괄 재계산 1: 수수료율 기반 (판매금액 × 수수료율%) */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <RefreshCw size={16} /> 수수료율 기반 재계산
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              OTA 예약의 수수료를 위 설정된 <b>수수료율(%)</b>로 다시 계산합니다.
              <br />
              <span className="text-gray-400">공식: 판매금액 × 수수료율% → 정산금액도 재설정</span>
            </p>
          </div>
          <button
            onClick={async () => {
              const otaReservations = reservations.filter(
                (r) => r.source !== 'walkin' && r.status !== 'cancelled'
              );
              if (otaReservations.length === 0) {
                showToast({ type: 'info', title: '재계산 대상 없음', message: 'OTA 예약이 없습니다.' });
                return;
              }
              let count = 0;
              for (const res of otaReservations) {
                const ratePercent = getEffectiveRate(res.source, res.room_type);
                if (ratePercent === 0) continue;
                const newCommission = Math.round(res.sale_price * ratePercent / 100);
                const newSettlement = res.sale_price - newCommission;
                if (newCommission !== res.commission) {
                  await updateReservation(res.id, {
                    commission: newCommission,
                    settlement_price: newSettlement,
                  });
                  count++;
                }
              }
              showToast({
                type: 'success',
                title: '재계산 완료',
                message: `${count}건의 예약 수수료가 업데이트되었습니다.`,
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 whitespace-nowrap"
          >
            <RefreshCw size={14} /> 일괄 재계산
          </button>
        </div>
      </div>

      {/* 일괄 재계산 2: 판매 − 정산 기반 (엑셀 값 그대로 유지) */}
      <div className="bg-white rounded-xl border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <RefreshCw size={16} className="text-blue-600" /> 판매 − 정산 기반 재계산
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              모든 예약의 수수료를 <b>판매금액 − 정산금액</b>으로 다시 계산합니다.
              <br />
              <span className="text-gray-400">엑셀 업로드 값(판매금액·입금예정가)은 건드리지 않고 수수료 컬럼만 보정합니다.</span>
            </p>
          </div>
          <button
            onClick={async () => {
              const target = reservations.filter((r) => r.status !== 'cancelled');
              if (target.length === 0) {
                showToast({ type: 'info', title: '재계산 대상 없음', message: '활성 예약이 없습니다.' });
                return;
              }
              if (!confirm(`${target.length}건의 예약 수수료를\n"판매금액 − 정산금액"으로 재계산합니다.\n진행할까요?`)) return;
              let count = 0;
              let skipped = 0;
              for (const res of target) {
                const newCommission = Math.max(0, res.sale_price - res.settlement_price);
                if (newCommission === res.commission) { skipped++; continue; }
                try {
                  await updateReservation(res.id, { commission: newCommission });
                  count++;
                } catch { /* ignore individual failure */ }
              }
              showToast({
                type: 'success',
                title: '재계산 완료',
                message: `${count}건 업데이트 · ${skipped}건 이미 일치 (총 ${target.length}건)`,
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
          >
            <RefreshCw size={14} /> 판매−정산 재계산
          </button>
        </div>
      </div>
    </div>
  );
}
