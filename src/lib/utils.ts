import { ReservationSource } from '@/types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

export function getSourceColor(source: ReservationSource): string {
  switch (source) {
    case 'yanolja': return 'bg-pink-500';
    case 'yeogi': return 'bg-blue-500';
    case 'walkin': return 'bg-green-500';
  }
}

export function getSourceBgColor(source: ReservationSource): string {
  switch (source) {
    case 'yanolja': return 'bg-pink-100 border-pink-300';
    case 'yeogi': return 'bg-blue-100 border-blue-300';
    case 'walkin': return 'bg-green-100 border-green-300';
  }
}

export function getSourceLabel(source: ReservationSource): string {
  switch (source) {
    case 'yanolja': return '야놀자';
    case 'yeogi': return '여기어때';
    case 'walkin': return '현장';
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: '예약확정',
    checked_in: '체크인',
    checked_out: '체크아웃',
    cancelled: '취소',
    no_show: '노쇼',
    available: '판매가능',
    occupied: '사용중',
    cleaning: '청소중',
    maintenance: '유지보수',
    blocked: '판매중지',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    confirmed: 'bg-yellow-100 text-yellow-800',
    checked_in: 'bg-green-100 text-green-800',
    checked_out: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-red-100 text-red-800',
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-blue-100 text-blue-800',
    cleaning: 'bg-yellow-100 text-yellow-800',
    maintenance: 'bg-orange-100 text-orange-800',
    blocked: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Date → "YYYY-MM-DD" (로컬 시간대 기준). toISOString은 UTC라 자정 근처엔 하루씩 밀림.
export function formatDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

export function getDaysInRange(start: string, days: number): string[] {
  const result: string[] = [];
  const d = new Date(start);
  for (let i = 0; i < days; i++) {
    result.push(formatDateKey(d));
    d.setDate(d.getDate() + 1);
  }
  return result;
}
