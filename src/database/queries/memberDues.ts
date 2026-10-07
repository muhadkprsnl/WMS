import { getDatabase } from '../db';
import { MemberDue } from '@/types/database';

export async function upsertMemberDue(
  memberId: number,
  month: string,
  carriedIn: number,
  expected: number,
  paid: number,
  remaining: number
): Promise<MemberDue> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Check if the row already exists
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM member_dues WHERE member_id = ? AND month = ?',
    [memberId, month]
  );

  if (existing) {
    // Update existing row
    await db.runAsync(
      `UPDATE member_dues
       SET carried_in = ?, expected = ?, paid = ?, remaining = ?, updated_at = ?
       WHERE member_id = ? AND month = ?`,
      [carriedIn, expected, paid, remaining, now, memberId, month]
    );
  } else {
    // Insert new row
    await db.runAsync(
      `INSERT INTO member_dues (member_id, month, carried_in, expected, paid, remaining, generated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [memberId, month, carriedIn, expected, paid, remaining, now, now, now]
    );
  }

  // Re-select the row to return
  const due = await db.getFirstAsync<MemberDue>(
    'SELECT * FROM member_dues WHERE member_id = ? AND month = ?',
    [memberId, month]
  );

  if (!due) {
    throw new Error(`Failed to upsert member due for member ${memberId}, month ${month}`);
  }

  return due;
}

export async function getMemberDue(
  memberId: number,
  month: string
): Promise<MemberDue | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<MemberDue>(
    'SELECT * FROM member_dues WHERE member_id = ? AND month = ?',
    [memberId, month]
  );
  return result || null;
}

export async function getMemberDuesByMonth(month: string): Promise<MemberDue[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<MemberDue>(
    'SELECT * FROM member_dues WHERE month = ? ORDER BY member_id',
    [month]
  );
  return result || [];
}

export async function deleteMemberDuesByMonth(month: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM member_dues WHERE month = ?', [month]);
}
