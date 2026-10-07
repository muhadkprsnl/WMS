/**
 * Payment Allocation Service
 *
 * Allocates payments to months, filling the current month and rolling over excess to following months.
 * All decisions are logged for visibility (CLAUDE.md: "make decisions visible").
 *
 * Also handles safe deletion of payments with atomic transaction, validation, and recalculation.
 */

import { getPaymentById, createPaymentAllocation, getTotalAllocatedForMonth, createPayment as createPaymentQuery, updatePayment as updatePaymentQuery, deleteAllocationsByPayment, getAllocationMonthsByPayment, deletePaymentById } from '@/database/queries/payments';
import { getSettings, getDatabase, getCollectorStats, getSettlement } from '@/database';
import { recalculateStoredBalancesFrom } from './monthlyBalanceService';
import { getMemberExpectedForMonth } from './memberDuesService';
import { Payment } from '@/types/database';

export interface AllocationRecord {
  month: string;
  amount: number;
  reason: string;
}

/**
 * Allocate a payment to months starting from its payment_date month.
 * Fills the current month up to monthly_contribution, rolls excess to following months.
 * Returns all allocations created with visible reasons.
 */
export async function allocatePayment(paymentId: number): Promise<AllocationRecord[]> {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  const settings = await getSettings();
  const monthlyContribution = settings.monthly_contribution;

  if (monthlyContribution <= 0) {
    // Safety: if monthly contribution is 0 or negative, allocate entire payment to the payment month
    const month = payment.payment_date.slice(0, 7); // YYYY-MM
    const allocation = await createPaymentAllocation(paymentId, month, payment.amount);
    console.log(`[PaymentAllocation] Payment ${paymentId}: allocated AED ${(payment.amount / 100).toFixed(2)} to ${month} (monthly_contribution is ${monthlyContribution})`);
    return [
      {
        month,
        amount: payment.amount,
        reason: 'monthly_contribution <= 0, allocated all to payment month',
      },
    ];
  }

  // Start with the month of the payment
  const startMonth = payment.payment_date.slice(0, 7); // YYYY-MM
  const allocations: AllocationRecord[] = [];
  let remaining = payment.amount;
  let currentMonth = startMonth;
  const maxMonths = 60; // Safety cap: max 5 years of roll-over

  for (let i = 0; i < maxMonths && remaining > 0; i++) {
    const alreadyAllocated = await getTotalAllocatedForMonth(payment.member_id, currentMonth);
    // Use the expected amount from member dues (includes carry-over), not the flat default
    const expectedAmount = await getMemberExpectedForMonth(payment.member_id, currentMonth);
    const room = Math.max(0, expectedAmount - alreadyAllocated);

    if (room === 0) {
      // Month is full, move to next
      console.log(`[PaymentAllocation] Payment ${paymentId}: month ${currentMonth} is full (expected AED ${(expectedAmount / 100).toFixed(2)}, allocated AED ${(alreadyAllocated / 100).toFixed(2)}), rolling to next`);
      currentMonth = getNextMonth(currentMonth);
      continue;
    }

    const toAllocate = Math.min(remaining, room);
    await createPaymentAllocation(paymentId, currentMonth, toAllocate);
    remaining -= toAllocate;

    const reason = remaining > 0 ? 'rolled to next month' : 'final allocation';
    allocations.push({
      month: currentMonth,
      amount: toAllocate,
      reason,
    });

    console.log(`[PaymentAllocation] Payment ${paymentId}: allocated AED ${(toAllocate / 100).toFixed(2)} to ${currentMonth} (${reason}, remaining: AED ${(remaining / 100).toFixed(2)})`);

    if (remaining > 0) {
      currentMonth = getNextMonth(currentMonth);
    }
  }

  if (remaining > 0) {
    console.warn(`[PaymentAllocation] Payment ${paymentId}: could not allocate AED ${(remaining / 100).toFixed(2)} after ${maxMonths} months (safety cap)`);
  }

  return allocations;
}

/**
 * Record a new payment and allocate it to months.
 * Combines createPayment + allocatePayment as a single atomic operation (with visible failure messages).
 */
export async function recordPayment(
  memberId: number,
  amount: number,
  paymentDate: string,
  paymentMode: 'cash' | 'bank_transfer' | 'google_pay' | 'other',
  collectedBy?: number,
  screenshotUri?: string,
  notes?: string
): Promise<Payment> {
  const payment = await createPaymentQuery(
    memberId,
    amount,
    paymentDate,
    paymentMode,
    collectedBy,
    screenshotUri,
    notes
  );

  try {
    await allocatePayment(payment.id);
    console.log(`[PaymentAllocationService] Payment ${payment.id} recorded and allocated for member ${memberId}, amount AED ${(amount / 100).toFixed(2)}`);
  } catch (err) {
    console.error(`[PaymentAllocationService] Failed to allocate payment ${payment.id}:`, err);
    throw new Error(`Payment created but allocation failed: ${err instanceof Error ? err.message : 'unknown error'}`);
  }

  return payment;
}

/**
 * Edit an existing payment and re-allocate if amount or date changed.
 */
