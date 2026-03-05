export type Database = {
  public: {
    Tables: {
      reservations: {
        Row: {
          id: string;
          external_id: string;
          source: string;
          room_number: string;
          room_type: string;
          guest_name: string;
          guest_phone: string;
          guest_vehicle: string | null;
          check_in: string;
          check_out: string;
          sale_price: number;
          settlement_price: number;
          commission: number;
          payment_method: string;
          status: string;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id: string;
          source: string;
          room_number: string;
          room_type?: string;
          guest_name: string;
          guest_phone?: string;
          guest_vehicle?: string | null;
          check_in: string;
          check_out: string;
          sale_price: number;
          settlement_price?: number;
          commission?: number;
          payment_method?: string;
          status?: string;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>;
      };
      rooms: {
        Row: {
          room_number: string;
          room_type: string;
          floor: number;
          status: string;
          notes: string;
          last_cleaned: string | null;
          is_active: boolean;
        };
        Insert: {
          room_number: string;
          room_type?: string;
          floor?: number;
          status?: string;
          notes?: string;
          last_cleaned?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
      };
      expenses: {
        Row: {
          id: string;
          date: string;
          category: string;
          description: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          category: string;
          description: string;
          amount: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      vip_guests: {
        Row: {
          id: string;
          name: string;
          phone: string;
          visit_count: number;
          preferred_room: string | null;
          notes: string;
          last_visit: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string;
          visit_count?: number;
          preferred_room?: string | null;
          notes?: string;
          last_visit?: string | null;
        };
        Update: Partial<Database['public']['Tables']['vip_guests']['Insert']>;
      };
    };
  };
};
