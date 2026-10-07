// All money values are stored as integer minor units (e.g., AED 15 = 1500 fils)

export interface Settings {
  id: number;
  total_canes: number;
  wholesale_price: number; // in fils
  retail_price: number; // in fils
  monthly_contribution: number; // in fils
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: number;
  name: string;
  phone?: string;
  status: 'active' | 'inactive';
  joined_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Collector {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  member_id: number;
  amount: number; // in fils
  payment_date: string;
  payment_mode: 'cash' | 'bank_transfer' | 'google_pay' | 'other';
  collected_by?: number; // collector_id
  screenshot_uri?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: number;
  payment_id: number;
  month: string; // YYYY-MM format
  amount: number; // in fils
  created_at: string;
}

export interface WaterPurchase {
  id: number;
  purchase_type: 'wholesale' | 'retail';
  quantity: number;
  unit_price: number; // in fils - stored at time of purchase
  total_amount: number; // in fils
  purchase_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WaterPayment {
  id: number;
  water_purchase_id: number;
  collector_id: number;
  amount: number; // in fils
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface Handover {
  id: number;
  from_collector_id: number;
  to_collector_id: number;
  amount: number; // in fils
  handover_date: string;
  notes?: string;
  created_at: string;
}

export interface MonthlyBalance {
  id: number;
  month: string; // YYYY-MM format
  opening_balance: number; // in fils
  contributions_received: number; // in fils
  water_expenses: number; // in fils
  closing_balance: number; // in fils
  created_at: string;
  updated_at: string;
}

export interface CollectionSettlement {
  id: number;
  collector_id: number;
  month: string; // YYYY-MM format
  settlement_date: string;
  opening_holding: number; // in fils
  total_water_payments: number; // in fils
  total_handovers: number; // in fils
  total_returned: number; // in fils
  total_other: number; // in fils
  closing_holding: number; // in fils
  status: 'open' | 'settled';
  notes?: string;
  created_at: string;
}

export interface MemberDue {
  id: number;
  member_id: number;
  month: string; // YYYY-MM format
  carried_in: number; // in fils, amount carried from previous month
  expected: number; // in fils, default + carried_in
  paid: number; // in fils, actual amount paid (from allocations)
  remaining: number; // in fils, amount that will carry to next month
  generated_at: string; // timestamp when the due was generated
  created_at: string;
  updated_at: string;
}
