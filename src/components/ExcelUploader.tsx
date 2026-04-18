'use client';

import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Eye, ArrowRight, ArrowLeft, Save, X } from 'lucide-react';
import { parseExcelFile, ParseResult } from '@/lib/excel-parser';
import { useStore } from '@/store/useStore';
import { Reservation, StayType } from '@/types';
import { formatCurrency, getSourceLabel, cn } from '@/lib/utils';
import { showToast } from './Toast';

type Step = 'upload' | 'preview' | 'done';

export default function ExcelUploader() {
  const { addReservations, reservations } = useStore();
  const [step, setStep] = useState<Step>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  // 파싱된 예약을 분류:
  //   newly        : 신규 (DB에 없음) → 저장
  //   cancelUpdate : 기존 DB 활성 예약이 엑셀에서 취소됨 → status=cancelled 업데이트
  //   priceFix     : 기존 DB 레코드의 금액이 0인데 엑셀엔 값이 있음 → 금액만 덮어쓰기
  //   skipped      : 이미 존재하며 금액도 정상 → 무시
  const partition = parseResult ? parseResult.reservations.reduce<{
    newly: typeof parseResult.reservations;
    skipped: typeof parseResult.reservations;
    cancelUpdate: typeof parseResult.reservations;
    priceFix: typeof parseResult.reservations;
  }>(
    (acc, r) => {
      const existing = r.external_id
        ? reservations.find((x) => x.external_id === r.external_id)
        : undefined;
      if (!existing) {
        acc.newly.push(r);
        return acc;
      }
      if (r.status === 'cancelled' && existing.status !== 'cancelled') {
        acc.cancelUpdate.push(r);
      } else if (
        (existing.sale_price === 0 || existing.settlement_price === 0) &&
        ((r.sale_price || 0) > 0 || (r.settlement_price || 0) > 0)
      ) {
        // 기존 레코드가 0원이고 새 데이터에 금액이 있으면 덮어쓰기 (파서 버그 복구)
        acc.priceFix.push(r);
      } else {
        acc.skipped.push(r);
      }
      return acc;
    },
    { newly: [], skipped: [], cancelUpdate: [], priceFix: [] }
  ) : { newly: [], skipped: [], cancelUpdate: [], priceFix: [] };

  const processFile = useCallback(async (file: File) => {
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelFile(buffer, file.name);

      if (result.reservations.length === 0) {
        setError('파싱된 예약이 없습니다. 파일 형식을 확인해주세요.');
        return;
      }

      setParseResult(result);
      setStep('preview');
    } catch (err) {
      setError(`파일 처리 중 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  }, []);

  const handleConfirm = async () => {
    if (!parseResult) return;
    const toSave = [...partition.newly, ...partition.cancelUpdate, ...partition.priceFix];
    if (toSave.length === 0) {
      showToast({
        type: 'info',
        title: '변경할 데이터 없음',
        message: '모든 예약이 이미 등록되어 있습니다.',
      });
      setStep('done');
      return;
    }
    setSaving(true);
    try {
      await addReservations(toSave as Reservation[]);
      setStep('done');
      const parts = [`신규 ${partition.newly.length}건`];
      if (partition.priceFix.length > 0) parts.push(`금액 복구 ${partition.priceFix.length}건`);
      if (partition.cancelUpdate.length > 0) parts.push(`취소 처리 ${partition.cancelUpdate.length}건`);
      if (partition.skipped.length > 0) parts.push(`건너뜀 ${partition.skipped.length}건`);
      showToast({
        type: 'success',
        title: '업로드 완료',
        message: parts.join(' · '),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setParseResult(null);
    setError('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processFile(file);
    } else {
      setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  // Step indicator
  const steps = [
    { key: 'upload', label: '파일 선택' },
    { key: 'preview', label: '데이터 확인' },
    { key: 'done', label: '완료' },
  ];

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              step === s.key ? 'bg-pink-500 text-white' :
              steps.findIndex(x => x.key === step) > i ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            )}>
              {steps.findIndex(x => x.key === step) > i ? <CheckCircle size={16} /> : i + 1}
            </div>
            <span className={cn('text-sm', step === s.key ? 'font-semibold text-gray-800' : 'text-gray-400')}>
              {s.label}
            </span>
            {i < steps.length - 1 && <ArrowRight size={14} className="text-gray-300 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer',
              dragOver ? 'border-pink-400 bg-pink-50 scale-[1.01]' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            )}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-lg font-medium text-gray-700">야놀자/여기어때 예약 엑셀 파일을 끌어다 놓으세요</p>
            <p className="text-sm text-gray-500 mt-2">또는 클릭하여 파일 선택 (.xlsx, .xls)</p>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-800 mb-3">지원 채널</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <div>
                  <p className="text-sm font-medium">야놀자</p>
                  <p className="text-xs text-gray-500">NOL 예약번호, 입실일시, 판매금액, 입금예정가</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm font-medium">여기어때</p>
                  <p className="text-xs text-gray-500">통합예약번호, 투숙유형(대실/숙박), 정산금액</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">향후 아고다, 에어비앤비 등 확장 예정</p>
          </div>
        </>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && parseResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-pink-500" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-800">데이터 미리보기</h3>
                  <p className="text-xs text-gray-500">DB에 저장하기 전에 파싱 결과를 확인하세요</p>
                </div>
              </div>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatBox label="감지 채널" value={parseResult.sourceName}
                color={parseResult.source === 'yanolja' ? 'text-pink-600' : 'text-blue-600'} />
              <StatBox label="파싱 성공" value={`${parseResult.reservations.length}건`} color="text-gray-700" />
              <StatBox label="객실 배정" value={`${parseResult.assigned}건`} color="text-blue-600" />
              <StatBox label="미배정" value={`${parseResult.unassigned}건`}
                color={parseResult.unassigned > 0 ? 'text-orange-600' : 'text-gray-400'} />
            </div>

            {/* 중복 체크 결과 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatBox label="신규 등록 예정" value={`${partition.newly.length}건`} color="text-green-600" />
              <StatBox label="금액 복구" value={`${partition.priceFix.length}건`}
                color={partition.priceFix.length > 0 ? 'text-blue-600' : 'text-gray-400'} />
              <StatBox label="취소 처리" value={`${partition.cancelUpdate.length}건`}
                color={partition.cancelUpdate.length > 0 ? 'text-red-500' : 'text-gray-400'} />
              <StatBox label="중복 (건너뜀)" value={`${partition.skipped.length}건`}
                color={partition.skipped.length > 0 ? 'text-gray-500' : 'text-gray-400'} />
            </div>

            {partition.priceFix.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-2">
                💰 <b>{partition.priceFix.length}건</b>은 기존 DB에 금액이 0으로 저장되어 있어 이번 엑셀 값으로 <b>금액을 복구</b>합니다.
              </div>
            )}

            {partition.skipped.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 mb-2">
                ℹ️ 이미 등록된 예약 <b>{partition.skipped.length}건</b>은 기존 데이터 보호를 위해 건너뜁니다.
              </div>
            )}
            {partition.cancelUpdate.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-2">
                🚫 <b>{partition.cancelUpdate.length}건</b>이 엑셀에서 취소 상태 → 기존 예약을 <b>취소로 상태 변경</b>합니다.
              </div>
            )}
            {parseResult.unassigned > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                {parseResult.unassigned}건의 예약에 객실 번호가 없습니다. 저장 후 타임라인에서 드래그앤드롭으로 배정할 수 있습니다.
              </div>
            )}
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-left">#</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-left">상태</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-left">예약번호</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-left">유형</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-left">고객</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-left">객실</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-left">체크인</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-left">체크아웃</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">판매가</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">정산가</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parseResult.reservations.map((r, i) => {
                    const isSkipped = partition.skipped.includes(r);
                    const isCancelUpdate = partition.cancelUpdate.includes(r);
                    const isPriceFix = partition.priceFix.includes(r);
                    const rowClass = isSkipped
                      ? 'bg-gray-50/70 opacity-60'
                      : isCancelUpdate
                        ? 'bg-red-50/50'
                        : isPriceFix
                          ? 'bg-blue-50/50'
                          : !r.room_number
                            ? 'bg-orange-50/50'
                            : '';
                    return (
                    <tr key={i} className={cn('hover:bg-gray-50', rowClass)}>
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        {isSkipped ? (
                          <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">건너뜀</span>
                        ) : isCancelUpdate ? (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">취소</span>
                        ) : isPriceFix ? (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">금액복구</span>
                        ) : (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">신규</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.external_id}</td>
                      <td className="px-3 py-2">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium',
                          r.stay_type === 'hourly' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        )}>
                          {r.stay_type === 'hourly' ? '대실' : '숙박'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium">{r.guest_name}</td>
                      <td className="px-3 py-2">
                        {r.room_number ? (
                          <span className="text-gray-700">{r.room_number}호</span>
                        ) : (
                          <span className="text-orange-500 text-xs">미배정</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {r.check_in ? new Date(r.check_in).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {r.check_out ? new Date(r.check_out).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(r.sale_price || 0)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(r.settlement_price || 0)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft size={16} /> 다시 선택
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
            >
              {saving ? (
                <><FileSpreadsheet size={16} className="animate-spin" /> 저장 중...</>
              ) : (
                <><Save size={16} /> 신규 {partition.newly.length}건{partition.priceFix.length > 0 ? ` · 금액복구 ${partition.priceFix.length}건` : ''}{partition.cancelUpdate.length > 0 ? ` · 취소 ${partition.cancelUpdate.length}건` : ''}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && parseResult && (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
          <h3 className="text-xl font-bold text-gray-800 mb-2">업로드 완료!</h3>
          <p className="text-gray-500 mb-6">
            {parseResult.sourceName} 예약 {parseResult.reservations.length}건이 시스템에 반영되었습니다.
          </p>
          {parseResult.unassigned > 0 && (
            <p className="text-orange-600 text-sm mb-6">
              {parseResult.unassigned}건의 미배정 예약은 타임라인에서 객실을 배정해주세요.
            </p>
          )}
          <div className="flex justify-center gap-3">
            <button onClick={reset} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              추가 업로드
            </button>
            <a href="/timeline" className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700">
              타임라인 확인
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 text-red-700">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-lg font-bold', color || 'text-gray-800')}>{value}</p>
    </div>
  );
}
