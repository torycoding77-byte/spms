import { supabase } from './supabase';
import { MaintenanceLog, CommissionRate, DailyClosing } from '@/types';

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
