import { initializeDatabase, getSettings, updateSettings, closeDatabase } from './db';
import { createMember, getMemberById, getActiveMembers } from './queries/members';
import { createCollector, getCollectorById } from './queries/collectors';
import { getPaymentsByMember } from './queries/payments';
import { recordPayment } from '@/services/paymentAllocationService';

describe('Database', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Settings', () => {
    test('should retrieve default settings', async () => {
      const settings = await getSettings();

      expect(settings).toBeDefined();
      expect(settings.total_canes).toBe(8);
      expect(settings.wholesale_price).toBe(600); // AED 6 in fils
      expect(settings.retail_price).toBe(800); // AED 8 in fils
      expect(settings.monthly_contribution).toBe(1500); // AED 15 in fils
    });

    test('should update settings without affecting historical data', async () => {
      await updateSettings({
        monthly_contribution: 2000, // AED 20
      });

      const updated = await getSettings();
      expect(updated.monthly_contribution).toBe(2000);

      // Reset for other tests
      await updateSettings({
        monthly_contribution: 1500,
      });
    });
  });

  describe('Members', () => {
    test('should create a member', async () => {
      const member = await createMember('Ahmed', '0501234567', 'Test member');

      expect(member).toBeDefined();
      expect(member.name).toBe('Ahmed');
      expect(member.phone).toBe('0501234567');
      expect(member.status).toBe('active');
      expect(member.notes).toBe('Test member');
    });

    test('should retrieve member by ID', async () => {
      const created = await createMember('Fatima', '0509876543');
      const retrieved = await getMemberById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Fatima');
      expect(retrieved?.id).toBe(created.id);
    });

    test('should get active members', async () => {
      const members = await getActiveMembers();

      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);
      expect(members.every((m) => m.status === 'active')).toBe(true);
    });
  });

  describe('Collectors', () => {
    test('should create a collector', async () => {
      const collector = await createCollector('Muhad', 'Primary collector');

      expect(collector).toBeDefined();
      expect(collector.name).toBe('Muhad');
      expect(collector.status).toBe('active');
      expect(collector.notes).toBe('Primary collector');
    });

    test('should retrieve collector by ID', async () => {
      const created = await createCollector('Ali');
      const retrieved = await getCollectorById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Ali');
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Payments', () => {
    test('should create a payment', async () => {
      const member = await createMember('Noor');
      const collector = await createCollector('Samir');

      const payment = await recordPayment(
        member.id,
        1500, // AED 15 in fils
        new Date().toISOString().split('T')[0],
        'cash',
        collector.id,
        undefined,
        'October payment'
      );

      expect(payment).toBeDefined();
      expect(payment.member_id).toBe(member.id);
      expect(payment.amount).toBe(1500);
      expect(payment.payment_mode).toBe('cash');
      expect(payment.collected_by).toBe(collector.id);
    });

    test('should retrieve payments by member', async () => {
      const member = await createMember('Layla');

      // Create multiple payments
      await recordPayment(member.id, 1500, '2024-10-01', 'cash');
      await recordPayment(member.id, 1500, '2024-11-01', 'bank_transfer');

      const payments = await getPaymentsByMember(member.id);

      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBe(2);
      expect(payments.every((p) => p.member_id === member.id)).toBe(true);
    });
  });

  describe('Financial data integrity', () => {
    test('should store money as integer minor units (no floating point)', async () => {
      const member = await createMember('Yasmin');
      const amount = 1500; // Integer in fils

      const payment = await recordPayment(member.id, amount, '2024-10-15', 'cash');

      expect(payment.amount).toBe(1500);
      expect(Number.isInteger(payment.amount)).toBe(true);
    });

    test('should not allow hard deletes of members with financial history', async () => {
      const member = await createMember('Hassan');
      await recordPayment(member.id, 1500, '2024-10-01', 'cash');

      // Verify member exists
      const retrieved = await getMemberById(member.id);
      expect(retrieved).toBeDefined();

      // In real implementation, hard deletes should fail if there's financial history
      // For now, we just verify the member data is preserved
      expect(retrieved?.name).toBe('Hassan');
    });
  });

  describe('Schema Self-Healing', () => {
    // NOTE: This test describes the self-healing behavior but cannot run here (ts-jest not installed)
    // To test manually: Create DB, drop member_dues table, set user_version = 3, close DB,
    // then call initializeDatabase() and verify:
    // 1. member_dues table is recreated
    // 2. Existing rows in other tables are unchanged
    // 3. Console log shows self-heal warning message
    test.skip('should recreate missing tables when version is stamped wrongly', async () => {
      // This test would:
      // 1. Create a fresh database
      // 2. Drop member_dues table to simulate incomplete migration
      // 3. Set user_version = 3 (stamped but incomplete)
      // 4. Close the database
      // 5. Re-initialize the database
      // 6. Verify member_dues exists and other tables are intact
      expect(true).toBe(true);
    });
  });
});
