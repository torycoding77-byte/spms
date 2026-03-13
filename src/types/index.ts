export type ReservationSource = 'yanolja' | 'yeogi' | 'walkin';
export type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'blocked';
export type PaymentMethod = 'cash' | 'card' | 'ota_transfer';
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'family';
export type StayType = 'hourly' | 'nightly'; // 대실 / 숙박

export interface Reservation {
  id: string;
  external_id: string; // OTA 예약번호
  source: ReservationSource;
  room_number: string;
  room_type: RoomType;
  stay_type: StayType;   // 대실/숙박
  guest_name: string;
  guest_phone: string;
  guest_vehicle?: string;
  check_in: string;  // ISO datetime
  check_out: string; // ISO datetime
  sale_price: number;      // 판매금액
  settlement_price: number; // 정산(입금)예정가
  commission: number;       // 수수료
  payment_method: PaymentMethod;
  status: ReservationStatus;
  memo?: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  room_number: string;
  room_type: RoomType;
  floor: number;
  status: RoomStatus;
  notes: string;        // 특이사항
  last_cleaned?: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface VipGuest {
  id: string;
  name: string;
  phone: string;
  visit_count: number;
  preferred_room?: string;
  notes: string;
  last_visit?: string;
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved';

export interface MaintenanceLog {
  id: string;
  room_number: string;
  category: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  reported_at: string;
  resolved_at?: string;
  cost: number;
}

export interface CommissionRate {
  id: string;
  source: ReservationSource;
  room_type: RoomType;
  rate_percent: number;
  promo_rate_percent?: number;
  promo_start?: string;
  promo_end?: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyClosing {
  id: string;
  date: string;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  ota_sales: number;
  total_commission: number;
  total_expenses: number;
  net_profit: number;
  occupancy_rate: number;
  reservation_count: number;
  memo?: string;
  closed_at: string;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface HousekeepingLog {
  id: string;
  room_number: string;
  cleaner_name: string;
  cleaned_at: string; // ISO datetime
  created_at: string;
}

export interface DailySummary {
  date: string;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  ota_sales: number;
  total_commission: number;
  total_expenses: number;
  net_profit: number;
  occupancy_rate: number;
  reservation_count: number;
}
