import { getDatabase } from '../db';
import { Member } from '@/types/database';

export async function getAllMembers(): Promise<Member[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Member>('SELECT * FROM members ORDER BY name');
  return result || [];
}

export async function getActiveMembers(): Promise<Member[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Member>(
    "SELECT * FROM members WHERE status = 'active' ORDER BY name"
  );
  return result || [];
}

export async function getMemberById(id: number): Promise<Member | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Member>('SELECT * FROM members WHERE id = ?', [id]);
  return result || null;
}

export async function createMember(
  name: string,
  phone?: string,
  notes?: string
): Promise<Member> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO members (name, phone, status, joined_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, phone || null, 'active', now, notes || null, now, now]
  );

  // Get the newly created member
  const member = await db.getFirstAsync<Member>(
    'SELECT * FROM members WHERE name = ?',
    [name]
  );

  if (!member) {
    throw new Error('Failed to create member');
  }

  return member;
}

export async function updateMember(
  id: number,
  updates: Partial<Omit<Member, 'id' | 'created_at'>>
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
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
  values.push(id);

  await db.runAsync(
    `UPDATE members SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deactivateMember(id: number): Promise<void> {
  await updateMember(id, { status: 'inactive' });
}

export async function activateMember(id: number): Promise<void> {
  await updateMember(id, { status: 'active' });
}
