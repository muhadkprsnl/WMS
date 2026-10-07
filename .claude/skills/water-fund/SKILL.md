# Water Fund Development Skill

## Purpose

You are building **Water Fund**, a small offline-first Android mobile application for managing a household water fund.

The application must be simple, reliable, modern, and easy to use.

The application tracks:

* Household members
* Monthly contributions
* Late payments
* Partial payments
* Advance payments
* Water purchases
* Water expenses
* Collectors
* Money currently held by collectors
* Money handovers
* Water payments made from collector-held money
* Month-end collection settlement
* Monthly opening and closing balances
* Payment screenshots
* Shareable dashboard summaries
* Shareable member payment status

---

# 1. Non-Negotiable Architecture

The application is local-only.

Use:

* Expo
* React Native
* TypeScript
* Expo Router
* SQLite
* React Hook Form
* Zod
* Material Design inspired components
* Lucide icons

Do NOT introduce:

* FastAPI
* PostgreSQL
* Redis
* Docker
* Cloud backend
* Authentication
* Remote API
* Cloud synchronization

The application must work without internet access.

Before installing packages, inspect the existing Expo SDK and package versions and use compatible versions.

Never blindly upgrade Expo or React Native.

---

# 2. Product Philosophy

Keep the application small and practical.

Do not over-engineer.

Do not create features that were not requested.

Every financial transaction must have a clear historical record.

Never silently delete financial information.

Business logic must be separated from UI components.

---

# 3. Water Canes

Default total canes:

8

The total number of canes is configurable in Settings.

Do NOT track individual canes.

Do NOT create:

* Cane IDs
* Individual cane status
* Full/empty cane tracking
* Cane location
* Automatic empty-cane detection

The user manually records the number of canes replaced.

---

# 4. Water Pricing

Default prices:

Wholesale: AED 6 per cane

Retail: AED 8 per cane

Both prices are configurable in Settings.

When recording a purchase:

User selects:

* Wholesale or Retail
* Quantity
* Date
* Optional notes

The application calculates:

Quantity × configured unit price

The user must not manually enter the unit price.

When a purchase is created, store the actual unit price used in that transaction.

Changing Settings later must not modify historical purchases.

---

# 5. Monthly Contribution

Default contribution:

AED 15 per active member per month.

The amount is configurable in Settings.

Historical monthly contribution values must never change when the Settings value changes.

Example:

September contribution = AED 15

Later Settings changes to AED 20.

September must remain AED 15.

October can use AED 20.

---

# 6. Members

Members represent people who are expected to contribute.

Member fields should include:

* id
* name
* optional phone
* status
* joined date
* optional notes
* created_at
* updated_at

Member status:

* Active
* Inactive

Do not hard-delete members with financial history.

Deactivate them instead.

Only active members should normally be included in current monthly contribution expectations.

---

# 7. Collectors

Collectors are separate from members.

A person can be:

* Member + Collector
* Collector only

Collector fields:

* id
* name
* status
* notes
* created_at
* updated_at

Collector status:

* Active
* Inactive

The application must calculate the current amount of money held by each collector.

Example:

Muhad:

Collected = AED 45

Water Paid = AED 20

Handed Over = AED 10

Received = AED 0

Current Holding = AED 15

---

# 8. Payments

A payment represents actual money received from a member.

Payment fields:

* id
* member_id
* amount
* payment_date
* payment_mode
* collected_by
* screenshot_uri
* notes
* created_at
* updated_at

Payment modes:

* Cash
* Bank Transfer
* Google Pay
* Other

Payment form:

* Member
* Amount
* Payment Date
* Payment Mode
* Collected By
* Screenshot
* Notes

Amount should default to the configured monthly contribution but remain editable.

Payment date defaults to today but can be changed.

---

# 9. Payment Screenshot

Payment screenshot is optional.

It must:

* Be attached to the specific payment
* Be previewable
* Be replaceable
* Be removable
* Be stored locally
* Never be uploaded to a server