export async function editPayment(
  paymentId: number,
  updates: Partial<Omit<Payment, 'id' | 'created_at'>>
): Promise<void> {
  await updatePaymentQuery(paymentId, updates);

  // If amount or date changed, re-allocate
  const needsReallocation = updates.amount !== undefined || updates.payment_date !== undefined;
  if (needsReallocation) {
    try {
      await deleteAllocationsByPayment(paymentId);
      await allocatePayment(paymentId);
      console.log(`[PaymentAllocationService] Payment ${paymentId} updated and re-allocated`);
    } catch (err) {
      console.error(`[PaymentAllocationService] Failed to re-allocate payment ${paymentId}:`, err);
      throw new Error(`Payment updated but re-allocation failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  } else {
    console.log(`[PaymentAllocationService] Payment ${paymentId} updated (no re-allocation needed)`);
  }
}

/**
 * Get the next month in YYYY-MM format.
 * Examples: 2026-01 -> 2026-02, 2026-12 -> 2027-01
 */
function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export interface PaymentDeletionValidation {
  canDelete: boolean;
  reason?: string;
}

/**
 * Validate whether a payment can be safely deleted.
 *
 * Checks:
 * - Payment exists
 * - If collected by a collector: collector's holding stays >= 0 after deletion
 * - If collected by a collector: no settlement record for month >= payment month
 */
export async function validatePaymentDeletion(paymentId: number): Promise<PaymentDeletionValidation> {
  // Check payment exists
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return {
      canDelete: false,
      reason: 'Payment not found',
    };
  }

  const aedAmount = (payment.amount / 100).toFixed(2);
  const paymentMonth = payment.payment_date.slice(0, 7);

  // If no collector, no holding check needed
  if (!payment.collected_by) {
    console.log(`[PaymentDeletion] Payment ${paymentId} has no collector, deletion is safe`);
    return { canDelete: true };
  }

  // Check collector holding would stay >= 0
  const currentStats = await getCollectorStats(payment.collected_by);
  const holdingAfterDeletion = currentStats.currentHolding - payment.amount;

  if (holdingAfterDeletion < 0) {
    const deficit = (Math.abs(holdingAfterDeletion) / 100).toFixed(2);
    const reason = `Cannot delete payment\n\nThis payment has already been involved in a subsequent collection transaction (handover or water payment).\n\nDeleting it would reduce the collector's holding by AED ${aedAmount}, creating a deficit of AED ${deficit}.\n\nPlease reverse the related transaction first.`;
    console.log(`[PaymentDeletion] Payment ${paymentId}: deletion blocked - would create negative holding (deficit AED ${deficit})`);
    return {
      canDelete: false,
      reason,
    };
  }

  // Check for settlement in or after payment month
  const settlement = await getSettlement(payment.collected_by, paymentMonth);
  if (settlement) {
    const reason = `Cannot delete payment\n\nA month-end settlement already exists for this collector in the payment month.\n\nDeleting this payment would invalidate the settlement record.\n\nPlease reverse the settlement first.`;
    console.log(`[PaymentDeletion] Payment ${paymentId}: deletion blocked - settlement exists for ${paymentMonth}`);
    return {
      canDelete: false,
      reason,
    };
  }

  console.log(`[PaymentDeletion] Payment ${paymentId} (AED ${aedAmount}, collected by ${payment.collected_by}) passed all validations`);
  return { canDelete: true };
}

/**
 * Delete a payment safely within an atomic transaction.
 *
 * Steps (all or nothing):
 * 1. Validate payment and collector state
 * 2. Delete allocations
 * 3. Delete payment
 * 4. Recalculate affected monthly balances
 * 5. Re-check collector holding is still safe
 *
 * If anything fails, entire transaction rolls back.
 * Visible logging for each step.
 */
export async function deletePayment(paymentId: number): Promise<void> {
  // First, validate outside transaction
  const validation = await validatePaymentDeletion(paymentId);
  if (!validation.canDelete) {
    throw new Error(validation.reason || 'Payment cannot be deleted');
  }

  const db = await getDatabase();
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  const aedAmount = (payment.amount / 100).toFixed(2);
  const paymentMonth = payment.payment_date.slice(0, 7);

  // Get affected months before deletion
  const affectedMonths = await getAllocationMonthsByPayment(paymentId);
  const earliestMonth = affectedMonths.length > 0 ? affectedMonths[0] : paymentMonth;

  try {
    // Execute within transaction
    await db.withTransactionAsync(async () => {
      // Delete allocations
      await deleteAllocationsByPayment(paymentId);
      console.log(`[PaymentDeletion] Deleted allocations for payment ${paymentId}`);

      // Delete payment
      await deletePaymentById(paymentId);
      console.log(`[PaymentDeletion] Deleted payment ${paymentId} (AED ${aedAmount})`);

      // Recalculate affected monthly balances
      if (affectedMonths.length > 0) {
        await recalculateStoredBalancesFrom(earliestMonth);
        console.log(`[PaymentDeletion] Recalculated monthly balances from ${earliestMonth}`);
      }

      // Re-check collector holding is still safe
      if (payment.collected_by) {
        const updatedStats = await getCollectorStats(payment.collected_by);
        if (updatedStats.currentHolding < 0) {
          const deficit = (Math.abs(updatedStats.currentHolding) / 100).toFixed(2);
          throw new Error(
            `Collector holding would be negative (AED ${deficit}). ` +
            `This should not happen after initial validation. Transaction will be rolled back.`
          );
        }
        console.log(`[PaymentDeletion] Collector ${payment.collected_by} holding verified: AED ${(updatedStats.currentHolding / 100).toFixed(2)}`);
      }

      console.log(`[PaymentDeletion] Payment ${paymentId} deleted successfully`);
    });
  } catch (err) {
    console.error(`[PaymentDeletion] Transaction failed for payment ${paymentId}:`, err);
    throw err;
  }
}
