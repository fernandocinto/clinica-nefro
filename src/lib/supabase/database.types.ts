// Escrito à mão a partir de supabase/migrations/001..003.
// Se o schema mudar, regenerar com:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts

export type TenantRole = "superadmin" | "admin" | "copa" | "copeira";
export type Shift = "manha" | "tarde" | "noite";
export type OrderStatus =
  | "recebido"
  | "em_preparo"
  | "em_montagem"
  | "pronto"
  | "entregue"
  | "cancelado";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      tenants: Table<
        {
          id: string;
          name: string;
          subdomain: string;
          logo_url: string | null;
          primary_color: string | null;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          subdomain: string;
          logo_url?: string | null;
          primary_color?: string | null;
          created_at?: string;
        }
      >;
      tenant_users: Table<
        {
          id: string;
          tenant_id: string;
          user_id: string;
          role: TenantRole;
          created_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          user_id: string;
          role: TenantRole;
          created_at?: string;
        }
      >;
      locations: Table<
        { id: string; tenant_id: string; name: string },
        { id?: string; tenant_id: string; name: string }
      >;
      beds: Table<
        {
          id: string;
          tenant_id: string;
          location_id: string;
          label: string;
          public_token: string;
        },
        {
          id?: string;
          tenant_id: string;
          location_id: string;
          label: string;
          public_token?: string;
        }
      >;
      allergens: Table<
        { id: string; name: string },
        { id?: string; name: string }
      >;
      patients: Table<
        {
          id: string;
          tenant_id: string;
          full_name: string;
          birth_date: string;
          active: boolean;
          created_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          full_name: string;
          birth_date: string;
          active?: boolean;
          created_at?: string;
        }
      >;
      patient_allergens: Table<
        { patient_id: string; allergen_id: string },
        { patient_id: string; allergen_id: string }
      >;
      patient_occupancy: Table<
        {
          id: string;
          tenant_id: string;
          patient_id: string;
          bed_id: string;
          shift: Shift;
          occupancy_date: string;
          created_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          patient_id: string;
          bed_id: string;
          shift: Shift;
          occupancy_date: string;
          created_at?: string;
        }
      >;
      menus: Table<
        { id: string; tenant_id: string; name: string; active: boolean },
        { id?: string; tenant_id: string; name: string; active?: boolean }
      >;
      menu_availability: Table<
        {
          id: string;
          menu_id: string;
          start_date: string | null;
          end_date: string | null;
          days_of_week: number[] | null;
          start_time: string | null;
          end_time: string | null;
        },
        {
          id?: string;
          menu_id: string;
          start_date?: string | null;
          end_date?: string | null;
          days_of_week?: number[] | null;
          start_time?: string | null;
          end_time?: string | null;
        }
      >;
      menu_groups: Table<
        { id: string; menu_id: string; name: string; sort_order: number },
        { id?: string; menu_id: string; name: string; sort_order?: number }
      >;
      products: Table<
        {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          active: boolean;
        },
        {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          active?: boolean;
        }
      >;
      product_allergens: Table<
        { product_id: string; allergen_id: string },
        { product_id: string; allergen_id: string }
      >;
      menu_group_products: Table<
        { menu_group_id: string; product_id: string; sort_order: number },
        { menu_group_id: string; product_id: string; sort_order?: number }
      >;
      orders: Table<
        {
          id: string;
          tenant_id: string;
          patient_id: string;
          bed_id: string;
          status: OrderStatus;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          patient_id: string;
          bed_id: string;
          status?: OrderStatus;
          created_at?: string;
          updated_at?: string;
        }
      >;
      order_items: Table<
        {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          notes: string | null;
        },
        {
          id?: string;
          order_id: string;
          product_id: string;
          quantity?: number;
          notes?: string | null;
        }
      >;
      order_status_history: Table<
        {
          id: string;
          order_id: string;
          status: OrderStatus;
          changed_by: string | null;
          changed_at: string;
        },
        {
          id?: string;
          order_id: string;
          status: OrderStatus;
          changed_by?: string | null;
          changed_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