Use local file URI storage where appropriate.

Handle missing files gracefully.

---

# 10. Payment Status

Support:

* Pending
* Paid
* Partially Paid

Advance payment should be represented through monthly allocations rather than creating a completely separate fundamental payment status.

---

# 11. Payment and Allocation Must Be Separate

This is one of the most important architectural rules.

A `payment` represents actual money.

Example:

Ahmed pays AED 30 on October 3.

The payment record is:

AED 30

A separate `payment_allocations` table determines how that AED 30 is applied.

Example:

September = AED 15

October = AED 15

Never combine the payment transaction and monthly allocation into one record.

---

# 12. Payment Allocation Rule

Always apply money to the oldest outstanding month first.

This rule is mandatory.

Example:

September outstanding = AED 15

October outstanding = AED 15

Member pays AED 20.

Allocation:

September = AED 15

October = AED 5

October remaining = AED 10

If previous months are completely paid, remaining money is applied to future months.

---

# 13. Advance Payments

Example:

Monthly contribution = AED 15.

Member pays AED 45.

Allocation:

Current month = AED 15

Next month = AED 15

Following month = AED 15

AED 40:

Current month = AED 15

Next month = AED 15

Following month = AED 10

The future month can therefore be partially paid.

---

# 14. Multiple Payments

Do not merge multiple payment transactions.

Example:

October 3 = AED 10

October 10 = AED 5

Keep both payment records.

The allocation engine determines the combined monthly status.

---

# 15. Monthly Balance

Monthly financial formula:

Opening Balance

* Contributions Received

- Water Expenses
  = Closing Balance

Closing balance can be positive or negative.

Next month's opening balance must use the previous month's closing balance.

Historical monthly records must remain unchanged.

---

# 16. Water Purchases

Water purchase fields:

* id
* purchase_type
* quantity
* unit_price
* total_amount
* purchase_date
* notes
* created_at
* updated_at

Purchase type:

* Wholesale
* Retail

Water purchase amount:

quantity × unit_price

The original unit price must be stored with the purchase.

---

# 17. Water Payments

A water purchase and the money used to pay for it are related but separate concepts.

Create a `water_payments` record.

It should contain:

* id
* water_purchase_id
* collector_id
* amount
* payment_date
* notes
* created_at

Example:

Collector holds AED 50.

Water purchase costs AED 30.

Collector pays AED 30.

Collector holding becomes AED 20.

The water payment must be linked to the specific water purchase.

Do not count the same payment twice.

---

# 18. Collector Balance

Collector current balance must be derived from transactions.

Conceptually:

Money Collected

* Money Received Through Handovers

- Money Given Through Handovers
- Water Payments
- Settled/cleared money
  = Current Holding

Do not manually edit a collector's balance.

Balances should be calculated from transaction history.

---

# 19. Money Handover

Collectors can transfer money between each other.

Handover fields:

* id
* from_collector_id
* to_collector_id
* amount
* handover_date
* notes
* created_at

Example:

Muhad = AED 45

Ali = AED 30

Muhad hands Ali AED 20.

After transaction:

Muhad = AED 25

Ali = AED 50

Total money remains unchanged.

---

# 20. Month-End Settlement

At month end, a collector's remaining money can be settled/cleared.

Example:

Muhad currently holds AED 45.

The user chooses:

Settle Month

The system must NOT simply set the database balance to zero.

It must record how the AED 45 was accounted for.

Possible settlement methods:

* Handed to another collector
* Used for water payment
* Returned / deposited
* Other

Example:

AED 30 → Water payment

AED 15 → Handover to Ali

Total accounted = AED 45

Muhad current holding = AED 0.

---

# 21. Settlement Record

Create a `collection_settlements` table.

It should preserve:

* collector
* month
* settlement date
* opening holding
* total water payments
* total handovers
* total returned/deposited
* total other
* closing holding
* status
* notes

