export const SCHEMA_VERSION = 3;

export const TABLES = {
  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_canes INTEGER NOT NULL DEFAULT 8,
      wholesale_price INTEGER NOT NULL DEFAULT 600,
      retail_price INTEGER NOT NULL DEFAULT 800,
      monthly_contribution INTEGER NOT NULL DEFAULT 1500,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,

  members: `
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      phone TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
      joined_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,

  collectors: `
    CREATE TABLE IF NOT EXISTS collectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,

  payments: `
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'bank_transfer', 'google_pay', 'other')),
      collected_by INTEGER,
      screenshot_uri TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (collected_by) REFERENCES collectors(id)
    );
  `,

  payment_allocations: `
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    );
  `,

  water_purchases: `
    CREATE TABLE IF NOT EXISTS water_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_type TEXT NOT NULL CHECK (purchase_type IN ('wholesale', 'retail')),
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      purchase_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,

  water_payments: `
    CREATE TABLE IF NOT EXISTS water_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      water_purchase_id INTEGER NOT NULL,
      collector_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (water_purchase_id) REFERENCES water_purchases(id),
      FOREIGN KEY (collector_id) REFERENCES collectors(id)
    );
  `,

  handovers: `
    CREATE TABLE IF NOT EXISTS handovers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_collector_id INTEGER NOT NULL,
      to_collector_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      handover_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (from_collector_id) REFERENCES collectors(id),
      FOREIGN KEY (to_collector_id) REFERENCES collectors(id)
    );
  `,

  monthly_balances: `
    CREATE TABLE IF NOT EXISTS monthly_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,
      opening_balance INTEGER NOT NULL,
      contributions_received INTEGER NOT NULL,
      water_expenses INTEGER NOT NULL,
      closing_balance INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,

  collection_settlements: `
    CREATE TABLE IF NOT EXISTS collection_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collector_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      settlement_date TEXT NOT NULL,
      opening_holding INTEGER NOT NULL,
      total_water_payments INTEGER NOT NULL,
      total_handovers INTEGER NOT NULL,
      total_returned INTEGER NOT NULL,
      total_other INTEGER NOT NULL,
      closing_holding INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'settled')),
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (collector_id) REFERENCES collectors(id),
      UNIQUE (collector_id, month)
    );
  `,

  member_dues: `
    CREATE TABLE IF NOT EXISTS member_dues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      carried_in INTEGER NOT NULL DEFAULT 0,
      expected INTEGER NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      remaining INTEGER NOT NULL DEFAULT 0,
      generated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id),
      UNIQUE (member_id, month)
    );
  `,
};

export const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);',
  'CREATE INDEX IF NOT EXISTS idx_payments_collected_by ON payments(collected_by);',
  'CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);',
  'CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);',
  'CREATE INDEX IF NOT EXISTS idx_payment_allocations_month ON payment_allocations(month);',
  'CREATE INDEX IF NOT EXISTS idx_water_purchases_purchase_date ON water_purchases(purchase_date);',
  'CREATE INDEX IF NOT EXISTS idx_water_payments_collector_id ON water_payments(collector_id);',
  'CREATE INDEX IF NOT EXISTS idx_water_payments_purchase_id ON water_payments(water_purchase_id);',
  'CREATE INDEX IF NOT EXISTS idx_handovers_from_collector ON handovers(from_collector_id);',
  'CREATE INDEX IF NOT EXISTS idx_handovers_to_collector ON handovers(to_collector_id);',
  'CREATE INDEX IF NOT EXISTS idx_handovers_handover_date ON handovers(handover_date);',
  'CREATE INDEX IF NOT EXISTS idx_collection_settlements_collector_id ON collection_settlements(collector_id);',
  'CREATE INDEX IF NOT EXISTS idx_collection_settlements_month ON collection_settlements(month);',
  'CREATE INDEX IF NOT EXISTS idx_member_dues_member_id_month ON member_dues(member_id, month);',
  'CREATE INDEX IF NOT EXISTS idx_member_dues_month ON member_dues(month);',
];

export const DEFAULT_SETTINGS = {
  total_canes: 8,
  wholesale_price: 600, // AED 6 = 600 fils
  retail_price: 800, // AED 8 = 800 fils
  monthly_contribution: 1500, // AED 15 = 1500 fils
};
