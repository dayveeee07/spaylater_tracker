import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Squares2X2Icon, CreditCardIcon, UsersIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';
import { useSwipeable } from 'react-swipeable';
import { setupDatabase, useBorrowers, usePayments, useTransactions } from './lib/transactions';
import { getBillingCycle } from './lib/billingCycle';
import { paymentPlans, PAYMENT_PLAN_MONTHS } from './constants';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BorrowersPage from './pages/BorrowersPage';
import SettingsPage from './pages/SettingsPage';
import './styles.css';

const CREDIT_LIMIT_KEY = 'spaylater-credit-limit-v1';
const PAID_CYCLES_KEY = 'spaylater-paid-cycles-v1';

const MONTH_ABBR = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

function formatDisplayDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const month = MONTH_ABBR[d.getMonth()] || '';
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function SwipeableCycleHeader({ currentCycle, onSwipeLeft, onSwipeRight, formatDisplayDate, creditLimit, usedCredit }) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [animationPhase, setAnimationPhase] = useState('idle'); 
  // Phases: 'idle' | 'exit-left' | 'exit-right' | 'ready-enter-from-right' | 'ready-enter-from-left' | 'enter'

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (animationPhase === 'idle') {
        setSwipeOffset(e.deltaX * 0.5);
      }
    },
    onSwipedLeft: () => {
      if (animationPhase !== 'idle') return;
      // Phase 1: Slide out to left
      setAnimationPhase('exit-left');
      setTimeout(() => {
        // Phase 2: Update data, instantly position off-screen RIGHT (no transition)
        onSwipeLeft();
        setAnimationPhase('ready-enter-from-right');
        // Phase 3: Next frame, animate in from right
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimationPhase('enter');
            setTimeout(() => {
              setAnimationPhase('idle');
              setSwipeOffset(0);
            }, 220);
          });
        });
      }, 180);
    },
    onSwipedRight: () => {
      if (animationPhase !== 'idle') return;
      // Phase 1: Slide out to right
      setAnimationPhase('exit-right');
      setTimeout(() => {
        // Phase 2: Update data, instantly position off-screen LEFT (no transition)
        onSwipeRight();
        setAnimationPhase('ready-enter-from-left');
        // Phase 3: Next frame, animate in from left
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimationPhase('enter');
            setTimeout(() => {
              setAnimationPhase('idle');
              setSwipeOffset(0);
            }, 220);
          });
        });
      }, 180);
    },
    onTouchEndOrOnMouseUp: () => {
      if (animationPhase === 'idle') {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    delta: 40,
    preventScrollOnSwipe: true,
  });

  // Compute styles based on animation phase
  let transform = `translateX(${swipeOffset}px)`;
  let transition = 'transform 0.12s ease-out, opacity 0.12s ease-out';
  let opacity = 1;

  switch (animationPhase) {
    case 'exit-left':
      transform = 'translateX(-110%)';
      transition = 'transform 0.18s ease-in, opacity 0.15s ease-in';
      opacity = 0;
      break;
    case 'exit-right':
      transform = 'translateX(110%)';
      transition = 'transform 0.18s ease-in, opacity 0.15s ease-in';
      opacity = 0;
      break;
    case 'ready-enter-from-right':
      // Instantly position off-screen right (no transition)
      transform = 'translateX(110%)';
      transition = 'none';
      opacity = 0;
      break;
    case 'ready-enter-from-left':
      // Instantly position off-screen left (no transition)
      transform = 'translateX(-110%)';
      transition = 'none';
      opacity = 0;
      break;
    case 'enter':
      // Animate to center
      transform = 'translateX(0)';
      transition = 'transform 0.22s ease-out, opacity 0.2s ease-out';
      opacity = 1;
      break;
    default:
      break;
  }

  const hasLimit = typeof creditLimit === 'number' && creditLimit > 0;
  const safeLimit = hasLimit ? creditLimit : 0;
  const safeUsed = Math.max(usedCredit || 0, 0);

  const activeValue = safeUsed;
  const ratio = hasLimit && safeLimit > 0 ? Math.min(Math.max(safeUsed / safeLimit, 0), 1) : 0;
  const liquidWidth = `${Math.round(ratio * 100)}%`;

  const formatPlainNumber = (value) => (value || 0).toLocaleString('en-PH', {
    maximumFractionDigits: 0,
  });

  return (
    <div className="header-swipe-container" {...handlers}>
      <header
        className="app-header"
        style={{ transform, transition, opacity }}
      >
        <div className="cycle-header">
          <div className="cycle-header-top">
            <div className="cycle-header-left">
              <h1 className="cycle-title">Current Cycle</h1>
              <p className="cycle-dates">{currentCycle.label}</p>
            </div>
            <div className="swipe-hint">‹ swipe ›</div>
          </div>
          <div className="cycle-header-bottom">
            <div className="credit-block">
              <div className="credit-capsule">
                <div className="credit-liquid" style={{ width: liquidWidth }} />
              </div>
              {hasLimit && (
                <div className="credit-text-row">
                  <span className="credit-amount">
                    ₱{formatPlainNumber(activeValue)} / ₱{formatPlainNumber(safeLimit)}
                  </span>
                  <span className="credit-mode-label">
                    Used
                  </span>
                </div>
              )}
            </div>
            <div className="due-block">
              <p className="label">Due Date</p>
              <p className="value">{formatDisplayDate(currentCycle.due)}</p>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

setupDatabase();

function App() {
  const { 
    transactions, 
    addTransaction, 
    editTransaction, 
    deleteTransaction,
    replaceAllTransactions 
  } = useTransactions();
  
  const { 
    borrowers, 
    addBorrower, 
    removeBorrower,
    replaceAllBorrowers 
  } = useBorrowers();

  const { payments, addPayment, editPayment, deletePayment } = usePayments();

  const [cycleAnchorDate, setCycleAnchorDate] = useState(() => new Date());

  const [creditLimit, setCreditLimit] = useState(() => {
    try {
      const raw = window.localStorage.getItem(CREDIT_LIMIT_KEY);
      if (!raw) return 0;
      const parsed = parseFloat(raw);
      if (Number.isNaN(parsed) || parsed < 0) return 0;
      return parsed;
    } catch (error) {
      return 0;
    }
  });

  const [paidCycles, setPaidCycles] = useState(() => {
    try {
      const raw = window.localStorage.getItem(PAID_CYCLES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v) => typeof v === 'number');
    } catch (error) {
      return [];
    }
  });

  const currentCycle = useMemo(() => getBillingCycle(cycleAnchorDate), [cycleAnchorDate]);

  const currentCycleIndex = useMemo(
    () => currentCycle.due.getFullYear() * 12 + currentCycle.due.getMonth(),
    [currentCycle]
  );

  const isCurrentCyclePaid = useMemo(
    () => paidCycles.includes(currentCycleIndex),
    [paidCycles, currentCycleIndex]
  );

  const perBorrowerCredits = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (!p || typeof p.cycleIndex !== 'number' || !p.borrower) return;
      if (!map[p.borrower]) map[p.borrower] = 0;
      if (p.cycleIndex < currentCycleIndex) return;
      if (p.cycleIndex === currentCycleIndex) {
        map[p.borrower] += Number(p.amount) || 0;
      }
    });
    return map;
  }, [payments, currentCycleIndex]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CREDIT_LIMIT_KEY, String(creditLimit || 0));
    } catch (error) {
      
    }
  }, [creditLimit]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PAID_CYCLES_KEY, JSON.stringify(paidCycles));
    } catch (error) {
      
    }
  }, [paidCycles]);

  const currentCycleTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (!tx.orderDate) return false;

        const totalMonths = tx.totalMonths || PAYMENT_PLAN_MONTHS[tx.paymentPlan] || 1;

        if (tx.paymentPlan === 'bnpl' || totalMonths === 1) {
          const cycle = getBillingCycle(tx.orderDate);
          return (
            cycle.start.getTime() === currentCycle.start.getTime() &&
            cycle.end.getTime() === currentCycle.end.getTime()
          );
        }

        if (typeof tx.startCycleIndex !== 'number') return false;

        const startIndex = tx.startCycleIndex;
        const endIndex = startIndex + totalMonths - 1;
        return currentCycleIndex >= startIndex && currentCycleIndex <= endIndex;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.orderDate) - new Date(a.orderDate);
        if (dateDiff !== 0) return dateDiff;

        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bCreated - aCreated;
      });
  }, [transactions, currentCycle, currentCycleIndex]);

  const currentCycleTotal = useMemo(() => {
    return currentCycleTransactions.reduce((sum, tx) => {
      const totalMonths = tx.totalMonths || PAYMENT_PLAN_MONTHS[tx.paymentPlan] || 1;
      const isInstallment = tx.paymentPlan !== 'bnpl' && totalMonths > 1;
      const amountForCycle = isInstallment ? tx.monthlyPayment || tx.amount : tx.amount;
      return sum + (amountForCycle || 0);
    }, 0);
  }, [currentCycleTransactions]);

  const currentCycleBnplTotal = useMemo(
    () =>
      currentCycleTransactions.reduce((sum, tx) => {
        if (tx.paymentPlan !== 'bnpl') return sum;
        return sum + (tx.amount || 0);
      }, 0),
    [currentCycleTransactions]
  );

  const currentCycleInstallmentTotal = useMemo(
    () => currentCycleTotal - currentCycleBnplTotal,
    [currentCycleTotal, currentCycleBnplTotal]
  );

  const borrowerTotals = useMemo(() => {
    const map = {};
    borrowers.forEach((name) => {
      map[name] = { due: 0, count: 0, paid: 0, balance: 0 };
    });

    currentCycleTransactions.forEach((tx) => {
      const totalMonths = tx.totalMonths || PAYMENT_PLAN_MONTHS[tx.paymentPlan] || 1;
      const isInstallment = tx.paymentPlan !== 'bnpl' && totalMonths > 1;
      const amountForCycle = isInstallment ? tx.monthlyPayment || tx.amount : tx.amount;
      if (tx.mode === 'shared' && Array.isArray(tx.shares) && tx.shares.length > 0) {
        tx.shares.forEach((share) => {
          const key = share.borrower || 'Personal';
          if (!map[key]) {
            map[key] = { due: 0, count: 0 };
          }
          const shareAmount = share.amountPerCycle ?? 0;
          map[key].due += shareAmount;
          map[key].count += 1;
        });
      } else {
        const key = tx.borrower || 'Personal';
        if (!map[key]) {
          map[key] = { due: 0, count: 0, paid: 0, balance: 0 };
        }
        map[key].due += amountForCycle || 0;
        map[key].count += 1;
      }
    });

    Object.keys(map).forEach((name) => {
      const paid = perBorrowerCredits[name] || 0;
      const due = map[name].due || 0;
      const balance = Math.max(due - paid, 0);
      map[name].paid = paid;
      map[name].balance = balance;
    });

    return map;
  }, [borrowers, currentCycleTransactions, perBorrowerCredits]);

  const usedCredit = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;

    const paidSet = new Set(paidCycles);

    return transactions.reduce((sum, tx) => {
      const amount = tx.amount || 0;
      if (!amount) return sum;

      const totalMonths = tx.totalMonths || PAYMENT_PLAN_MONTHS[tx.paymentPlan] || 1;
      const startIndex = typeof tx.startCycleIndex === 'number'
        ? tx.startCycleIndex
        : (() => {
            if (!tx.orderDate) return 0;
            const cycle = getBillingCycle(tx.orderDate);
            return cycle.due.getFullYear() * 12 + cycle.due.getMonth();
          })();

      let unpaidInstallments = 0;
      for (let i = 0; i < totalMonths; i++) {
        const cycleIndex = startIndex + i;
        if (!paidSet.has(cycleIndex)) {
          unpaidInstallments += 1;
        }
      }

      if (unpaidInstallments <= 0) return sum;

      const outstandingAmount = (unpaidInstallments / totalMonths) * amount;
      return sum + outstandingAmount;
    }, 0);
  }, [transactions, paidCycles]);

  const remainingCredit = useMemo(() => {
    if (!creditLimit || creditLimit <= 0) return null;
    return creditLimit - usedCredit;
  }, [creditLimit, usedCredit]);

  const creditUtilization = useMemo(() => {
    if (!creditLimit || creditLimit <= 0) return null;
    if (!usedCredit || usedCredit <= 0) return 0;
    return (usedCredit / creditLimit) * 100;
  }, [creditLimit, usedCredit]);

  const goToPrevCycle = () => {
    setCycleAnchorDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const goToNextCycle = () => {
    setCycleAnchorDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const toggleCurrentCyclePaid = () => {
    setPaidCycles((prev) => {
      const exists = prev.includes(currentCycleIndex);
      if (exists) {
        return prev.filter((index) => index !== currentCycleIndex);
      }
      return [...prev, currentCycleIndex];
    });
  };

  const handleImportData = async (importData) => {
    // First validate the import data
    if (!importData.borrowers || !importData.transactions) {
      throw new Error('Invalid import data format');
    }

    // Replace all borrowers and transactions
    await replaceAllBorrowers(importData.borrowers);
    await replaceAllTransactions(importData.transactions);
    
    // Update the cycle anchor date if it exists in the import data
    if (importData.cycleAnchorDate) {
      setCycleAnchorDate(new Date(importData.cycleAnchorDate));
    }

    if (typeof importData.creditLimit === 'number') {
      setCreditLimit(importData.creditLimit >= 0 ? importData.creditLimit : 0);
    }

    if (Array.isArray(importData.paidCycles)) {
      setPaidCycles(importData.paidCycles.filter((v) => typeof v === 'number'));
    }
  };

  const sharedProps = {
    borrowers,
    borrowerTotals,
    paymentPlans,
    currentCycle,
    currentCycleTotal,
    currentCycleBnplTotal,
    currentCycleInstallmentTotal,
    creditLimit,
    remainingCredit,
    creditUtilization,
    currentCycleTransactions,
    currentCycleIndex,
    transactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
    payments,
    addPayment,
    editPayment,
    deletePayment,
    addBorrower,
    removeBorrower,
    onImportData: handleImportData
  };

  return (
    <BrowserRouter>
      <div className="app-shell">
        <SwipeableCycleHeader
          currentCycle={currentCycle}
          onSwipeLeft={goToNextCycle}
          onSwipeRight={goToPrevCycle}
          formatDisplayDate={formatDisplayDate}
          creditLimit={creditLimit}
          remainingCredit={remainingCredit}
          usedCredit={usedCredit}
        />

        <nav className="primary-nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/borrowers">Borrowers</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<DashboardPage {...sharedProps} />} />
            <Route
              path="/transactions"
              element={<TransactionsPage {...sharedProps} />}
            />
            <Route
              path="/borrowers"
              element={<BorrowersPage {...sharedProps} />}
            />
            <Route
              path="/settings"
              element={
                <SettingsPage 
                  borrowers={borrowers}
                  transactions={transactions}
                  cycleAnchorDate={cycleAnchorDate}
                  creditLimit={creditLimit}
                  onUpdateCreditLimit={setCreditLimit}
                  onImportData={handleImportData}
                />
              }
            />
          </Routes>
        </main>

        <nav
          className="mobile-nav flex items-center justify-around text-slate-400 text-sm"
          aria-label="Bottom navigation"
        >
          <NavLink to="/" end aria-label="Dashboard">
            <span className="nav-icon flex h-8 w-8 items-center justify-center rounded-full">
              <Squares2X2Icon className="h-3.5 w-3.5" />
            </span>
          </NavLink>
          <NavLink to="/transactions" aria-label="Transactions">
            <span className="nav-icon flex h-8 w-8 items-center justify-center rounded-full">
              <CreditCardIcon className="h-3.5 w-3.5" />
            </span>
          </NavLink>
          <NavLink to="/borrowers" aria-label="Borrowers">
            <span className="nav-icon flex h-8 w-8 items-center justify-center rounded-full">
              <UsersIcon className="h-3.5 w-3.5" />
            </span>
          </NavLink>
          <NavLink to="/settings" aria-label="Settings">
            <span className="nav-icon flex h-8 w-8 items-center justify-center rounded-full">
              <Cog6ToothIcon className="h-3.5 w-3.5" />
            </span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;
