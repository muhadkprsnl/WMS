/**
 * Collection Service
 *
 * Business logic for:
 * - Collector balance calculations
 * - Money handovers between collectors
 */

import {
  createHandover,
  getTotalWaterPaymentForPurchase,
  getCollectorBalance,
  getWaterPurchaseById,
} from '@/database';

export interface HandoverValidationError {
  isValid: false;
  error: string;
}

export interface HandoverValidationSuccess {
  isValid: true;
}

export type HandoverValidationResult = HandoverValidationSuccess | HandoverValidationError;

/**
 * Validate a handover transaction
 *
 * Rules:
 * - Sender and receiver cannot be the same
 * - Amount must be greater than 0
 * - Sender must have sufficient balance
 */
export async function validateHandover(
  fromCollectorId: number,
  toCollectorId: number,
  amount: number
): Promise<HandoverValidationResult> {
  // Validate same collector
  if (fromCollectorId === toCollectorId) {
    return {
      isValid: false,
      error: 'A collector cannot hand over money to themselves',
    };
  }

  // Validate amount
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than zero',
    };
  }

  // Validate sender balance
  const balance = await getCollectorBalance(fromCollectorId);
  if (balance < amount) {
    const aed = (balance / 100).toFixed(2);
    return {
      isValid: false,
      error: `Insufficient balance. This collector currently holds AED ${aed}`,
    };
  }

  return { isValid: true };
}

/**
 * Create a handover transaction
 *
 * Transfers money from one collector to another
 * Money is immediately reflected in both collectors' balances
 */
export async function recordHandover(
  fromCollectorId: number,
  toCollectorId: number,
  amount: number,
  handoverDate: string,
  notes?: string
) {
  const validation = await validateHandover(fromCollectorId, toCollectorId, amount);

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  return await createHandover(fromCollectorId, toCollectorId, amount, handoverDate, notes);
}


/**
 * Get water purchase payment status
 */
export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';

export async function getWaterPurchasePaymentStatus(waterPurchaseId: number): Promise<PaymentStatus> {
  const waterPurchase = await getWaterPurchaseById(waterPurchaseId);
  if (!waterPurchase) {
    throw new Error('Water purchase not found');
  }

  const totalPaid = await getTotalWaterPaymentForPurchase(waterPurchaseId);

  if (totalPaid === 0) {
    return 'Unpaid';
  }

  if (totalPaid >= waterPurchase.total_amount) {
    return 'Paid';
  }

  return 'Partially Paid';
}
