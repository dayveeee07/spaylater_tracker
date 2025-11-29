# SPayLater Tracker - Product Requirements Document

## 1. Overview

### 1.1 Purpose
A local-first, offline-capable web application (PWA) to track Shopee PayLater transactions, manage credit sharing with relatives, and monitor payment obligations across different billing cycles.

### 1.2 Target User
Individual managing a SPayLater account with credit shared among multiple relatives, requiring detailed tracking of purchases, payment plans, and repayments.

### 1.3 Tech Stack
- **Frontend:** React + Vite
- **Database:** Dexie.js (IndexedDB wrapper for offline storage)
- **Type:** Progressive Web App (PWA) - installable, offline-first

---

## 2. Core Concepts

### 2.1 Billing Cycle Rules
- **Billing Period:** 25th to 25th of each month
- **Statement Date:** 26th of each month
- **Due Date:** 5th of the following month
- **Example:** Purchases from Nov 25 - Dec 25 → Statement on Dec 26 → Due on Jan 5

### 2.2 Payment Plan Types
1. **BNPL (Buy Now Pay Later):** 0% interest, full payment due on next due date
2. **3-Month Installment:** 0% interest + processing fee
3. **6-Month Installment:** 0% interest + processing fee
4. **12-Month Installment:** 0% interest + processing fee

### 2.3 Installment Interest Calculation
For installment transactions, the app uses a simple user-input approach:
- User enters: Total Amount, Number of Months, Monthly Payment
- App automatically calculates: Total Interest and Interest per Month
- No need to separately input processing fees or interest charges

---

## 3. Functional Requirements

### 3.1 Transaction Management

#### 3.1.1 Add Transaction
**Required Fields:**
- Product Name (text)
- Total Amount (number, required)
- Order Date (date, default: today)
- Relative Name (text/dropdown, required)
- Payment Plan (dropdown: BNPL 0%, 3 months, 6 months, 12 months)

**Conditional Fields (for installments only):**
- Monthly Payment (number, required) → Auto-calculate total interest & interest per month

**Auto-calculated Fields:**
- Billing Cycle (based on order date)
- Due Date (based on billing cycle)
- Current Month (1/3, 2/6, etc.)
- Total Interest & Interest per Month (for installments)

#### 3.1.2 Edit Transaction
- Allow editing all transaction details
- Recalculate dependent fields automatically
- Update billing cycle if order date changes

#### 3.1.3 Delete Transaction
- Soft delete with confirmation dialog
- Remove from all calculations and summaries

---

### 3.2 Dashboard Views

#### 3.2.1 Current Billing Cycle View
**Display:**
- Current cycle dates (e.g., "Nov 25 - Dec 25, 2024")
- Next due date (e.g., "Due: Jan 5, 2025")
- Total amount due on next due date
- Breakdown by relative (name, total owed)
- Breakdown by payment plan type (BNPL total, Installments total)
- List of all transactions in current cycle

#### 3.2.2 Upcoming Statements View
- Show next billing cycle(s)
- Projected amounts due
- Scheduled installment payments

#### 3.2.3 Past Statements View
- Historical billing cycles
- Completed payments
- Paid transactions archive

---

### 3.3 Relative Management

#### 3.3.1 Relative Summary
**For each relative, display:**
- Name
- Total amount owed (sum of their unpaid transactions)
- Total amount paid (sum of received payments)
- Outstanding balance
- Number of active transactions

#### 3.3.2 Payment Tracking
**When relative pays:**
- Mark transaction as "Paid"
- Record payment date
- Record payment amount
- Optionally record payment method (cash, bank transfer, etc.)
- Support partial payments (for installment plans)

---

### 3.4 Installment Tracking

#### 3.4.1 Installment Progress
**Display for each installment transaction:**
- Current month indicator (e.g., "Month 2 of 6")
- Progress bar visualization
- Remaining payments count
- Next payment due date
- Monthly payment amount

#### 3.4.2 Installment Advancement
- Automatically advance to next month after due date passes
- Mark installments as completed when final payment is made
- Visual distinction for completed installments

---

## 4. User Interface Requirements

