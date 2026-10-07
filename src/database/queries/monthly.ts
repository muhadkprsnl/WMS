import { getDatabase } from '../db';
import { MonthlyBalance } from '@/types/database';

export async function createMonthlyBalance(
  month: string,
  openingBalance: number,
  contributionsReceived: number,
  waterExpenses: number,
  closingBalance: number
): Promise<MonthlyBalance> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO monthly_balances (month, opening_balance, contributions_received, water_expenses, closing_balance, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [month, openingBalance, contributionsReceived, waterExpenses, closingBalance, now, now]
  );

  const balance = await db.getFirstAsync<MonthlyBalance>(
    'SELECT * FROM monthly_balances WHERE month = ?',
    [month]
  );

  if (!balance) {
    throw new Error('Failed to create monthly balance');
  }

  return balance;
}

export async function getMonthlyBalance(month: string): Promise<MonthlyBalance | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<MonthlyBalance>(
    'SELECT * FROM monthly_balances WHERE month = ?',
    [month]
  );
  return result || null;
}

export async function getMonthlyBalances(): Promise<MonthlyBalance[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<MonthlyBalance>(
    'SELECT * FROM monthly_balances ORDER BY month DESC'
  );
  return result || [];
}

export async function getMonthlyBalancesByYear(year: string): Promise<MonthlyBalance[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<MonthlyBalance>(
    `SELECT * FROM monthly_balances
     WHERE strftime('%Y', month || '-01') = ?
     ORDER BY month DESC`,
    [year]
  );
  return result || [];
}

export async function getPreviousMonthBalance(month: string): Promise<MonthlyBalance | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<MonthlyBalance>(
    `SELECT * FROM monthly_balances
     WHERE month < ?
     ORDER BY month DESC
     LIMIT 1`,
    [month]
  );
  return result || null;
}

export async function updateMonthlyBalance(
  month: string,
  openingBalance: number,
  contributionsReceived: number,
  waterExpenses: number,
  closingBalance: number
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE monthly_balances
     SET opening_balance = ?, contributions_received = ?, water_expenses = ?, closing_balance = ?, updated_at = ?
     WHERE month = ?`,
    [openingBalance, contributionsReceived, waterExpenses, closingBalance, now, month]
  );
}

export async function getMonthlyBalancesFrom(month: string): Promise<MonthlyBalance[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<MonthlyBalance>(
    `SELECT * FROM monthly_balances
     WHERE month >= ?
     ORDER BY month ASC`,
    [month]
  );
  return result || [];
}
