import * as XLSX from 'xlsx';
import { Reservation, ReservationSource, RoomType, StayType } from '@/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ==================== 지능형 매핑 ====================

const ROOM_TYPE_MAP: [RegExp, RoomType][] = [
  [/스위트|suite|vip/i, 'suite'],
  [/디럭스|deluxe|특실/i, 'deluxe'],
  [/일반|스탠다드|standard|패밀리|family|가족|비데|리모컨/i, 'standard'],
];

function normalizeRoomType(raw: string): RoomType {
  for (const [pattern, type] of ROOM_TYPE_MAP) {
    if (pattern.test(raw)) return type;
  }
  return 'standard';
}

function detectStayType(row: Record<string, unknown>): StayType {
  const stayField = safeString(
    row['투숙유형'] || row['이용유형'] || row['상품유형'] || row['예약유형'] || ''
  );
  if (/대실|시간|hourly/i.test(stayField)) return 'hourly';
  if (/숙박|1박|nightly|overnight/i.test(stayField)) return 'nightly';

  // 체크인~체크아웃 시간 차이로 추정
  const checkIn = safeString(row['입실일시'] || row['체크인'] || row['입실일'] || row['이용시작'] || '');
  const checkOut = safeString(row['퇴실일시'] || row['체크아웃'] || row['퇴실일'] || row['이용종료'] || '');
  if (checkIn && checkOut) {
    const inDate = new Date(checkIn.replace(/\./g, '-'));
    const outDate = new Date(checkOut.replace(/\./g, '-'));
    const hours = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60);
    if (hours > 0 && hours <= 6) return 'hourly';
  }
  return 'nightly';
}

function extractRoomNumber(row: Record<string, unknown>): string {
  const raw = safeString(row['객실번호'] || row['배정객실'] || row['호실'] || '');
  // "305호" -> "305", "3F-305" -> "305"
  const match = raw.match(/(\d{3,4})/);
  return match ? match[1] : '';
}

// ==================== 유틸 ====================

function parseKoreanDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const cleaned = dateStr.replace(/\./g, '-').trim();
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

