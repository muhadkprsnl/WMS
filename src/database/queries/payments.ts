import { getDatabase } from '../db';
import { Payment, PaymentAllocation } from '@/types/database';

export async function createPayment(
  memberId: number,
  amount: number,
  paymentDate: string,
  paymentMode: 'cash' | 'bank_transfer' | 'google_pay' | 'other',
  collectedBy?: number,
  screenshotUri?: string,
  notes?: string
): Promise<Payment> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Insert the payment
  await db.runAsync(
    `INSERT INTO payments (member_id, amount, payment_date, payment_mode, collected_by, screenshot_uri, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [memberId, amount, paymentDate, paymentMode, collectedBy || null, screenshotUri || null, notes || null, now, now]
  );

  // Get the newly created payment ID using last_insert_rowid
  const idResult = await db.getFirstAsync<{ id: number }>(
    'SELECT last_insert_rowid() as id'
  );

  if (!idResult?.id) {
    throw new Error('Failed to get inserted payment ID');
  }

  // Fetch the complete payment record
  const createdPayment = await db.getFirstAsync<Payment>(
    'SELECT * FROM payments WHERE id = ?',
    [idResult.id]
  );

  if (!createdPayment) {
    throw new Error('Failed to create payment');
  }

  return createdPayment;
}

export async function getPaymentsByMember(memberId: number): Promise<Payment[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Payment>(
    'SELECT * FROM payments WHERE member_id = ? ORDER BY payment_date DESC',
    [memberId]
  );
  return result || [];
}

export async function getPaymentsByMonth(month: string): Promise<Payment[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Payment>(
    `SELECT * FROM payments
     WHERE strftime('%Y-%m', payment_date) = ?
     ORDER BY payment_date DESC`,
    [month]
  );
  return result || [];
}

export async function getPaymentById(id: number): Promise<Payment | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Payment>('SELECT * FROM payments WHERE id = ?', [id]);
  return result || null;
}

export async function updatePaymentScreenshot(paymentId: number, screenshotUri: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    'UPDATE payments SET screenshot_uri = ?, updated_at = ? WHERE id = ?',
    [screenshotUri, now, paymentId]
  );
}

export async function removePaymentScreenshot(paymentId: number): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    'UPDATE payments SET screenshot_uri = NULL, updated_at = ? WHERE id = ?',
    [now, paymentId]
  );
}

export async function updatePayment(
  paymentId: number,
  updates: Partial<Omit<Payment, 'id' | 'created_at'>>
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.payment_date !== undefined) {
    fields.push('payment_date = ?');
    values.push(updates.payment_date);
  }
  if (updates.payment_mode !== undefined) {
    fields.push('payment_mode = ?');
    values.push(updates.payment_mode);
  }
  if (updates.collected_by !== undefined) {
    fields.push('collected_by = ?');
    values.push(updates.collected_by);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(paymentId);

  await db.runAsync(
    `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

// Payment allocations
export async function createPaymentAllocation(
  paymentId: number,
  month: string,
  amount: number
): Promise<PaymentAllocation> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO payment_allocations (payment_id, month, amount, created_at)
     VALUES (?, ?, ?, ?)`,
    [paymentId, month, amount, now]
  );

  // Get the newly created allocation
  const allocation = await db.getFirstAsync<PaymentAllocation>(
    'SELECT * FROM payment_allocations WHERE payment_id = ? AND month = ? ORDER BY created_at DESC LIMIT 1',
    [paymentId, month]
  );

  if (!allocation) {
    throw new Error('Failed to create payment allocation');
  }

  return allocation;
}

export async function getAllocationsByMonth(month: string): Promise<PaymentAllocation[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<PaymentAllocation>(
    'SELECT * FROM payment_allocations WHERE month = ? ORDER BY created_at',
    [month]
  );
  return result || [];
}

export async function deleteAllocationsByPayment(paymentId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM payment_allocations WHERE payment_id = ?',
    [paymentId]
  );
}

export async function getAllocationMonthsByPayment(paymentId: number): Promise<string[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<{ month: string }>(
    'SELECT DISTINCT month FROM payment_allocations WHERE payment_id = ? ORDER BY month ASC',
    [paymentId]
  );
  return (result || []).map((row) => row.month);
}

export async function deletePaymentById(paymentId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM payments WHERE id = ?',
    [paymentId]
  );
}

export async function getAllocationsByMemberAndMonth(
  memberId: number,
  month: string
): Promise<PaymentAllocation[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<PaymentAllocation>(
    `SELECT pa.* FROM payment_allocations pa
     INNER JOIN payments p ON pa.payment_id = p.id
     WHERE p.member_id = ? AND pa.month = ?
     ORDER BY pa.created_at`,
    [memberId, month]
  );
  return result || [];
}

export async function getTotalAllocatedForMonth(memberId: number, month: string): Promise<number> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(pa.amount), 0) as total FROM payment_allocations pa
     INNER JOIN payments p ON pa.payment_id = p.id
     WHERE p.member_id = ? AND pa.month = ?`,
    [memberId, month]
  );

  return result?.total ?? 0;
}

