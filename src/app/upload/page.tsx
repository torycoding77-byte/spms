'use client';

import ExcelUploader from '@/components/ExcelUploader';
import { useStore } from '@/store/useStore';
import { formatCurrency, getSourceLabel, formatDateTime } from '@/lib/utils';

export default function UploadPage() {
  const { reservations } = useStore();
  const recent = reservations.slice(-10).reverse();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">엑셀 업로드</h1>
        <p className="text-sm text-gray-500">야놀자/여기어때 예약 엑셀 파일을 업로드합니다</p>
      </div>

      <ExcelUploader />

      {recent.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-700">최근 등록된 예약 (최신 10건)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">출처</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">예약번호</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">고객명</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">객실</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">체크인</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.source === 'yanolja' ? 'bg-pink-100 text-pink-700' :
                        r.source === 'yeogi' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {getSourceLabel(r.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.external_id}</td>
                    <td className="px-4 py-3 font-medium">{r.guest_name}</td>
                    <td className="px-4 py-3">{r.room_number || '-'}호</td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(r.check_in)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(r.sale_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