Settlement status:

* Open
* Settled

Historical settlements must remain available.

---

# 22. Settlement Integrity

Money must never disappear silently.

If collector holding is:

AED 45

The settlement must account for:

AED 45

For example:

Water payment = AED 30

Handover = AED 15

Total = AED 45

Do not allow the settlement to close if money remains unaccounted for unless the user explicitly selects a supported method such as "Other".

---

# 23. Water Payment Validation

A collector cannot pay more than their current available holding.

Example:

Collector holding = AED 20.

Water purchase = AED 30.

The collector cannot pay AED 30 from their current holding.

Show a clear validation message.

---

# 24. Navigation

Bottom tabs:

* Home
* Members
* Water
* More

More contains:

* Collection
* History
* Settings

Use stack navigation for secondary screens.

---

# 25. Dashboard

Home should show:

* Current month
* Current balance
* Expected contributions
* Collected contributions
* Paid member count
* Pending member count
* Water expenses
* Canes replaced
* Money currently held
* Recent payments
* Recent water purchases
* Recent handovers
* Recent water payments

Primary action:

Share Summary

---

# 26. Members Page

Show:

Current month

Paid count / total members

Collected / expected

Example:

4 / 5 Paid

AED 60 / AED 75

Each member should show:

* Paid
* Pending
* Partially Paid
* Advance coverage

Include:

Share Payment Status

---

# 27. Member Detail

Show:

* Current month expected
* Paid
* Remaining
* Status
* Payment date
* Payment mode
* Collected by
* Screenshot
* Payment history
* Monthly allocation history

---

# 28. Collection Page

Show:

Total collected

Total currently held

Total water payments

Total handovers

Then show each collector.

Example:

Muhad

Collected: AED 75

Water Paid: AED 30

Handed Over: AED 20

Received: AED 10

Current Holding: AED 35

Actions:

* Handover
* Settle Month

---

# 29. Dashboard Sharing

Create a generated image for dashboard sharing.

It should contain:

Water Fund

Month

Opening Balance

Contributions

Water Expenses

Closing Balance

Members Paid

Canes Replaced

Money Currently Held

Use Android native sharing.

Do not build a WhatsApp API.

The user should be able to share the image through WhatsApp and other installed applications.

---

# 30. Member Payment Sharing

Create a generated image containing:

Water Fund

Month

Member payment statuses

Expected amount

Collected amount

Paid count

Pending count

Share through the Android native share sheet.

---

# 31. Payment Screenshot vs Share Image

These are different.

Payment screenshot:

A proof image attached to an individual payment.

Share image:

A generated summary image created for sharing.

Never mix them.

---

# 32. Settings

Settings must include:

Water:

* Total Canes
* Wholesale Price
* Retail Price

Contribution:

* Monthly Contribution

Collectors:

* Add Collector
* Edit Collector
* Deactivate Collector

Defaults:

Total Canes = 8

Wholesale = AED 6

Retail = AED 8

Monthly Contribution = AED 15

---

# 33. History

History must include:

* Payments
* Water Purchases
* Water Payments
* Handovers
* Settlements

Financial transactions must remain historically visible.

---

# 34. UI/UX

Use a modern Android design.

Requirements:

* Material Design inspired
* Rounded cards
* Clear headers
* Consistent spacing
* Modern icons
* Touch-friendly controls
* Subtle elevation
* Smooth transitions
* Light mode
* Dark mode
* Responsive layout
* Safe-area support
* Keyboard-aware forms

Do not make a desktop dashboard and squeeze it onto mobile.

Optimize for the Motorola Edge 50 Pro while remaining responsive.

---

# 35. Application States

Every screen must handle:

Loading

Empty

Error

Success

Validation

Use:

* Skeleton loaders
* Progress indicators
* Snackbars/toasts
* Retry actions
* Meaningful empty states

---

# 36. Form Rules

Forms must include:

