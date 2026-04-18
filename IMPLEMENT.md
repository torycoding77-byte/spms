# OneHotel simple PMS - 구현 문서

> One Hotel Smart PMS (Excel-Driven OTA 통합 객실관리 시스템)
> **배포**: Vercel (https://spms-two.vercel.app)

---

## 1. 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 15.5.12 |
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
│   │   ├── layout.tsx                  # 루트 레이아웃 (ClientLayout 래핑)
│   │   ├── page.tsx                    # / 대시보드
│   │   ├── globals.css                 # Tailwind 글로벌 스타일
│   │   ├── reservations/page.tsx       # /reservations 예약 관리 ★신규
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
│   │   ├── ClientLayout.tsx            # 인증 게이트 + 레이아웃 래퍼 ★신규
│   │   ├── LoginPage.tsx               # 관리자 로그인 페이지 ★신규
│   │   ├── Sidebar.tsx                 # 사이드바 네비게이션 (모바일 반응형) ★수정
│   │   ├── SupabaseProvider.tsx        # Supabase 초기화 + Realtime 구독
│   │   ├── Toast.tsx                   # 글로벌 토스트 알림 시스템
│   │   ├── Dashboard.tsx               # 메인 대시보드 (요약카드 + 결제현황)
│   │   ├── DashboardCharts.tsx         # 대시보드 차트 (dynamic import)
│   │   ├── ReservationManager.tsx      # 예약 관리 (목록 + 필터 + 날짜) ★신규
│   │   ├── ReservationModal.tsx        # 예약 상세/수정 모달 ★수정 (편집 모드 추가)
│   │   ├── Timeline.tsx                # 예약 타임라인 (드래그앤드롭) ★수정
│   │   ├── WalkinModal.tsx             # 현장예약 등록 모달 ★수정 (수수료 적용)
│   │   ├── ExcelUploader.tsx           # 엑셀 업로드 3단계 위자드
│   │   ├── RoomManager.tsx             # 객실 상태 관리
│   │   ├── MaintenanceManager.tsx      # 유지보수 로그 관리
│   │   ├── ExpenseManager.tsx          # 지출 관리
│   │   ├── CrmManager.tsx             # VIP 고객 관리
│   │   ├── SettlementReport.tsx        # 정산 보고서
│   │   ├── MonthlyReport.tsx           # 월간 마감 리포트
│   │   └── CommissionSettings.tsx      # OTA 수수료율 설정 ★수정 (스토어 통합)
│   ├── store/
│   │   ├── useStore.ts                 # Zustand 전역 상태 ★수정 (수수료 통합)
│   │   └── useAuthStore.ts             # 인증 상태 관리 ★신규
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

### 3.1 관리자 로그인 시스템 ★신규

**커밋**: `b6560a7`

| 항목 | 내용 |
|------|------|
| **파일** | `LoginPage.tsx`, `ClientLayout.tsx`, `useAuthStore.ts`, `layout.tsx` |
| **기본 계정** | ID: `admin` / PW: `flamingo2024` |
| **세션 유지** | `localStorage`에 세션 저장 (키: `flamingo_auth`), 새로고침 시 자동 복원 |

**동작 흐름**:
1. 앱 진입 → `ClientLayout`에서 `checkSession()` 호출
2. 미인증 → 다크 테마 로그인 페이지 표시
3. 로그인 성공 → `SupabaseProvider` + `Sidebar` + 메인 콘텐츠 렌더링
4. SSR 하이드레이션 불일치 방지: `hydrated` 상태로 초기 로딩 스피너 표시

**useAuthStore 액션**:
- `login(id, pw)` → 검증 후 localStorage 세션 저장
- `logout()` → 세션 삭제, 로그인 화면으로 복귀
- `checkSession()` → 기존 세션 복원

---

### 3.2 예약 관리 페이지 ★신규

**커밋**: `3539bb6`, `1d356c4`

| 항목 | 내용 |
|------|------|
| **파일** | `ReservationManager.tsx`, `app/reservations/page.tsx` |
| **라우트** | `/reservations` |
| **사이드바** | "예약 관리" (ClipboardList 아이콘, 대시보드 바로 아래) |

**기능**:
- **날짜 필터**: 날짜 선택기 + `<` `>` 이전/다음일 + "오늘" 버튼
  - 체크인~체크아웃 기간이 선택 날짜에 걸치는 예약만 표시
  - 요약 카드도 날짜 기준으로 집계
- **요약 카드 4종**: 전체 예약, 체크대기(confirmed), 체크인, 체크아웃 건수
- **검색/필터**: 고객명/객실번호/예약번호/전화번호 검색, 상태 필터, 채널 필터
- **예약 목록 테이블**: 고객명, 객실, 투숙기간, 숙박타입(대실/숙박), 결제금액, 채널, 상태
- 행 클릭 시 `ReservationModal`로 상세 확인 및 수정

---

### 3.3 예약 상세/수정 모달 ★수정

**커밋**: `2b263e1`

| 항목 | 내용 |
|------|------|
| **파일** | `ReservationModal.tsx` |
| **사용처** | 타임라인, 예약 관리 페이지 |

**조회 모드**:
- 채널별 헤더 색상 (야놀자: 핑크, 여기어때: 블루, 현장: 그린)
- 객실, 유형(대실/숙박), 상태, 체크인/아웃 시간
- 연락처(전화 링크), 차량번호
- 판매금액/수수료/정산금액 내역, 결제방법
- 메모 표시
- 상태 변경 버튼: 체크인 처리, 체크아웃 처리, 취소

**수정 모드** (헤더 연필 아이콘 클릭):
- 수정 가능 필드: 고객명, 객실(활성 객실 드롭다운), 연락처, 차량번호, 숙박타입(대실/숙박 라디오), 체크인/아웃(datetime-local), 판매금액, 수수료, 결제방법(현금/카드/OTA정산), 메모
- 정산금액 = 판매금액 - 수수료 자동 계산
- 저장/취소 버튼 (저장 중 로딩 표시)
- `toLocalDatetime()` 헬퍼: ISO → datetime-local 변환 (타임존 보정)

---

### 3.4 타임라인 기능 강화 ★수정

#### 셀 클릭 수동 예약 (`f1ec4df`)

- 타임라인 빈 영역 클릭 → 클릭 X좌표에서 시간 계산 → `WalkinModal` 오픈
- `WalkinModal`에 `initialCheckIn` prop 추가 → 체크인 시간 사전 입력
- 기존 예약 블록 클릭 → `e.stopPropagation()`으로 상세 모달 열기 (충돌 방지)

#### 드래그앤드롭 예약 이동 (`3ec4156`)

**DragInfo 타입**:
```typescript
interface DragInfo {
  reservationId: string;
  type: 'unassigned' | 'existing';  // 미배정 vs 기존 예약
  offsetRatio: number;               // 블록 내 클릭 위치 비율 (시간 보정용)
}
```

**기존 예약 블록 이동**:
- 예약 블록에 `draggable` 속성 추가
- `onDragStart`에서 블록 내 클릭 오프셋 비율 저장
- 드롭 시: 새 체크인 시간 = 드롭 위치 - (오프셋 * 숙박기간)
- 30분 단위 스냅: `Math.round(hour * 2) / 2`
- 숙박 기간(duration) 유지
- **충돌 감지**: 이동 후 같은 객실의 다른 예약과 겹치면 이동 차단
- **시각 피드백**: 드래그 중 블록 `opacity-50`, 대상 행 `bg-green-50` 하이라이트

**미배정 예약 드래그** (기존):
- `type: 'unassigned'` → 객실만 배정 (시간 변경 없음)

**`timelineRowRefs`**: 각 객실 행의 DOM ref를 `Map<string, HTMLDivElement>`으로 관리하여 드롭 위치 계산에 사용

---

### 3.5 대실 기본 시간 변경

**커밋**: `ce186bc`

- `WalkinModal`에서 대실 선택 시 체크아웃 = 체크인 + **3시간** (기존 4시간에서 변경)

---

### 3.6 모바일 사이드바 수정 ★수정

**커밋**: `7963513`, `35c2855`

**문제**: Tailwind CSS에서 `max-md:translate-x-[-100%]`과 `max-md:translate-x-0`이 동시 적용 시 CSS 우선순위 충돌으로 모바일 사이드바가 열리지 않음

**수정**:
```tsx
// Before (충돌 발생)
'max-md:translate-x-[-100%] max-md:w-60',
sidebarOpen && 'max-md:translate-x-0',

// After (조건부 단일 클래스, 충돌 없음)
sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
```

**모바일 상단 바 개선**:
- 기존: 작은 햄버거 아이콘 버튼 (`p-2`)
- 변경: 전체 너비 상단 바 (`fixed top-0 left-0 right-0`)
  - 햄버거 아이콘 + 현재 페이지명 + "메뉴 열기" 안내
  - 바 전체가 터치 가능 영역
- 사이드바 하단에 관리자 이름 + 로그아웃 버튼 배치

---

### 3.7 수수료 설정 통합 ★수정

**커밋**: `1d356c4`, `dd58477`

#### 저장 버튼 수정
| Before | After |
|--------|-------|
| `bg-gray-800` (비활성처럼 보임) | `bg-pink-600 hover:bg-pink-700 active:bg-pink-800` |
| 에러 핸들링 없음 | try/catch + 토스트 알림 |
| 로딩 표시 없음 | `saving` 상태 + "저장 중..." 텍스트 |

#### 전역 스토어 통합

**useStore에 추가된 항목**:
```typescript
// 상태
commissionRates: CommissionRate[];

// 액션
saveCommissionRate: (rate: Partial<CommissionRate>) => Promise<CommissionRate>;
getEffectiveRate: (source: ReservationSource, roomType: RoomType) => number;
```

**초기화 흐름**:
```typescript
// initialize()에서 수수료율도 함께 로드
const [reservations, rooms, expenses, vipGuests, commissionRates] = await Promise.all([
  fetchReservations(), fetchRooms(), fetchExpenses(),
  fetchVipGuests(), fetchCommissionRates(),
]);
```

**수수료율 적용 로직 (`getEffectiveRate`)**:
1. `commissionRates`에서 source + roomType + is_active 조건으로 검색
2. 프로모션 기간 확인: `promo_start <= today <= promo_end` → 프로모션 수수료율
3. 아니면 기본 수수료율 반환
4. 매칭 없으면 0% 반환

#### 수수료 자동 적용

**현장 예약 (WalkinModal)**:
```typescript
const commissionRate = getEffectiveRate('walkin', 'standard');
const commission = Math.round(price * commissionRate / 100);
// settlement_price = price - commission
```

**CommissionSettings 변경**:
- 기존: 로컬 state + `fetchCommissionRates()` 직접 호출
- 변경: `useStore`의 `commissionRates` 사용 + `saveCommissionRate()` 호출
- 저장 시 스토어 즉시 반영 → 다른 페이지에서도 최신 수수료율 사용

#### 일괄 재계산 기능

설정 페이지 하단 **"수수료 일괄 재계산"** 버튼:
- walkin 이외의 OTA 예약 (cancelled 제외) 대상
- 각 예약의 source + room_type으로 현재 수수료율 조회
- 기존 commission과 다르면 업데이트
- 완료 시 토스트: "N건의 예약 수수료가 업데이트되었습니다"

---

### 3.8 엑셀 업로드 위자드 (`ExcelUploader.tsx` + `excel-parser.ts`)

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
- `detectStayType()`: 투숙유형 필드 확인 → 없으면 시간차로 추정 (6시간 이하 = 대실)
- `normalizeRoomType()`: 정규식 기반 객실타입 매핑
- `extractRoomNumber()`: 다양한 형식에서 객실번호 추출

### 3.9 정산 보고서 (`SettlementReport.tsx`)

- 월 선택기로 기간 선택
- 채널별 정산 카드: 판매액, 수수료, 입금예정, 대실/숙박 건수
- 일별/주별 BarChart, 채널별 PieChart
- 정산 공식 시각화: 총판매 - 수수료 - 지출 = 순수익
- 엑셀 다운로드 기능

### 3.10 대시보드 (`Dashboard.tsx` + `DashboardCharts.tsx`)

- 요약 카드: 총매출, 총지출, 순수익, 객실가동률
- 결제수단별: 현금, 카드, OTA 정산 (수수료 표시)
- 주간 매출 차트 + 채널별 PieChart (recharts dynamic import)

### 3.11 기타 기능

| 기능 | 파일 | 설명 |
|------|------|------|
| 객실 관리 | `RoomManager.tsx` | 301~325호 그리드, 상태 변경, 메모 편집 |
| 유지보수 | `MaintenanceManager.tsx` | 로그 CRUD, 우선순위/상태 필터 |
| 지출 관리 | `ExpenseManager.tsx` | 일별 지출 등록/삭제, 카테고리 분류 |
| VIP 고객 | `CrmManager.tsx` | 고객 등록, 체크인 시 자동 알림 |
| 월간 리포트 | `MonthlyReport.tsx` | 일별 매출 차트, 일일 마감 처리 |

---

## 4. 상태관리

### useStore (`src/store/useStore.ts`)

| 영역 | 상태/액션 |
|------|----------|
| **데이터** | reservations, rooms, expenses, vipGuests, commissionRates |
| **UI** | selectedDate, selectedRoom, selectedReservation, sidebarOpen |
| **초기화** | `initialize()` - 모든 데이터 Supabase에서 병렬 로드 (5초 타임아웃) |
| **예약 CRUD** | addReservations, upsertReservation, updateReservation, deleteReservation |
| **객실 배정** | batchAssignRooms (일괄 배정) |
| **객실** | updateRoomStatus, updateRoomNotes |
| **지출** | addExpense, deleteExpense |
| **VIP** | addVipGuest, updateVipGuest |
| **수수료** | saveCommissionRate, getEffectiveRate |
| **Realtime** | _syncReservation, _removeReservation, _syncRoom, _syncExpense, _removeExpense |
| **Computed** | getDailySummary, getReservationsForDate, getReservationsForRoom |

**Supabase 연동 패턴:**
- **Optimistic Update**: UI 먼저 변경 → DB 호출 → 실패 시 롤백
- **Realtime Sync**: 헬퍼 함수로 실시간 반영
- **초기화 타임아웃**: 5초 내 응답 없으면 빈 데이터로 앱 시작

### useAuthStore (`src/store/useAuthStore.ts`) ★신규

| 상태/액션 | 설명 |
|----------|------|
| isLoggedIn | 로그인 여부 |
| adminName | 관리자 이름 |
| login(id, pw) | 검증 후 localStorage 세션 저장 |
| logout() | 세션 삭제 |
| checkSession() | 기존 세션 복원 |

---

## 5. Supabase 연동

### DB 스키마

| 마이그레이션 | 테이블 |
|-------------|--------|
| V1 (`migration.sql`) | reservations, rooms (301~325 초기 데이터), expenses, vip_guests |
| V2 (`migration_v2.sql`) | maintenance_logs, commission_rates, daily_closings |
| V3 (`migration_v3.sql`) | stay_type ENUM + 컬럼 추가 (기본값 nightly) |

### Realtime 구독 (`SupabaseProvider.tsx`)
- reservations, rooms, expenses 테이블 변경 실시간 감지
- VIP 고객 체크인 시 자동 Toast 알림

---

## 6. 페이지 라우팅 (사이드바 메뉴 순서)

| 순서 | 경로 | 메뉴명 | 아이콘 | 컴포넌트 |
|------|------|--------|--------|----------|
| 1 | `/` | 대시보드 | LayoutDashboard | Dashboard |
| 2 | `/reservations` | 예약 관리 ★ | ClipboardList | ReservationManager |
| 3 | `/timeline` | 예약 타임라인 | CalendarDays | Timeline |
| 4 | `/upload` | 엑셀 업로드 | Upload | ExcelUploader |
| 5 | `/rooms` | 객실 관리 | BedDouble | RoomManager |
| 6 | `/maintenance` | 유지보수 | Wrench | MaintenanceManager |
| 7 | `/expenses` | 지출 관리 | Receipt | ExpenseManager |
| 8 | `/crm` | 고객 관리 | Users | CrmManager |
| 9 | `/settlement` | 정산 보고서 | Calculator | SettlementReport |
| 10 | `/reports` | 월간 리포트 | BarChart3 | MonthlyReport |
| 11 | `/settings` | 설정 | Settings | CommissionSettings |
| - | (하단) | 로그아웃 | LogOut | - |

---

## 7. 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `fefa922` | Initial commit: Flamingo PMS |
| `73e9c43` | Upgrade Next.js 15.2.1 → 15.5.12 (CVE-2025-66478 보안 패치) |
| `325ef0c` | Fix build: Supabase env vars 미설정 시 빌드 오류 해결 |
| `3539bb6` | ★ 예약 관리 페이지 추가 (요약 카드, 필터, 테이블) |
| `b6560a7` | ★ 관리자 로그인 페이지 + 세션 유지 |
| `f1ec4df` | ★ 타임라인 셀 클릭 수동 예약 |
| `ce186bc` | 대실 기본 시간 4시간 → 3시간 |
| `3ec4156` | ★ 타임라인 드래그앤드롭 예약 이동 (객실/시간 변경) |
| `2b263e1` | ★ 예약 상세 모달 수정 모드 추가 |
| `7963513` | 모바일 상단 바 터치 영역 확대 |
| `35c2855` | ★ 모바일 사이드바 Tailwind 클래스 충돌 수정 |
| `1d356c4` | ★ 수수료 저장 버튼 수정 + 예약관리 날짜 필터 |
| `dd58477` | ★ 수수료율 전역 스토어 통합 + 자동 적용 + 일괄 재계산 |

---

## 8. 타입 정의 (`types/index.ts`)

### Enum 타입

| 타입 | 값 |
|------|------|
| `ReservationSource` | `yanolja` \| `yeogi` \| `walkin` |
| `ReservationStatus` | `confirmed` \| `checked_in` \| `checked_out` \| `cancelled` \| `no_show` |
| `RoomStatus` | `available` \| `occupied` \| `cleaning` \| `maintenance` \| `blocked` |
| `StayType` | `hourly` (대실) \| `nightly` (숙박) |
| `PaymentMethod` | `cash` \| `card` \| `ota_transfer` |
| `RoomType` | `standard` \| `deluxe` \| `suite` \| `family` |

### 주요 인터페이스

| 타입 | 주요 필드 |
|------|----------|
| `Reservation` | id, external_id, source, room_number, room_type, stay_type, guest_name, guest_phone, check_in, check_out, sale_price, settlement_price, commission, payment_method, status, memo |
| `Room` | room_number, room_type, floor, status, notes, last_cleaned, is_active |
| `CommissionRate` | id, source, room_type, rate_percent, promo_rate_percent, promo_start, promo_end, is_active |
| `Expense` | id, date, category, description, amount |
| `VipGuest` | id, name, phone, visit_count, preferred_room, notes, last_visit |
| `MaintenanceLog` | id, room_number, category, description, status, priority, reported_at, resolved_at, cost |

---

## 9. 성능 최적화

| 최적화 | 설명 |
|--------|------|
| Dynamic Import | recharts를 `DashboardCharts`로 분리, `dynamic(() => import(...), { ssr: false })` |
| 비차단 로딩 | Supabase 로딩 중에도 앱 UI 즉시 렌더링 |
| 초기화 타임아웃 | Supabase 5초 타임아웃, 실패 시 빈 데이터로 시작 |
| Optimistic Update | DB 응답 전 UI 먼저 반영, 실패 시 롤백 |
| useMemo | 차트 데이터, 필터링 결과 등 비용 높은 계산 캐싱 |

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

**관리자 로그인:**
- ID: `admin`
- PW: `flamingo2024`

---

## 11. 미완료 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| 아고다/에어비앤비 파서 | 미구현 | `PARSERS` 배열에 추가하면 자동 지원 |
| Supabase Auth 연동 | 미구현 | 현재 localStorage 기반 간이 인증 |
| 다중 호텔 지원 | 미구현 | 단일 호텔 기준 설계 |
| 모바일 앱 | 미구현 | 반응형 웹으로 모바일 대응 |
| 예약 삭제 기능 (UI) | 미구현 | store에 `deleteReservation` 있으나 UI 미연결 |
