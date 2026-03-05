# OneHotel simple PMS - 구현 문서

> One Hotel Smart PMS (Excel-Driven OTA 통합 객실관리 시스템)

---

## 1. 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 15.2.1 |
| 언어 | TypeScript | 5.x |
| UI | React | 19.x |
| 스타일링 | Tailwind CSS | v4 (`@tailwindcss/postcss`) |
| 상태관리 | Zustand | 5.x |
| DB/Auth | Supabase (PostgreSQL + Realtime) | 2.49+ |
| 차트 | Recharts | 2.15 |
| 엑셀 파싱 | SheetJS (xlsx) | 0.18.5 |
| 아이콘 | Lucide React | 0.469 |
| 날짜 | date-fns | 4.1 |

---

## 2. 프로젝트 구조

```
D:/dev/spms/
├── .env.local                          # Supabase 연결 정보
├── package.json
├── next.config.ts
├── supabase/
│   ├── migration.sql                   # V1: reservations, rooms, expenses, vip_guests
│   ├── migration_v2.sql                # V2: maintenance_logs, commission_rates, daily_closings
│   └── migration_v3.sql                # V3: stay_type 컬럼 추가
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 루트 레이아웃 (Sidebar + SupabaseProvider)
│   │   ├── page.tsx                    # / 대시보드
│   │   ├── globals.css                 # Tailwind 글로벌 스타일
│   │   ├── timeline/page.tsx           # /timeline
│   │   ├── upload/page.tsx             # /upload
│   │   ├── rooms/page.tsx              # /rooms
│   │   ├── maintenance/page.tsx        # /maintenance
│   │   ├── expenses/page.tsx           # /expenses
│   │   ├── crm/page.tsx               # /crm
│   │   ├── settlement/page.tsx         # /settlement
│   │   ├── reports/page.tsx            # /reports
│   │   └── settings/page.tsx           # /settings
│   ├── components/
│   │   ├── Sidebar.tsx                 # 사이드바 네비게이션 (모바일 반응형)
│   │   ├── SupabaseProvider.tsx        # Supabase 초기화 + Realtime 구독
│   │   ├── Toast.tsx                   # 글로벌 토스트 알림 시스템
│   │   ├── Dashboard.tsx               # 메인 대시보드 (요약카드 + 결제현황)
│   │   ├── DashboardCharts.tsx         # 대시보드 차트 (dynamic import)
│   │   ├── Timeline.tsx                # 예약 타임라인 (드래그앤드롭)
│   │   ├── ExcelUploader.tsx           # 엑셀 업로드 3단계 위자드
│   │   ├── ReservationModal.tsx        # 예약 상세 모달
│   │   ├── WalkinModal.tsx             # 현장예약 등록 모달
│   │   ├── RoomManager.tsx             # 객실 상태 관리
│   │   ├── MaintenanceManager.tsx      # 유지보수 로그 관리
│   │   ├── ExpenseManager.tsx          # 지출 관리
│   │   ├── CrmManager.tsx             # VIP 고객 관리
│   │   ├── SettlementReport.tsx        # 정산 보고서
│   │   ├── MonthlyReport.tsx           # 월간 마감 리포트
│   │   └── CommissionSettings.tsx      # OTA 수수료율 설정
│   ├── store/
│   │   └── useStore.ts                 # Zustand 전역 상태 (Supabase CRUD 통합)
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase 클라이언트
│   │   ├── supabase-db.ts              # V1 CRUD (reservations, rooms, expenses, vip)
│   │   ├── supabase-db-v2.ts           # V2 CRUD (maintenance, commission, daily_closings)
│   │   ├── excel-parser.ts             # OTA 엑셀 파서 (확장 가능 구조)
│   │   └── utils.ts                    # 유틸 함수
│   └── types/
│       ├── index.ts                    # 전체 타입 정의
│       └── supabase.ts                 # Supabase DB 타입
```

---

## 3. 핵심 기능 구현 상세

### 3.1 엑셀 업로드 위자드 (`ExcelUploader.tsx` + `excel-parser.ts`)

**3단계 위자드 흐름:**
1. **파일 선택** - 드래그앤드롭 또는 클릭으로 .xlsx/.xls 업로드
2. **데이터 미리보기** - 파싱 결과 테이블, 채널 자동감지, 배정/미배정 통계
3. **완료** - DB 저장 확인, 타임라인 이동 링크

**확장 가능한 파서 아키텍처:**
```typescript
interface ChannelParser {
  name: string;
  source: ReservationSource;
  detect: (fileName: string, headers: string) => boolean;
  parse: (workbook: XLSX.WorkBook) => Partial<Reservation>[];
}
```
- `PARSERS` 배열에 새 OTA 파서를 push하면 자동 지원
- 현재 구현: 야놀자(`yanoljaParser`), 여기어때(`yeogiParser`)
- 파일명 + 헤더 기반 자동 채널 감지

