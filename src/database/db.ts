import * as SQLite from 'expo-sqlite';
import { SCHEMA_VERSION, TABLES, INDEXES, DEFAULT_SETTINGS } from './schema';
import { Settings } from '@/types/database';

let database: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  try {
    database = await SQLite.openDatabaseAsync('water-fund.db');

    // Check if database is new or needs migration
    const userVersion = await getUserVersion(database);

    if (userVersion < SCHEMA_VERSION) {
      // Run migrations
      if (userVersion === 0) {
        // Initial setup
        await createTables(database);
        await seedDefaultSettings(database);
      } else if (userVersion === 1) {
        // Migration from v1 to v2: backfill payment allocations
        await migrationV1ToV2(database);
      }

      await setUserVersion(database, SCHEMA_VERSION);
    }

    return database;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function getUserVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    return result?.user_version ?? 0;
  } catch {
    return 0;
  }
}

async function setUserVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Create all tables
    await db.execAsync(`
      BEGIN TRANSACTION;

      ${Object.values(TABLES).join('\n')}

      ${INDEXES.join('\n')}

      COMMIT;
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Failed to create tables:', error);
    throw error;
  }
}

async function seedDefaultSettings(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO settings (id, total_canes, wholesale_price, retail_price, monthly_contribution, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        1,
        DEFAULT_SETTINGS.total_canes,
        DEFAULT_SETTINGS.wholesale_price,
        DEFAULT_SETTINGS.retail_price,
        DEFAULT_SETTINGS.monthly_contribution,
        now,
        now,
      ]
    );

    console.log('Default settings seeded');
  } catch (error) {
    console.error('Failed to seed default settings:', error);
    // Don't throw - settings might already exist
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    return initializeDatabase();
  }
  return database;
}

export async function getSettings(): Promise<Settings> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<Settings>(
    'SELECT * FROM settings WHERE id = 1'
  );

  if (!result) {
    throw new Error('Settings not found');
  }

  return result;
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: any[] = [];

  if (settings.total_canes !== undefined) {
    updates.push('total_canes = ?');
    values.push(settings.total_canes);
  }
  if (settings.wholesale_price !== undefined) {
    updates.push('wholesale_price = ?');
    values.push(settings.wholesale_price);
  }
  if (settings.retail_price !== undefined) {
    updates.push('retail_price = ?');
    values.push(settings.retail_price);
  }
  if (settings.monthly_contribution !== undefined) {
    updates.push('monthly_contribution = ?');
    values.push(settings.monthly_contribution);
  }

  if (updates.length === 0) {
    return;
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(1); // WHERE id = 1

  await db.runAsync(
    `UPDATE settings SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

async function migrationV1ToV2(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    console.log('Running migration v1 to v2: backfilling payment allocations');

    // Get all payments that don't have allocations yet (idempotent: skip if already allocated)
    const paymentsWithoutAllocations = await db.getAllAsync<{ id: number }>(
      `SELECT DISTINCT p.id FROM payments p
       WHERE NOT EXISTS (
         SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = p.id
       )
       ORDER BY p.payment_date`
    );

    console.log(`Found ${paymentsWithoutAllocations?.length ?? 0} payments without allocations`);

    if (!paymentsWithoutAllocations || paymentsWithoutAllocations.length === 0) {
      console.log('No payments to backfill');
      return;
    }

    // For each payment, allocate it using the allocation service
    // Note: we do this inside db initialization before closing, so we have db context
    // But we can't directly call allocatePayment here since it would be a circular import
    // Instead, we'll do the allocation logic inline

    const settings = await db.getFirstAsync<{ monthly_contribution: number }>(
      'SELECT monthly_contribution FROM settings WHERE id = 1'
    );

    const monthlyContribution = settings?.monthly_contribution ?? 0;

    for (const paymentRecord of paymentsWithoutAllocations) {
      const payment = await db.getFirstAsync<{
        id: number;
        member_id: number;
        amount: number;
        payment_date: string;
      }>(
        'SELECT id, member_id, amount, payment_date FROM payments WHERE id = ?',
        [paymentRecord.id]
      );

      if (!payment) continue;

      // Allocate payment to months (inline, same logic as allocatePayment service)
      if (monthlyContribution <= 0) {
        const month = payment.payment_date.slice(0, 7);
        const now = new Date().toISOString();
        await db.runAsync(
          `INSERT INTO payment_allocations (payment_id, month, amount, created_at)
           VALUES (?, ?, ?, ?)`,
          [payment.id, month, payment.amount, now]
        );
        console.log(`[Migration] Allocated payment ${payment.id} to ${month} (monthly_contribution=${monthlyContribution})`);
      } else {
        // Fill months in order
        let remaining = payment.amount;
        let currentMonth = payment.payment_date.slice(0, 7);
        const maxMonths = 60;

        for (let i = 0; i < maxMonths && remaining > 0; i++) {
          const allocated = await db.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(pa.amount), 0) as total FROM payment_allocations pa
             INNER JOIN payments p ON pa.payment_id = p.id
             WHERE p.member_id = ? AND pa.month = ?`,
            [payment.member_id, currentMonth]
          );

          const alreadyAllocated = allocated?.total ?? 0;
          const room = Math.max(0, monthlyContribution - alreadyAllocated);

          if (room === 0) {
            // Month is full, move to next
            currentMonth = getNextMonth(currentMonth);
            continue;
          }

          const toAllocate = Math.min(remaining, room);
          const now = new Date().toISOString();
          await db.runAsync(
            `INSERT INTO payment_allocations (payment_id, month, amount, created_at)
             VALUES (?, ?, ?, ?)`,
            [payment.id, currentMonth, toAllocate, now]
          );

          remaining -= toAllocate;

          if (remaining > 0) {
            currentMonth = getNextMonth(currentMonth);
          }
        }

        console.log(`[Migration] Allocated payment ${payment.id} across months, remaining: ${remaining}`);
      }
    }

    console.log('Migration v1 to v2 completed successfully');
  } catch (error) {
    console.error('Migration v1 to v2 failed:', error);
    throw error;
  }
}

function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.closeAsync();
    database = null;
  }
}

export async function resetDatabase(): Promise<void> {
  try {
    if (!database) {
      database = await initializeDatabase();
    }

    // Drop all tables
    const tables = [
      'payment_allocations',
      'payments',
      'water_purchases',
      'members',
      'collectors',
      'handovers',
      'settings',
    ];

    for (const table of tables) {
      await database.runAsync(`DROP TABLE IF EXISTS ${table}`);
    }

    console.log('[Reset] All tables dropped');

    // Reinitialize schema
    await createTables(database);
    await seedDefaultSettings(database);

    console.log('[Reset] Database reset successfully');
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
}
