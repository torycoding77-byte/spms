import { create } from 'zustand';
import { Reservation, Room, Expense, VipGuest, DailySummary, RoomStatus, CommissionRate, ReservationSource, RoomType } from '@/types';
import {
  fetchReservations, upsertReservations, updateReservationDb, deleteReservationDb,
  batchAssignRooms as batchAssignRoomsDb,
  fetchRooms, updateRoomDb,
  fetchExpenses, insertExpenseDb, deleteExpenseDb,
  fetchVipGuests, insertVipGuestDb, updateVipGuestDb,
} from '@/lib/supabase-db';
import { fetchCommissionRates, upsertCommissionRate } from '@/lib/supabase-db-v2';

interface AppState {
  // Data
  reservations: Reservation[];
  rooms: Room[];
  expenses: Expense[];
  vipGuests: VipGuest[];
  commissionRates: CommissionRate[];

  // Loading
  loading: boolean;
  error: string | null;

  // UI State
  selectedDate: string;
  selectedRoom: string | null;
  selectedReservation: Reservation | null;
  sidebarOpen: boolean;

  // Init
  initialize: () => Promise<void>;

  // UI Actions
  setSelectedDate: (date: string) => void;
  setSelectedRoom: (room: string | null) => void;
  setSelectedReservation: (reservation: Reservation | null) => void;
  setSidebarOpen: (open: boolean) => void;

  // Reservation CRUD (Supabase-backed)
  addReservations: (reservations: Partial<Reservation>[]) => Promise<void>;
  upsertReservation: (reservation: Reservation) => Promise<void>;
  updateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;

  // Batch room assignment
  batchAssignRooms: (assignments: { id: string; room_number: string }[]) => Promise<void>;

  // Room Management
  updateRoomStatus: (roomNumber: string, status: RoomStatus) => Promise<void>;
  updateRoomNotes: (roomNumber: string, notes: string) => Promise<void>;
  updateRoom: (roomNumber: string, updates: Partial<Room>) => Promise<void>;

  // Expenses
  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // VIP
  addVipGuest: (guest: VipGuest) => Promise<void>;
  updateVipGuest: (id: string, updates: Partial<VipGuest>) => Promise<void>;

  // Commission
  saveCommissionRate: (rate: Partial<CommissionRate>) => Promise<CommissionRate>;
  getEffectiveRate: (source: ReservationSource, roomType: RoomType) => number;

  // Realtime sync helpers
  _syncReservation: (reservation: Reservation) => void;
  _removeReservation: (id: string) => void;
  _syncRoom: (room: Room) => void;
  _syncExpense: (expense: Expense) => void;
  _removeExpense: (id: string) => void;

  // Computed
  getDailySummary: (date: string) => DailySummary;
  getReservationsForDate: (date: string) => Reservation[];
  getReservationsForRoom: (roomNumber: string, date: string) => Reservation[];
}