// Transaction history queries
export interface TransactionRecord {
  id: number;
  type: 'payment' | 'water_payment' | 'handover_sent' | 'handover_received';
  date: string;
  amount: number;
  collectorId: number;
  collectorName: string;
  description: string;
  notes?: string;
}

export async function getAllTransactions(limit: number = 100, offset: number = 0): Promise<TransactionRecord[]> {
  const db = await getDatabase();

  // Get payments with collector info
  const payments = await db.getAllAsync<any>(
    `SELECT p.id, 'payment' as type, p.payment_date as date, p.amount,
            COALESCE(c.id, 0) as collectorId, COALESCE(c.name, 'Not assigned') as collectorName,
            'Payment from ' || m.name || ' (' || p.payment_mode || ')' as description, p.notes
     FROM payments p
     LEFT JOIN collectors c ON p.collected_by = c.id
     INNER JOIN members m ON p.member_id = m.id
     UNION ALL
     SELECT wp.id, 'water_payment', wp.payment_date, wp.amount,
            c.id, c.name,
            'Water payment by ' || c.name as description, wp.notes
     FROM water_payments wp
     INNER JOIN collectors c ON wp.collector_id = c.id
     UNION ALL
     SELECT h.id, 'handover', h.handover_date, h.amount,
            h.from_collector_id, c1.name,
            'Handover from ' || c1.name || ' to ' || c2.name as description, h.notes
     FROM handovers h
     INNER JOIN collectors c1 ON h.from_collector_id = c1.id
     INNER JOIN collectors c2 ON h.to_collector_id = c2.id
     ORDER BY date DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return payments || [];
}

export async function getCollectorTransactions(collectorId: number): Promise<TransactionRecord[]> {
  const db = await getDatabase();

  // Get all transactions for a specific collector
  const transactions = await db.getAllAsync<any>(
    `SELECT p.id, 'payment' as type, p.payment_date as date, p.amount,
            c.id as collectorId, c.name as collectorName,
            'Payment from ' || m.name || ' (' || p.payment_mode || ')' as description, p.notes
     FROM payments p
     INNER JOIN collectors c ON p.collected_by = c.id
     INNER JOIN members m ON p.member_id = m.id
     WHERE c.id = ?
     UNION ALL
     SELECT wp.id, 'water_payment', wp.payment_date, wp.amount,
            c.id, c.name,
            'Water deduction' as description, wp.notes
     FROM water_payments wp
     INNER JOIN collectors c ON wp.collector_id = c.id
     WHERE c.id = ?
     UNION ALL
     SELECT h.id, 'handover_sent', h.handover_date, h.amount,
            h.from_collector_id, c1.name,
            'Sent to ' || c2.name as description, h.notes
     FROM handovers h
     INNER JOIN collectors c1 ON h.from_collector_id = c1.id
     INNER JOIN collectors c2 ON h.to_collector_id = c2.id
     WHERE h.from_collector_id = ?
     UNION ALL
     SELECT h.id, 'handover_received', h.handover_date, h.amount,
            h.to_collector_id, c2.name,
            'Received from ' || c1.name as description, h.notes
     FROM handovers h
     INNER JOIN collectors c1 ON h.from_collector_id = c1.id
     INNER JOIN collectors c2 ON h.to_collector_id = c2.id
     WHERE h.to_collector_id = ?
     ORDER BY date DESC`,
    [collectorId, collectorId, collectorId, collectorId]
  );

  return transactions || [];
}