// 날짜가 비어있으면 undefined 반환 (필수 필드가 아닌 경우용)
function parseKoreanDateOptional(dateStr: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const cleaned = dateStr.replace(/\./g, '-').trim();
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

// 예약상태 문자열을 표준 상태로 매핑
function mapReservationStatus(raw: string): import('@/types').ReservationStatus {
  if (!raw) return 'confirmed';
  if (/취소|cancel/i.test(raw)) return 'cancelled';
  if (/노쇼|no.?show/i.test(raw)) return 'no_show';
  if (/체크아웃|퇴실완료/i.test(raw)) return 'checked_out';
  if (/체크인|입실완료|이용중/i.test(raw)) return 'checked_in';
  return 'confirmed';
}

function safeNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? Math.round(val) : 0;
  if (typeof val === 'boolean') return val ? 1 : 0;
  // 문자열(텍스트 형식 숫자) · 기타 타입 모두 문자열화 후 숫자 외 문자 제거
  const str = String(val).trim();
  if (!str) return 0;
  // 숫자(0-9), 소수점(.), 음수부호(-) 만 남김
  const cleaned = str.replace(/[^\d.\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function safeString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// ==================== 채널별 파서 (확장 가능 구조) ====================

interface ChannelParser {
  name: string;
  source: ReservationSource;
  detect: (fileName: string, headers: string) => boolean;
  parse: (workbook: XLSX.WorkBook) => Partial<Reservation>[];
}

const yanoljaParser: ChannelParser = {
  name: '야놀자',
  source: 'yanolja',
  detect: (fileName, headers) =>
    /야놀자|yanolja/i.test(fileName) ||
    headers.includes('NOL') ||
    headers.includes('입금예정가') ||
    headers.includes('판매금액'),
  parse: (workbook) => {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // 헤더 행 자동 감지 (안내 문구/빈 행이 앞에 있을 수 있음)
    const refStartRow = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r : 0;
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(10, allRows.length); i++) {
      const rowStr = (allRows[i] || []).map(String).join(',');
      if (
        rowStr.includes('NOL 숙소 예약번호') ||
        rowStr.includes('판매금액') ||
        rowStr.includes('입금예정가') ||
        (rowStr.includes('예약번호') && rowStr.includes('예약자'))
      ) {
        headerRowIdx = i;
        break;
      }
    }
    // range 옵션은 시트의 절대 행 인덱스를 요구하므로 !ref 시작 행을 더한다
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { range: headerRowIdx + refStartRow });
    const results: Partial<Reservation>[] = [];

    for (const row of rows) {
      const externalId = safeString(row['NOL 숙소 예약번호'] || row['예약번호'] || row['NO']);
      if (!externalId) continue;

      const roomTypeName = safeString(row['객실타입'] || row['객실명'] || row['상품명']);
      const salePrice = safeNumber(row['판매금액'] || row['판매가'] || row['결제금액'] || 0);
      const settlementPrice = safeNumber(row['입금예정가'] || row['정산금액'] || row['정산예정금액'] || 0);
      const rawStatus = safeString(row['예약상태'] || row['상태'] || '');
      const reservedAt = parseKoreanDateOptional(safeString(row['예약일시'] || row['예약시간']));
      const cancelledAt = parseKoreanDateOptional(
        safeString(row['예약취소일시'] || row['제휴점 취소일시'] || row['취소일시'])
      );
      const status = mapReservationStatus(rawStatus);

      results.push({
        id: generateId(),
        external_id: externalId,
        source: 'yanolja',
        room_number: extractRoomNumber(row),
        room_type: normalizeRoomType(roomTypeName),
        stay_type: detectStayType(row),
        guest_name: safeString(row['예약자'] || row['예약자명'] || row['고객명']),
        guest_phone: safeString(row['연락처'] || row['전화번호'] || row['휴대폰']),
        guest_vehicle: safeString(row['차량번호'] || row['차량'] || '') || undefined,
        check_in: parseKoreanDate(safeString(row['입실일시'] || row['체크인'] || row['입실일'])),
        check_out: parseKoreanDate(safeString(row['퇴실일시'] || row['체크아웃'] || row['퇴실일'])),
        reserved_at: reservedAt,
        cancelled_at: cancelledAt,
        sale_price: salePrice,
        settlement_price: settlementPrice,
        commission: Math.max(0, salePrice - settlementPrice),
        payment_method: 'ota_transfer',
        status,
        memo: `야놀자 - ${roomTypeName}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return results;
  },
};

const yeogiParser: ChannelParser = {
  name: '여기어때',
  source: 'yeogi',
  detect: (fileName, headers) =>
    /여기어때|yeogi|예약내역/i.test(fileName) ||
    headers.includes('통합예약번호') ||
    headers.includes('정산 금액'),
  parse: (workbook) => {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // 여기어때는 헤더가 1행이 아닐 수 있음 (안내 문구 행이 앞에 있음)
    const refStartRow = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r : 0;
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(10, allRows.length); i++) {
      const rowStr = (allRows[i] || []).map(String).join(',');
      if (rowStr.includes('통합예약번호') || rowStr.includes('예약번호')) {
        headerRowIdx = i;
        break;
      }
    }
    // range는 시트의 절대 행 인덱스가 필요하므로 !ref 시작 행을 더한다
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { range: headerRowIdx + refStartRow });
    const results: Partial<Reservation>[] = [];

    for (const row of rows) {
      const externalId = safeString(row['통합예약번호'] || row['예약번호'] || row['NO']);
      if (!externalId) continue;

      const rawStatus = safeString(row['진행상태'] || row['상태'] || '');
      const status = mapReservationStatus(rawStatus);

      const roomTypeName = safeString(row['객실타입'] || row['객실명'] || row['상품명']);
      const salePrice = safeNumber(row['판매가'] || row['판매금액'] || row['결제금액'] || 0);
      const settlementPrice = safeNumber(row['정산 금액(예정)'] || row['정산금액'] || row['정산예정금액'] || 0);

      // 사용시간 파싱: "2026-01-15T17:00 ~ 2026-01-16T11:00"
      const usageTime = safeString(row['사용시간'] || '');
      let checkIn = '';
      let checkOut = '';
      if (usageTime.includes('~')) {
        const parts = usageTime.split('~').map((s) => s.trim());
        checkIn = parseKoreanDate(parts[0]);
        checkOut = parseKoreanDate(parts[1]);
      } else {
        checkIn = parseKoreanDate(safeString(row['체크인'] || row['입실일'] || row['이용시작'] || ''));
        checkOut = parseKoreanDate(safeString(row['체크아웃'] || row['퇴실일'] || row['이용종료'] || ''));
      }

      // 예약시간 (예약 접수일시)
      const reservedAt = parseKoreanDateOptional(
        safeString(row['예약시간'] || row['예약일시'] || '')
      );
      const cancelledAt = parseKoreanDateOptional(
        safeString(row['취소일시'] || row['예약취소일시'] || '')
      );

      // 이동수단에서 차량 여부 확인
      const vehicle = safeString(row['이동수단'] || row['차량번호'] || row['차량'] || '');

      results.push({
        id: generateId(),
        external_id: externalId,
        source: 'yeogi',
        room_number: extractRoomNumber(row),
        room_type: normalizeRoomType(roomTypeName),
        stay_type: detectStayType(row),
        guest_name: safeString(row['예약자'] || row['예약자명'] || row['고객명']),
        guest_phone: safeString(row['연락처'] || row['전화번호'] || row['휴대폰']),
        guest_vehicle: /차량/i.test(vehicle) ? vehicle : undefined,
        check_in: checkIn,
        check_out: checkOut,
        reserved_at: reservedAt,
        cancelled_at: cancelledAt,
        sale_price: salePrice,
        settlement_price: settlementPrice,
        commission: Math.max(0, salePrice - settlementPrice),
        payment_method: 'ota_transfer',
        status,
        memo: `여기어때 - ${roomTypeName}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return results;
  },
};

// 향후 아고다, 에어비앤비 등 추가 시 여기에 push
const PARSERS: ChannelParser[] = [yanoljaParser, yeogiParser];

// ==================== 공개 API ====================

export interface ParseResult {
  source: ReservationSource;
  sourceName: string;
  reservations: Partial<Reservation>[];
  headers: string[];
  totalRows: number;
  assigned: number;   // 객실 배정됨
  unassigned: number; // 미배정 (대기열 필요)
}

export function parseExcelFile(buffer: ArrayBuffer, fileName: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // 실제 헤더 행 자동 감지 (첫 10행 중 컬럼명이 있는 행)
  const refStartRow = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r : 0;
  const allRawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, allRawRows.length); i++) {
    const rowStr = (allRawRows[i] || []).map(String).join(',');
    if (rowStr.includes('예약번호') || rowStr.includes('NOL') || rowStr.includes('통합예약번호')) {
      headerRowIdx = i;
      break;
    }
  }
  const rawHeaders = allRawRows[headerRowIdx] || [];
  const headers = rawHeaders.map(String);
  const headerStr = headers.join(',');
  const totalRows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIdx + refStartRow }).length;

  // 자동 감지
  for (const parser of PARSERS) {
    if (parser.detect(fileName, headerStr)) {
      const reservations = parser.parse(workbook);
      const assigned = reservations.filter((r) => r.room_number).length;
      return {
        source: parser.source,
        sourceName: parser.name,
        reservations,
        headers,
        totalRows,
        assigned,
        unassigned: reservations.length - assigned,
      };
    }
  }

  // 감지 실패 시 야놀자 기본 시도
  const reservations = yanoljaParser.parse(workbook);
  const assigned = reservations.filter((r) => r.room_number).length;
  return {
    source: 'yanolja',
    sourceName: '야놀자 (추정)',
    reservations,
    headers,
    totalRows,
    assigned,
    unassigned: reservations.length - assigned,
  };
}

// 엑셀 내보내기
export function exportReservationsToExcel(reservations: Reservation[]): Blob {
  const data = reservations.map((r) => ({
    '예약번호': r.external_id,
    '채널': r.source === 'yanolja' ? '야놀자' : r.source === 'yeogi' ? '여기어때' : '현장',
    '유형': r.stay_type === 'hourly' ? '대실' : '숙박',
    '객실': r.room_number,
    '고객명': r.guest_name,
    '연락처': r.guest_phone,
    '체크인': r.check_in,
    '체크아웃': r.check_out,
    '판매가': r.sale_price,
    '정산가': r.settlement_price,
    '수수료': r.commission,
    '결제': r.payment_method === 'cash' ? '현금' : r.payment_method === 'card' ? '카드' : 'OTA',
    '상태': r.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '예약목록');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
