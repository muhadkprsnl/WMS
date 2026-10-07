/**
 * Settlement Service
 *
 * Business logic for month-end collection settlement.
 * Ensures all collector money is accounted for.
 */

import {
  getCollectorBalance,
  createSettlement,
  getSettlement,
} from '@/database';

export interface SettlementData {
  waterPaymentAmount: number;
  handoverAmount: number;
  returnedAmount: number;
  otherAmount: number;
}

export interface SettlementValidationError {
  isValid: false;
  error: string;
  unaccountedAmount: number;
}

export interface SettlementValidationSuccess {
  isValid: true;
}

export type SettlementValidationResult = SettlementValidationSuccess | SettlementValidationError;

/**
 * Validate a settlement transaction
 *
 * Rules:
 * - Total accounted for must equal current holding
 * - Each amount must be >= 0
 * - Cannot settle more than current holding
 */
export async function validateSettlement(
  collectorId: number,
  settlementData: SettlementData
): Promise<SettlementValidationResult> {
  // Get current balance
  const currentHolding = await getCollectorBalance(collectorId);

  // Calculate total accounted
  const totalAccounted =
    settlementData.waterPaymentAmount +
    settlementData.handoverAmount +
    settlementData.returnedAmount +
    settlementData.otherAmount;

  // Validate amounts are non-negative
  if (settlementData.waterPaymentAmount < 0) {
    return {
      isValid: false,
      error: 'Water payment amount cannot be negative',
      unaccountedAmount: 0,
    };
  }

  if (settlementData.handoverAmount < 0) {
    return {
      isValid: false,
      error: 'Handover amount cannot be negative',
      unaccountedAmount: 0,
    };
  }

  if (settlementData.returnedAmount < 0) {
    return {
      isValid: false,
      error: 'Returned amount cannot be negative',
      unaccountedAmount: 0,
    };
  }

  if (settlementData.otherAmount < 0) {
    return {
      isValid: false,
      error: 'Other amount cannot be negative',
      unaccountedAmount: 0,
    };
  }

  // Validate total doesn't exceed current holding
  if (totalAccounted > currentHolding) {
    const aedOver = ((totalAccounted - currentHolding) / 100).toFixed(2);
    return {
      isValid: false,
      error: `Cannot settle AED ${aedOver} more than the current holding`,
      unaccountedAmount: totalAccounted - currentHolding,
    };
  }

  // Validate all money is accounted for
  if (totalAccounted < currentHolding) {
    const unaccountedAmount = currentHolding - totalAccounted;
    const aed = (unaccountedAmount / 100).toFixed(2);
    return {
      isValid: false,
      error: `AED ${aed} is still unaccounted for.`,
      unaccountedAmount,
    };
  }

  return { isValid: true };
}

/**
 * Record a settlement transaction
 *
 * Creates a settlement record and zeros out the collector's balance
 * through recorded settlement transactions
 */
export async function recordSettlement(
  collectorId: number,
  month: string,
  settlementDate: string,
  settlementData: SettlementData,
  notes?: string
) {
  const validation = await validateSettlement(collectorId, settlementData);

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  return await createSettlement(
    collectorId,
    month,
    settlementDate,
    settlementData.waterPaymentAmount,
    settlementData.handoverAmount,
    settlementData.returnedAmount,
    settlementData.otherAmount,
    notes
  );
}

/**
 * Check if a collector has already been settled for a given month
 */
export async function isCollectorSettled(
  collectorId: number,
  month: string
): Promise<boolean> {
  const settlement = await getSettlement(collectorId, month);
  return settlement !== null && settlement.status === 'settled';
}
