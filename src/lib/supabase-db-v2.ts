import { supabase } from './supabase';
import { MaintenanceLog, CommissionRate, DailyClosing, HousekeepingLog } from '@/types';

// ==================== Maintenance Logs ====================

export async function fetchMaintenanceLogs(): Promise<MaintenanceLog[]> {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select('*')
    .order('reported_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as MaintenanceLog[];
}

export async function insertMaintenanceLog(
  log: Omit<MaintenanceLog, 'id' | 'reported_at'>
): Promise<MaintenanceLog> {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .insert(log)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as MaintenanceLog;
}

export async function updateMaintenanceLogDb(
  id: string,
  updates: Partial<MaintenanceLog>
): Promise<MaintenanceLog> {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as MaintenanceLog;
}

// ==================== Commission Rates ====================

export async function fetchCommissionRates(): Promise<CommissionRate[]> {
  const { data, error } = await supabase
    .from('commission_rates')
    .select('*')
    .order('source');

  if (error) throw error;
  return (data || []) as unknown as CommissionRate[];
}

export async function upsertCommissionRate(
  rate: Partial<CommissionRate>
): Promise<CommissionRate> {
  const { data, error } = await supabase
    .from('commission_rates')
    .upsert(rate)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as CommissionRate;
}

// ==================== Daily Closings ====================

export async function fetchDailyClosings(
  startDate?: string,
  endDate?: string
): Promise<DailyClosing[]> {
  let query = supabase
    .from('daily_closings')
    .select('*')
    .order('date', { ascending: false });

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as DailyClosing[];
}

export async function upsertDailyClosing(
  closing: Omit<DailyClosing, 'id' | 'closed_at'>
): Promise<DailyClosing> {
  const { data, error } = await supabase
    .from('daily_closings')
    .upsert(closing, { onConflict: 'date' })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DailyClosing;
}

// ==================== Housekeeping Logs ====================

const HK_STORAGE_KEY = 'flamingo_housekeeping_logs';

function loadHkFromStorage(): HousekeepingLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HK_STORAGE_KEY);
    if (!raw || raw.trim() === '') return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 파싱 실패시 초기화
    localStorage.removeItem(HK_STORAGE_KEY);
    return [];
  }
}

function saveHkToStorage(logs: HousekeepingLog[]) {
  try {
    localStorage.setItem(HK_STORAGE_KEY, JSON.stringify(logs));
  } catch { /* storage full etc */ }
}

export async function fetchHousekeepingLogs(
  startDate?: string,
  endDate?: string
): Promise<HousekeepingLog[]> {
  // Supabase 먼저 시도
  try {
    let query = supabase
      .from('housekeeping_logs')
      .select('*')
      .order('cleaned_at', { ascending: false });

    if (startDate) query = query.gte('cleaned_at', startDate + 'T00:00:00');
    if (endDate) query = query.lte('cleaned_at', endDate + 'T23:59:59');

    const { data, error } = await query;
    if (!error && data) return data as unknown as HousekeepingLog[];
  } catch { /* fallback */ }

  // localStorage 폴백
  let logs = loadHkFromStorage();
  if (startDate) logs = logs.filter((l) => l.cleaned_at >= startDate + 'T00:00:00');
  if (endDate) logs = logs.filter((l) => l.cleaned_at <= endDate + 'T23:59:59');
  return logs.sort((a, b) => b.cleaned_at.localeCompare(a.cleaned_at));
}

export async function insertHousekeepingLog(
  log: Omit<HousekeepingLog, 'id' | 'created_at'>
): Promise<HousekeepingLog> {
  // Supabase 먼저 시도
  try {
    const { data, error } = await supabase
      .from('housekeeping_logs')
      .insert(log)
      .select()
      .single();

    if (!error && data) return data as unknown as HousekeepingLog;
  } catch { /* fallback */ }

  // localStorage 폴백
  const newLog: HousekeepingLog = {
    ...log,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const logs = loadHkFromStorage();
  logs.push(newLog);
  saveHkToStorage(logs);
  return newLog;
}

export async function deleteHousekeepingLog(id: string): Promise<void> {
  // Supabase 먼저 시도
  try {
    const { error } = await supabase
      .from('housekeeping_logs')
      .delete()
      .eq('id', id);

    if (!error) return;
  } catch { /* fallback */ }

  // localStorage 폴백
  const logs = loadHkFromStorage().filter((l) => l.id !== id);
  saveHkToStorage(logs);
}

// ==================== Room Status Update (for Housekeeping) ====================

export async function updateRoomStatusAfterCleaning(roomNumber: string): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'available', last_cleaned: now })
      .eq('room_number', roomNumber);

    if (error) {
      console.error(`[HK-DB] Room ${roomNumber} status update failed:`, error);
      return false;
    }
    console.log(`[HK-DB] Room ${roomNumber} → available 성공`);
    return true;
  } catch (err) {
    console.error(`[HK-DB] Room ${roomNumber} status update exception:`, err);
    return false;
  }
}
