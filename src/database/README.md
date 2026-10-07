# Water Fund Database

Local SQLite database for the Water Fund application.

## Architecture

### Files

- **db.ts** - Database initialization, connection management, and settings queries
- **schema.ts** - Table schemas and default values
- **queries/** - Query functions organized by domain (members, collectors, payments)
- **index.ts** - Barrel export for easy importing
- **db.test.ts** - Database integration tests

### Types

All database types are defined in `src/types/database.ts`:

- Settings
- Member
- Collector
- Payment
- PaymentAllocation
- WaterPurchase
- WaterPayment
- Handover
- MonthlyBalance
- CollectionSettlement

## Money Representation

**All money values are stored as integer minor units (fils).**

Examples:
- AED 15 = 1500 fils
- AED 6 = 600 fils
- AED 8 = 800 fils

This prevents floating-point arithmetic errors.

## Initialization

The database is automatically initialized on first app load via the `useDatabase` hook:

```tsx
import { useDatabase } from '@/hooks/use-database';

function AppRoot() {
  const { isInitialized, error } = useDatabase();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return <App />;
}
```

### What happens on first init:

1. Database file `water-fund.db` is created (or opened if exists)
2. All tables are created with proper schemas
3. Indexes are created for query performance
4. Default settings are seeded:
   - Total Canes: 8
   - Wholesale Price: AED 6 (600 fils)
   - Retail Price: AED 8 (800 fils)
   - Monthly Contribution: AED 15 (1500 fils)
5. User version is set to track schema versions

## Using the Database

### Settings

```typescript
import { getSettings, updateSettings } from '@/database';

// Get current settings
const settings = await getSettings();

// Update settings (preserves historical data for existing records)
await updateSettings({
  monthly_contribution: 2000, // New members use this, old records unchanged
});
```

### Members

```typescript
import {
  createMember,
  getMemberById,
  getActiveMembers,
  updateMember,
  deactivateMember,
} from '@/database';

// Create a member
const member = await createMember('Ahmed Hassan', '0501234567', 'Household member');

// Get active members
const members = await getActiveMembers();

// Deactivate (don't hard delete - preserves financial history)
await deactivateMember(memberId);
```

### Collectors

```typescript
import {
  createCollector,
  getCollectorById,
  getActiveCollectors,
  getCollectorBalance,
} from '@/database';

// Create a collector
const collector = await createCollector('Muhad', 'Primary collector');

// Get current balance (calculated from all transactions)
const balance = await getCollectorBalance(collectorId);
```

### Payments

```typescript
import {
  createPayment,
  getPaymentsByMember,
  updatePaymentScreenshot,
} from '@/database';

// Create a payment
const payment = await createPayment(
  memberId,
  1500, // AED 15 in fils
  '2024-10-15',
  'cash',
  collectorId,
  screenshotUri,
  'October payment'
);

// Get all payments for a member
const payments = await getPaymentsByMember(memberId);

// Update screenshot (e.g., replace with better image)
await updatePaymentScreenshot(paymentId, newScreenshotUri);
```

## Data Integrity Rules

1. **No hard deletes** - Members and collectors with financial history are deactivated, not deleted
2. **Historical immutability** - Settings changes don't affect existing transactions
3. **Foreign keys** - All references maintain referential integrity
4. **Timestamps** - Every record has `created_at` and `updated_at`
5. **Constraints** - Status values are restricted to valid options via CHECK constraints

## Testing

Run the database tests:

```bash
npm test -- src/database/db.test.ts
```

Tests verify:

- Database initialization
- Table creation
- Default settings seeding
- CRUD operations for members, collectors, payments
- Money represented as integers
- Payment allocation
- Historical data preservation

## Future Enhancements

- Payment allocation engine (in Phase 3)
- Collector balance calculations
- Monthly balance reconciliation
- Collection settlement workflow
- Water purchase and payment tracking
- Handover transactions
- Migration system for schema updates
