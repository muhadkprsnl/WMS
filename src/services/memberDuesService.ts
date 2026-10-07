/**
 * Member Dues Service
 *
 * Generates and manages per-member monthly dues.
 * Dues carry over from month to month based on payment status:
 * - Unpaid: full amount carries
 * - Partial: remaining amount carries
 * - Paid: nothing carries
 *
 * Carry-over only happens when Generate is clicked (not automatic).
 *
 * NOTE ON MEMBER INCLUSION:
 * All active members are included in dues generation for all months.
 * This is consistent with the payment status screen, which shows all active members for all months.
 * The joined_date field is not a real "joined on" date (it's the record-creation timestamp)
 * and is not used to filter members from dues generation.
 */

import {
  getActiveMembers,
  getSettings,
  getTotalAllocatedForMonth,
  getMemberDue,
  upsertMemberDue,
  deleteMemberDuesByMonth,
} from '@/database';
import { MemberDue } from '@/types/database';

/**
 * Get the expected amount for a member in a given month.
 *
 * Expected = monthly_contribution + carried_in from previous month's due row.
 * If the previous month has no due row (was not generated), falls back to monthly_contribution.
 *
 * @param memberId - The member ID
 * @param month - Target month (YYYY-MM)
 * @returns Expected amount in fils
 */
export async function getMemberExpectedForMonth(
  memberId: number,
  month: string
): Promise<number> {
  const settings = await getSettings();
  const monthlyContribution = settings.monthly_contribution;

  // Get previous month's due row (if it exists)
  const previousMonth = getPreviousMonth(month);
  const previousDue = await getMemberDue(memberId, previousMonth);

  if (previousDue) {
    // Carry the previous month's remaining amount
    return monthlyContribution + previousDue.remaining;
  }

  // No previous due row: fall back to the monthly contribution
  return monthlyContribution;
}

/**
 * Generate member dues for a given month.
 *
 * For each active member:
 * 1. Get the expected amount (default + carried_in from previous month)
 * 2. Get the amount actually paid (from payment_allocations)
 * 3. Calculate remaining = max(0, expected - paid)
 * 4. Upsert the due row
 *
 * Regenerating a month replaces all rows for that month.
 *
 * @param month - Target month (YYYY-MM)
 * @returns Object with generated dues, carried amounts, skipped count, and log entries
 */
export interface GeneratedDuesResult {
  dues: MemberDue[];
  duesGenerated: number;
  duesCarried: number; // Count of members with remaining > 0
  duesSkipped: number; // Count of members skipped (joined after month)
  log: string[];
}

export async function generateMemberDues(month: string): Promise<GeneratedDuesResult> {
  const settings = await getSettings();
  const monthlyContribution = settings.monthly_contribution;
  const activeMembers = await getActiveMembers();

  const dues: MemberDue[] = [];
  let duesGenerated = 0;
  let duesCarried = 0;
  let duesSkipped = 0;
  const log: string[] = [];

  // Delete any existing dues for this month (so upsert replaces them)
  await deleteMemberDuesByMonth(month);
  log.push(`[MemberDues] Cleared any existing dues for ${month}`);

  for (const member of activeMembers) {
    const memberJoinMonth = member.joined_date.slice(0, 7);

    // Note: joined_date is the record-creation timestamp, not an entered field.
    // All active members are included for all months (consistent with payment status screen).
    // If joined_date is after the month, log it as information but still include them.
    if (memberJoinMonth > month) {
      log.push(
        `[MemberDues] ${member.name} (id ${member.id}): included anyway (joined_date is the record-creation time, not an entered date)`
      );
    }

    // Get expected amount (with carry-over if applicable)
    const carried_in = await getCarriedInAmount(member.id, month);
    const expected = monthlyContribution + carried_in;

    // Get actual paid amount from allocations
    const paid = await getTotalAllocatedForMonth(member.id, month);

    // Calculate remaining (what will carry to next month)
    const remaining = Math.max(0, expected - paid);

    // Upsert the due
    const due = await upsertMemberDue(member.id, month, carried_in, expected, paid, remaining);
    dues.push(due);

    duesGenerated++;
    if (remaining > 0) {
      duesCarried++;
    }

    const expectedAed = (expected / 100).toFixed(2);
    const paidAed = (paid / 100).toFixed(2);
    const remainingAed = (remaining / 100).toFixed(2);
    const carriedAed = (carried_in / 100).toFixed(2);

    if (carried_in > 0) {
      log.push(
        `[MemberDues] ${member.name}: expected AED ${expectedAed} (AED ${carriedAed} carried), paid AED ${paidAed}, remaining AED ${remainingAed}`
      );
    } else {
      log.push(
        `[MemberDues] ${member.name}: expected AED ${expectedAed}, paid AED ${paidAed}, remaining AED ${remainingAed}`
      );
    }
  }

  return { dues, duesGenerated, duesCarried, duesSkipped, log };
}

/**
 * Get the amount carried into a month from the previous month's due row.
 *
 * @param memberId - The member ID
 * @param month - Target month (YYYY-MM)
 * @returns Carried amount in fils, or 0 if no previous due row
 */
export async function getMemberCarriedInForMonth(
  memberId: number,
  month: string
): Promise<number> {
  const previousMonth = getPreviousMonth(month);
  const previousDue = await getMemberDue(memberId, previousMonth);

  if (previousDue) {
    return previousDue.remaining;
  }

  return 0;
}

async function getCarriedInAmount(memberId: number, month: string): Promise<number> {
  return getMemberCarriedInForMonth(memberId, month);
}

/**
 * Get the previous month in YYYY-MM format.
 *
 * @param monthStr - Current month (YYYY-MM)
 * @returns Previous month (YYYY-MM)
 */
function getPreviousMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);

  if (month === 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month - 1).padStart(2, '0')}`;
}
