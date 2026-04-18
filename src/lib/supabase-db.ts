import { supabase } from './supabase';
import { Reservation, Room, Expense, VipGuest, RoomStatus } from '@/types';

// ==================== Reservations ====================

export async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('check_in', { ascending: true });

  if (error) throw error;
  // stay_type 컬럼이 DB에 없을 수 있으므로 기본값 보장
  return ((data || []) as unknown as Reservation[]).map((r) => ({
    ...r,
    stay_type: r.stay_type || 'nightly',
    reserved_at: r.reserved_at ?? r.created_at,
  }));
}

export async function fetchReservationsByDateRange(
  start: string,
  end: string
): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .lt('check_in', end)
    .gt('check_out', start)
    .neq('status', 'cancelled')
    .order('check_in');

  if (error) throw error;
  return (data || []) as unknown as Reservation[];
}

export async function upsertReservations(
  reservations: Partial<Reservation>[]
): Promise<Reservation[]> {
  const rows = reservations.map((r) => ({
    ...r,
    updated_at: new Date().toISOString(),
  }));

  let { data, error } = await supabase
    .from('reservations')
    .upsert(rows, { onConflict: 'external_id' })
    .select();

  // reserved_at/cancelled_at 컬럼이 DB에 없는 경우(migration_v4 미적용) fallback
  if (error && /reserved_at|cancelled_at|column .* does not exist/i.test(error.message)) {
    const safeRows = rows.map((r) => {
      const copy = { ...r } as Record<string, unknown>;
      delete copy.reserved_at;
      delete copy.cancelled_at;
      return copy;
    });
    const retry = await supabase
      .from('reservations')
      .upsert(safeRows, { onConflict: 'external_id' })
      .select();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return (data || []) as unknown as Reservation[];
}

export async function updateReservationDb(
  id: string,
  updates: Partial<Reservation>
): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Reservation;
}

export async function batchAssignRooms(
  assignments: { id: string; room_number: string }[]
): Promise<Reservation[]> {
  // Supabase doesn't support batch update natively, use Promise.allSettled
  const results = await Promise.allSettled(
    assignments.map(({ id, room_number }) =>
      supabase
        .from('reservations')
        .update({ room_number, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    )
  );
  const updated: Reservation[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data) {
      updated.push(result.value.data as unknown as Reservation);
    }
  }
  return updated;
}

export async function deleteReservationDb(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) throw error;
}

// ==================== Rooms ====================

export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('room_number');

  if (error) throw error;
  return (data || []) as unknown as Room[];
}

export async function updateRoomDb(
  roomNumber: string,
  updates: Partial<Room>
): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('room_number', roomNumber)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Room;
}

// ==================== Expenses ====================

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as Expense[];
}

export async function insertExpenseDb(expense: Omit<Expense, 'created_at'>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Expense;
}

export async function deleteExpenseDb(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ==================== VIP Guests ====================

export async function fetchVipGuests(): Promise<VipGuest[]> {
  const { data, error } = await supabase
    .from('vip_guests')
    .select('*')
    .order('visit_count', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as VipGuest[];
}

export async function insertVipGuestDb(guest: Omit<VipGuest, 'id'>): Promise<VipGuest> {
  const { data, error } = await supabase
    .from('vip_guests')
    .insert(guest)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as VipGuest;
}

export async function updateVipGuestDb(
  id: string,
  updates: Partial<VipGuest>
): Promise<VipGuest> {
  const { data, error } = await supabase
    .from('vip_guests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as VipGuest;
}