### 4.1 Layout Structure
```
┌─────────────────────────────────────────┐
│  Header: SPayLater Tracker              │
│  Current Cycle: Nov 25 - Dec 25, 2024   │
│  Due Date: Jan 5, 2025                  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Tabs: [Current] [Upcoming] [Past]      │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Summary Cards:                          │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │Total │ │BNPL  │ │Install│            │
│  │Due   │ │      │ │ments │            │
│  └──────┘ └──────┘ └──────┘            │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  By Relative:                            │
│  • John: ₱5,500 (3 transactions)        │
│  • Mary: ₱2,300 (1 transaction)         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Transactions List:                      │
│  [Add Transaction Button]               │
│  ┌───────────────────────────────────┐  │
│  │ Product | Amount | Relative | ... │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 4.2 Add/Edit Transaction Modal
- Clean, focused form layout
- Real-time calculation preview for installments
- Clear visual indicators for required fields
- Validation messages

### 4.3 Transaction Cards
**Each transaction displays:**
- Product name (prominent)
- Amount (large, bold)
- Relative name (with icon)
- Payment plan type (badge/tag)
- Order date
- For installments: Progress indicator (e.g., "2/6 months")
- Payment status (Paid/Unpaid)
- Action buttons: Edit, Delete, Mark as Paid

### 4.4 Responsive Design
- Desktop-first design (primary use case)
- Minimum width: 1024px recommended
- Grid/card layout for summaries
- Table layout for transaction lists

---

## 5. Data Model

### 5.1 Transaction Schema
```javascript
{
  id: number (auto-increment),
  productName: string,
  amount: number,
  orderDate: date,
  relative: string,
  paymentPlan: enum('bnpl', '3months', '6months', '12months'),
  
  // For installments only
  monthlyPayment: number (optional),
  totalInterest: number (calculated),
  interestPerMonth: number (calculated),
  currentMonth: number (1-12),
  totalMonths: number (3, 6, or 12),
  
  // Payment tracking
  isPaid: boolean,
  paymentDate: date (optional),
  paymentAmount: number (optional),
  paymentMethod: string (optional),
  
  // Billing info
  billingCycle: {
    start: date,
    end: date,
    due: date,
    label: string
  },
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 5.2 Relative Schema (Optional, for aggregation)
```javascript
{
  id: number (auto-increment),
  name: string,
  totalOwed: number (calculated),
  totalPaid: number (calculated),
  activeTransactions: number (calculated)
}
```

---

## 6. Calculations & Business Logic

### 6.1 Installment Interest Calculation
```
Given: totalAmount, monthlyPayment, totalMonths
Calculate:
  totalPaid = monthlyPayment × totalMonths
  totalInterest = totalPaid - totalAmount
  interestPerMonth = totalInterest / totalMonths
```

### 6.2 Current Cycle Total Due
```
Sum of:
  • All BNPL transactions in current cycle (full amount)
  • All installment transactions where currentMonth is due (monthly payment only)
```

### 6.3 Relative Balance Calculation
```
For each relative:
  totalOwed = Sum of unpaid transaction amounts
  totalPaid = Sum of payment amounts received
  balance = totalOwed - totalPaid
```

---

## 7. PWA Requirements

### 7.1 Offline Functionality
- All data stored locally in IndexedDB
- No network requests required
- Full CRUD operations work offline

### 7.2 Installability
- Web app manifest for "Add to Home Screen"
- App icon (512x512, 192x192)
- Standalone display mode
- Theme color and background color

### 7.3 Data Persistence
- Data persists across browser sessions
- No data loss on app close/reopen
- Export/import functionality (future consideration)

---

## 8. User Flows

### 8.1 Add New Transaction Flow
1. User clicks "Add Transaction" button
2. Modal opens with form
3. User enters product name, amount, date, relative
4. User selects payment plan
5. If installment selected:
   - User enters monthly payment amount
   - System calculates and previews total interest and interest per month
6. User clicks "Save"
7. Transaction appears in current cycle list
8. Dashboard totals update automatically

### 8.2 Mark Transaction as Paid Flow
1. User clicks "Mark as Paid" on transaction card
2. Payment modal opens
3. User enters payment date and amount
4. Optionally enters payment method
5. User clicks "Confirm Payment"
6. Transaction status updates to "Paid"
7. Relative's balance updates
8. If installment: advances to next month or marks complete

### 8.3 View Past Statement Flow
1. User clicks "Past" tab
2. System displays list of previous billing cycles
3. User clicks on specific cycle
4. System shows all transactions from that cycle
5. Displays total amount that was due
6. Shows payment status for each transaction

---

## 9. Edge Cases & Validations

### 9.1 Input Validations
- Amount must be greater than 0
- Order date cannot be in the future (optional constraint)
- Relative name cannot be empty
- Monthly payment must be greater than (amount / totalMonths) for installments

### 9.2 Edge Cases
- **Transaction spans multiple cycles:** Only count in the cycle where it was created
- **Installment payment due date passes:** Auto-advance to next month (optional: notification)
- **Partial payment on installment:** Allow marking individual months as paid
- **Edit transaction after payment:** Warn user about recalculation impacts
- **Delete transaction with payments recorded:** Cascade delete or warn user

---

## 10. Future Enhancements (Out of Scope for V1)

### 10.1 Nice-to-Have Features
- Payment reminders/notifications
- Export data to CSV/PDF
- Import transactions from Shopee app
- Multi-currency support
- Analytics dashboard (spending trends, relative comparison)
- Payment history per relative
- Backup/restore to cloud (Google Drive, Dropbox)
- Multiple SPayLater accounts
- Recurring transactions
- Notes/comments on transactions

### 10.2 Advanced Features
- Sync across devices
- Mobile app version
- Receipt image attachment
- Payment QR code generation
- Integration with banking apps
- Automated payment tracking via bank statements

---

## 11. Success Metrics

### 11.1 Primary Goals
- User can track all transactions in under 30 seconds per entry
- User can instantly see total amount due on next due date
- User can identify which relative owes how much within 5 seconds
- Zero data loss with offline usage

### 11.2 User Satisfaction Indicators
- Reduced time spent manually calculating amounts (target: 80% reduction)
- Ability to instantly answer "How much does [relative] owe me?"
- Clear visibility of installment progress
- Confidence in payment tracking accuracy

---

## 12. Development Phases

### Phase 1: Core MVP (Immediate)
- Transaction CRUD operations
- Basic dashboard with current cycle view
- Relative breakdown
- Payment plan type breakdown
- Installment calculation (both modes)
- Mark as paid functionality

### Phase 2: Enhanced Tracking (Week 2)
- Installment progress tracking
- Past statements view
- Upcoming statements view
- Edit transaction functionality
- Better UI/UX polish

### Phase 3: PWA & Polish (Week 3)
- PWA manifest and service worker
- Offline functionality testing
- Desktop installation
- Data export feature
- Comprehensive testing

---

## 13. Technical Considerations

### 13.1 Browser Compatibility
- Target: Chrome, Edge, Firefox (latest 2 versions)
- IndexedDB support required
- Service Worker support required

### 13.2 Performance
- Instant load time (local data)
- Smooth animations and transitions
- Efficient IndexedDB queries
- Pagination for large transaction lists (if >100 transactions)

### 13.3 Data Management
- Regular IndexedDB size monitoring
- Data cleanup for very old transactions (optional)
- Export before cleanup (optional)

---

## 14. Questions for Clarification

1. Should the app automatically advance installment months based on due dates, or manually by user?
2. How should partial payments for installments be handled?
3. Should relatives be pre-registered, or entered freely with each transaction?
4. Is there a credit limit to track/display?
5. Should there be warnings when approaching credit limit?
6. What timezone should be used for date calculations?
7. Should the app support multiple users (different SPayLater accounts)?

---

## Appendix A: Sample Calculations

### Example 1: BNPL Transaction
```
Product: Gaming Mouse
Amount: ₱1,500
Order Date: Dec 10, 2024
Relative: John
Payment Plan: BNPL 0%

Result:
  Billing Cycle: Nov 25 - Dec 25, 2024
  Due Date: Jan 5, 2025
  Amount Due: ₱1,500 (one-time payment)
```

### Example 2: 3-Month Installment
```
Product: Laptop
Amount: ₱30,000
Monthly Payment: ₱10,166.67
Order Date: Dec 1, 2024
Relative: Mary
Payment Plan: 3 months

Calculation:
  Total Paid: ₱10,166.67 × 3 = ₱30,500
  Total Interest: ₱30,500 - ₱30,000 = ₱500
  Interest per Month: ₱500 / 3 = ₱166.67

Billing:
  Month 1 (Due Jan 5): ₱10,166.67
  Month 2 (Due Feb 5): ₱10,166.67
  Month 3 (Due Mar 5): ₱10,166.67
```

### Example 3: 6-Month Installment
```
Product: Smartphone
Amount: ₱15,000
Monthly Payment: ₱2,600
Order Date: Nov 28, 2024
Relative: Peter
Payment Plan: 6 months

Calculation:
  Total Paid: ₱2,600 × 6 = ₱15,600
  Total Interest: ₱15,600 - ₱15,000 = ₱600
  Interest per Month: ₱600 / 6 = ₱100

Billing:
  Month 1 (Due Jan 5): ₱2,600
  Month 2 (Due Feb 5): ₱2,600
  ...continuing through June 5
```

---

**Document Version:** 1.0  
**Last Updated:** November 29, 2024  
**Status:** Ready for Development