**지능형 매핑:**
- `detectStayType()`: 투숙유형 필드 확인 → 없으면 체크인/체크아웃 시간차로 추정 (6시간 이하 = 대실)
- `normalizeRoomType()`: 정규식 기반 객실타입 매핑 ("일반실(리모컨 비데)" → standard)
- `extractRoomNumber()`: 다양한 형식에서 객실번호 추출 ("305호", "3F-305" → "305")

**엑셀 내보내기:**
- `exportReservationsToExcel()`: Reservation[] → .xlsx Blob 생성

### 3.2 예약 타임라인 (`Timeline.tsx`)

- **24시간 그리드**: 1일/3일/7일 뷰 전환
- **채널별 컬러 코딩**: 야놀자(핑크), 여기어때(블루), 현장(그린)
- **대실/숙박 구분**: 대실은 밝은 색 + 점선 테두리, 숙박은 솔리드
- **미배정 예약 큐**: 객실번호 없는 예약을 상단 오렌지 배너에 표시
- **드래그앤드롭 배정**: 미배정 예약을 객실 행에 드래그하여 `room_number` 업데이트
- **객실 클릭 → 현장예약**: 빈 객실 클릭 시 `WalkinModal` 오픈
- **예약 블록 클릭 → 상세**: `ReservationModal` 오픈

### 3.3 정산 보고서 (`SettlementReport.tsx`)

- **월 선택기**: `<input type="month">` 로 기간 선택
- **채널별 정산 카드**: 야놀자/여기어때/현장별 판매액, 수수료, 입금예정, 대실/숙박 건수
- **일별/주별 차트**: BarChart로 매출/정산/순수익 추이
- **채널별 매출 비중**: PieChart (도넛 차트)
- **정산 공식 시각화**: 총판매 - 수수료 - 지출 = 순수익 (그라데이션 바)
- **엑셀 다운로드**: 월간 예약 데이터를 .xlsx로 내보내기

### 3.4 현장예약 (`WalkinModal.tsx`)

- 대실/숙박 라디오 버튼 선택
- 대실 선택 시 체크아웃 자동 +4시간 설정
- 숙박 선택 시 체크아웃 익일 11:00 설정
- 결제방법: 현금/카드 선택
- 수수료 0원 (현장 직접 결제)

### 3.5 예약 상세 모달 (`ReservationModal.tsx`)

- 채널 라벨 + 대실/숙박 유형 배지
- 판매금액 / 수수료 / 정산금액 표시
- 상태 변경: 체크인 → 체크아웃 → 취소

### 3.6 대시보드 (`Dashboard.tsx` + `DashboardCharts.tsx`)

- **요약 카드**: 총매출, 총지출, 순수익, 객실가동률
- **결제수단별**: 현금, 카드, OTA 정산 (수수료 표시)
- **주간 매출 차트**: 최근 7일 BarChart (recharts dynamic import로 성능 최적화)
- **채널별 비중**: PieChart

### 3.7 객실 관리 (`RoomManager.tsx`)

- 301~325호 객실 그리드
- 상태 버튼: 이용가능 / 청소중 / 점검중 / 사용불가
- 객실별 메모 편집

### 3.8 유지보수 관리 (`MaintenanceManager.tsx`)

- 유지보수 로그 CRUD
- 우선순위(긴급/높음/보통/낮음) + 상태(대기/진행/완료) 필터

### 3.9 지출 관리 (`ExpenseManager.tsx`)

- 일별 지출 등록/삭제
- 카테고리별 분류

### 3.10 VIP 고객 관리 (`CrmManager.tsx`)

- VIP 고객 등록 (선호객실, 메모)
- 체크인 시 자동 VIP 알림 (SupabaseProvider에서 Realtime 감지)

### 3.11 월간 마감 리포트 (`MonthlyReport.tsx`)

- 일별 매출/지출/순수익 차트 (BarChart + AreaChart)
- 일일 마감 처리 버튼

### 3.12 OTA 수수료 설정 (`CommissionSettings.tsx`)

- 채널별 기본 수수료율 편집
- 프로모션 기간 수수료율 설정

---

## 4. 상태관리 (`useStore.ts`)

**Zustand 스토어 구조:**

| 영역 | 설명 |
|------|------|
| `reservations` | 전체 예약 목록 |
| `rooms` | 객실 목록 (301~325) |
| `expenses` | 지출 목록 |
| `vipGuests` | VIP 고객 목록 |
| `loading` / `error` | 로딩/에러 상태 |
| `selectedDate` | 선택된 날짜 |
| `sidebarOpen` | 사이드바 열림/닫힘 |