* Validation
* Inline validation errors
* Disabled submit when invalid
* Loading state
* Success feedback
* Error feedback
* Keyboard-aware behavior
* Keyboard dismissal
* Accessible touch targets

---

# 37. Business Logic Separation

Do not put financial calculations directly into screen components.

Create services such as:

* paymentAllocationService
* monthlyBalanceService
* collectionService
* handoverService
* waterPaymentService
* settlementService

React components should call these services.

---

# 38. Database Tables

Minimum expected tables:

members

collectors

payments

payment_allocations

water_purchases

water_payments

handovers

monthly_balances

collection_settlements

settings

Use foreign keys.

Use database migrations/versioning.

---

# 39. Money Representation

Prefer storing money internally as integer minor units.

Example:

AED 15 = 1500 fils.

Do not use unreliable floating-point arithmetic for financial calculations.

---

# 40. Testing

Before building complex UI, test the payment allocation engine.

Required tests:

1. AED 15 current month
2. AED 30 two months
3. AED 45 three months
4. AED 10 partial
5. Previous month AED 15 outstanding + current month, payment AED 20
6. Previous + current unpaid, payment AED 30
7. AED 40 creating future partial payment
8. Multiple payments
9. Advance payment
10. Late payment

Also test:

* Collector collection
* Collector handover
* Water payment
* Insufficient collector balance
* Month-end settlement
* Settlement history
* Closing balance carry-forward

---

# 41. Development Workflow

Always follow:

Inspect
↓
Plan
↓
Implement
↓
Type check
↓
Run tests
↓
Fix errors
↓
Verify on Expo Go
↓
Continue

Do not implement the whole application in one step.

---

# 42. Implementation Order

Build in this exact order:

1. Project inspection
2. Expo foundation
3. Theme
4. Reusable UI components
5. Navigation
6. SQLite
7. Settings
8. Members
9. Collectors
10. Payment data model
11. Payment allocation engine
12. Allocation tests
13. Payment UI
14. Payment screenshots
15. Water purchases
16. Water payments
17. Collection dashboard
18. Handovers
19. Month-end settlements
20. Monthly balances
21. Main dashboard
22. Dashboard sharing
23. Member status sharing
24. History
25. Loading/error/empty states
26. UX polish
27. Full testing
28. Expo Go testing
29. Android build

---

# 43. Claude Rules

Before modifying anything:

1. Inspect existing code.
2. Understand existing architecture.
3. Do not unnecessarily rewrite working code.
4. Check package compatibility.
5. Implement only the requested phase.
6. Keep business logic testable.
7. Run TypeScript checks.
8. Run tests.
9. Fix errors.
10. Explain what changed.
11. Explain what should be tested manually.
12. Wait for the next phase before implementing unrelated features.

Never invent requirements.

If a requirement is ambiguous, ask before implementing it.

---

# 44. Definition of Done

The application is complete when:

* Members work
* Collectors work
* Monthly contributions work
* Normal payments work
* Late payments work
* Partial payments work
* Advance payments work
* Oldest outstanding month is paid first
* Payment allocations are preserved
* Screenshots work
* Water purchases work
* Wholesale/retail pricing works
* Historical prices remain unchanged
* Collector balances are correct
* Handovers work
* Water payments from collector money work
* Month-end settlement works
* Settlement history works
* Monthly balances work
* Carry-forward works
* Dashboard works
* Dashboard sharing works
* Member payment sharing works
* History works
* Offline operation works
* Expo Go works
* Android UI is polished
* Automated business logic tests pass

---

# 45. Core Principle

At any time the system must clearly answer:

1. How much money should have been collected?
2. How much money has actually been collected?
3. Who currently holds the money?
4. How much has been spent on water?
5. How much water was purchased?
6. Which member payments are outstanding?
7. Which months are paid in advance?
8. Has the collector's month-end money been settled?

Every financial movement must have a traceable transaction.