export const useStore = create<AppState>((set, get) => ({
  reservations: [],
  rooms: [],
  expenses: [],
  vipGuests: [],
  commissionRates: [],
  loading: true,
  error: null,
  selectedDate: new Date().toISOString().split('T')[0],
  selectedRoom: null,
  selectedReservation: null,
  sidebarOpen: true,

  // === Initialize: 앱 시작 시 Supabase에서 모든 데이터 로드 ===
  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const timeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);

      const [reservations, rooms, expenses, vipGuests, commissionRates] = await Promise.all([
        timeout(fetchReservations(), 5000, []),
        timeout(fetchRooms(), 5000, []),
        timeout(fetchExpenses(), 5000, []),
        timeout(fetchVipGuests(), 5000, []),
        timeout(fetchCommissionRates(), 5000, []),
      ]);
      set({ reservations, rooms, expenses, vipGuests, commissionRates, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load data',
        loading: false,
      });
    }
  },

  // === UI Actions ===
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedRoom: (room) => set({ selectedRoom: room }),
  setSelectedReservation: (reservation) => set({ selectedReservation: reservation }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // === Reservations (Supabase-backed) ===
  addReservations: async (newReservations) => {
    try {
      const saved = await upsertReservations(newReservations);
      set((state) => {
        const merged = [...state.reservations];
        for (const r of saved) {
          const idx = merged.findIndex((m) => m.external_id === r.external_id);
          if (idx !== -1) {
            merged[idx] = r;
          } else {
            merged.push(r);
          }
        }
        return { reservations: merged };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save reservations' });
      throw err; // 호출자가 실패를 인지할 수 있도록 재전파
    }
  },

  upsertReservation: async (reservation) => {
    try {
      const saved = await upsertReservations([reservation]);
      if (saved.length > 0) {
        get()._syncReservation(saved[0]);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to upsert reservation' });
    }
  },

  updateReservation: async (id, updates) => {
    // Optimistic update
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
    try {
      const saved = await updateReservationDb(id, updates);
      get()._syncReservation(saved);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update reservation' });
      try {
        const reservations = await fetchReservations();
        set({ reservations });
      } catch { /* rollback fetch failed, keep optimistic state */ }
    }
  },

  deleteReservation: async (id) => {
    const prev = get().reservations;
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
    }));
    try {
      await deleteReservationDb(id);
    } catch (err) {
      set({ reservations: prev, error: err instanceof Error ? err.message : 'Failed to delete' });
    }
  },

  // === Batch room assignment ===
  batchAssignRooms: async (assignments) => {
    // Optimistic update
    set((state) => {
      const map = new Map(assignments.map((a) => [a.id, a.room_number]));
      return {
        reservations: state.reservations.map((r) =>
          map.has(r.id) ? { ...r, room_number: map.get(r.id)! } : r
        ),
      };
    });
    try {
      const saved = await batchAssignRoomsDb(assignments);
      // Sync returned data
      for (const res of saved) {
        get()._syncReservation(res);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Batch assign failed' });
    }
  },

  // === Rooms (Supabase-backed) ===
  updateRoomStatus: async (roomNumber, status) => {
    const updates: Partial<Room> = {
      status,
      ...(status === 'available' ? { last_cleaned: new Date().toISOString() } : {}),
    };
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.room_number === roomNumber ? { ...r, ...updates } : r
      ),
    }));
    try {
      await updateRoomDb(roomNumber, updates);
      console.log(`[Store] updateRoomStatus: ${roomNumber} → ${status} DB 성공`);
    } catch (err) {
      console.error(`[Store] updateRoomStatus: ${roomNumber} → ${status} DB 실패:`, err);
      set({ error: err instanceof Error ? err.message : 'Failed to update room' });
    }
  },

  updateRoomNotes: async (roomNumber, notes) => {
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.room_number === roomNumber ? { ...r, notes } : r
      ),
    }));
    try {
      await updateRoomDb(roomNumber, { notes });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update room notes' });
    }
  },

  updateRoom: async (roomNumber, updates) => {
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.room_number === roomNumber ? { ...r, ...updates } : r
      ),
    }));
    try {
      await updateRoomDb(roomNumber, updates);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update room' });
    }
  },

  // === Expenses (Supabase-backed) ===
  addExpense: async (expense) => {
    try {
      const saved = await insertExpenseDb(expense);
      set((state) => ({ expenses: [...state.expenses, saved] }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add expense' });
    }
  },

  deleteExpense: async (id) => {
    const prev = get().expenses;
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
    try {
      await deleteExpenseDb(id);
    } catch (err) {
      set({ expenses: prev, error: err instanceof Error ? err.message : 'Failed to delete expense' });
    }
  },

  // === VIP (Supabase-backed) ===
  addVipGuest: async (guest) => {
    try {
      const saved = await insertVipGuestDb(guest);
      set((state) => ({ vipGuests: [...state.vipGuests, saved] }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add VIP guest' });
    }
  },

  updateVipGuest: async (id, updates) => {
    set((state) => ({
      vipGuests: state.vipGuests.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    }));
    try {
      await updateVipGuestDb(id, updates);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update VIP guest' });
    }
  },

  // === Commission Rates ===
  saveCommissionRate: async (rate) => {
    const saved = await upsertCommissionRate(rate);
    set((state) => ({
      commissionRates: state.commissionRates.map((r) =>
        r.id === saved.id ? saved : r
      ),
    }));
    return saved;
  },

  getEffectiveRate: (source, roomType) => {
    const { commissionRates } = get();
    const rate = commissionRates.find(
      (r) => r.source === source && r.room_type === roomType && r.is_active
    );
    if (!rate) return 0;
    // 프로모션 기간이면 프로모션 수수료율 적용
    if (rate.promo_rate_percent && rate.promo_start && rate.promo_end) {
      const now = new Date().toISOString().split('T')[0];
      if (now >= rate.promo_start && now <= rate.promo_end) {
        return rate.promo_rate_percent;
      }
    }
    return rate.rate_percent;
  },

  // === Realtime sync helpers ===
  _syncReservation: (reservation) =>
    set((state) => {
      const idx = state.reservations.findIndex((r) => r.id === reservation.id);
      if (idx !== -1) {
        const updated = [...state.reservations];
        updated[idx] = reservation;
        return { reservations: updated };
      }
      return { reservations: [...state.reservations, reservation] };
    }),

  _removeReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
    })),

  _syncRoom: (room) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.room_number === room.room_number ? room : r
      ),
    })),

  _syncExpense: (expense) =>
    set((state) => {
      const idx = state.expenses.findIndex((e) => e.id === expense.id);
      if (idx !== -1) {
        const updated = [...state.expenses];
        updated[idx] = expense;
        return { expenses: updated };
      }
      return { expenses: [...state.expenses, expense] };
    }),

  _removeExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    })),

  // === Computed ===
  getReservationsForDate: (date) => {
    const state = get();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return state.reservations.filter((r) => {
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      return checkIn < nextDay && checkOut > targetDate && r.status !== 'cancelled';
    });
  },

  getReservationsForRoom: (roomNumber, date) => {
    return get().getReservationsForDate(date).filter(
      (r) => r.room_number === roomNumber
    );
  },

  getDailySummary: (date) => {
    const state = get();
    const dayReservations = state.getReservationsForDate(date);
    const dayExpenses = state.expenses.filter((e) => e.date === date);

    const cashSales = dayReservations
      .filter((r) => r.payment_method === 'cash')
      .reduce((sum, r) => sum + r.sale_price, 0);

    const cardSales = dayReservations
      .filter((r) => r.payment_method === 'card')
      .reduce((sum, r) => sum + r.sale_price, 0);

    const otaSales = dayReservations
      .filter((r) => r.payment_method === 'ota_transfer')
      .reduce((sum, r) => sum + r.settlement_price, 0);

    const totalSales = cashSales + cardSales + otaSales;
    const totalCommission = dayReservations.reduce((sum, r) => sum + r.commission, 0);
    const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const roomCount = state.rooms.length || 25;

    return {
      date,
      total_sales: totalSales,
      cash_sales: cashSales,
      card_sales: cardSales,
      ota_sales: otaSales,
      total_commission: totalCommission,
      total_expenses: totalExpenses,
      net_profit: totalSales - totalExpenses,
      occupancy_rate: (dayReservations.length / roomCount) * 100,
      reservation_count: dayReservations.length,
    };
  },
}));