**Supabase 연동 패턴:**
- 모든 CRUD는 async 함수로 Supabase DB와 동기화
- **Optimistic Update**: UI 먼저 변경 → DB 호출 → 실패 시 롤백
- **Realtime Sync**: `_syncReservation`, `_syncRoom`, `_syncExpense` 헬퍼로 실시간 반영
- **초기화 타임아웃**: 5초 내 Supabase 응답 없으면 빈 데이터로 앱 시작

**Computed 함수:**
- `getDailySummary(date)`: 일별 매출/지출/순수익/가동률 계산
- `getReservationsForDate(date)`: 날짜별 예약 필터
- `getReservationsForRoom(roomNumber, date)`: 객실+날짜별 예약

---

## 5. Supabase 연동

### 5.1 클라이언트 (`supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(url, anonKey);
```
- Database 제네릭 미사용 (타입 호환 문제 회피, `as unknown as Type` 캐스트)

### 5.2 DB 스키마 (마이그레이션)

**V1 (`migration.sql`):**
- `reservations`: 예약 테이블 (external_id UNIQUE, upsert 지원)
- `rooms`: 객실 테이블 (301~325 초기 데이터)
- `expenses`: 지출 테이블
- `vip_guests`: VIP 고객 테이블
- RLS 정책, Realtime 활성화, updated_at 자동 트리거

**V2 (`migration_v2.sql`):**
- `maintenance_logs`: 유지보수 로그
- `commission_rates`: OTA 수수료율
- `daily_closings`: 일일 마감 데이터

**V3 (`migration_v3.sql`):** *(실행 필요)*
- `stay_type` ENUM 타입 추가 (`hourly` | `nightly`)
- `reservations` 테이블에 `stay_type` 컬럼 추가 (기본값 `nightly`)
- 기존 데이터 자동 분류 (체크인~체크아웃 6시간 이하 → hourly)

### 5.3 Realtime 구독 (`SupabaseProvider.tsx`)
- `reservations`, `rooms`, `expenses` 테이블 변경 실시간 감지
- VIP 고객 체크인 시 자동 Toast 알림

---

## 6. 성능 최적화

| 최적화 | 설명 |
|--------|------|
| Dynamic Import | recharts를 `DashboardCharts`로 분리, `dynamic(() => import(...), { ssr: false })` |
| 비차단 로딩 | Supabase 로딩 중에도 앱 UI 즉시 렌더링 (우측 상단 작은 알림만 표시) |
| 초기화 타임아웃 | Supabase 5초 타임아웃, 실패 시 빈 데이터로 시작 |
| Optimistic Update | DB 응답 전 UI 먼저 반영, 실패 시 롤백 |
| useMemo | 차트 데이터, 필터링 결과 등 비용 높은 계산 캐싱 |

---

## 7. 타입 정의 (`types/index.ts`)

```typescript
type ReservationSource = 'yanolja' | 'yeogi' | 'walkin';
type StayType = 'hourly' | 'nightly';
type RoomType = 'standard' | 'deluxe' | 'suite' | 'family';
type RoomStatus = 'available' | 'cleaning' | 'inspection' | 'unavailable';
type PaymentMethod = 'cash' | 'card' | 'ota_transfer';
type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

interface Reservation {
  id, external_id, source, room_number, room_type, stay_type,
  guest_name, guest_phone, guest_vehicle?,
  check_in, check_out,
  sale_price, settlement_price, commission,
  payment_method, status, memo?,
  created_at, updated_at
}
```

---

## 8. 페이지 라우팅

| 경로 | 페이지 | 컴포넌트 |
|------|--------|----------|
| `/` | 대시보드 | Dashboard |
| `/timeline` | 예약 타임라인 | Timeline |
| `/upload` | 엑셀 업로드 | ExcelUploader |
| `/rooms` | 객실 관리 | RoomManager |
| `/maintenance` | 유지보수 | MaintenanceManager |
| `/expenses` | 지출 관리 | ExpenseManager |
| `/crm` | 고객 관리 | CrmManager |
| `/settlement` | 정산 보고서 | SettlementReport |
| `/reports` | 월간 리포트 | MonthlyReport |
| `/settings` | 설정 | CommissionSettings |

---

## 9. 미완료 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| `migration_v3.sql` 실행 | **미실행** | Supabase SQL Editor에서 수동 실행 필요 |
| 아고다/에어비앤비 파서 | 미구현 | `PARSERS` 배열에 추가하면 자동 지원 |
| 사용자 인증 (로그인) | 미구현 | 현재 anon key로 RLS 없이 동작 |
| 다중 호텔 지원 | 미구현 | 단일 호텔 기준 설계 |
| 모바일 앱 | 미구현 | 반응형 웹으로 모바일 대응 중 |

---

## 10. 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build && npm start
```

**환경변수 (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

**Supabase 설정:**
1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/migration.sql` 실행
3. SQL Editor에서 `supabase/migration_v2.sql` 실행
4. SQL Editor에서 `supabase/migration_v3.sql` 실행
5. `.env.local`에 URL과 Anon Key 설정
