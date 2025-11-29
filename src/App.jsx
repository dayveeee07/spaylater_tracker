import React, { useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { setupDatabase, useBorrowers, useTransactions } from './lib/transactions';
import { getBillingCycle } from './lib/billingCycle';
import { paymentPlans, PAYMENT_PLAN_MONTHS } from './constants';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BorrowersPage from './pages/BorrowersPage';
import SettingsPage from './pages/SettingsPage';
import './styles.css';

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

  const [cycleAnchorDate, setCycleAnchorDate] = useState(() => new Date());

  const currentCycle = useMemo(() => getBillingCycle(cycleAnchorDate), [cycleAnchorDate]);

  const currentCycleIndex = useMemo(
    () => currentCycle.due.getFullYear() * 12 + currentCycle.due.getMonth(),
    [currentCycle]
  );

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
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
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
      map[name] = { due: 0, count: 0 };
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
          map[key] = { due: 0, count: 0 };
        }
        map[key].due += amountForCycle || 0;
        map[key].count += 1;
      }
    });

    return map;
  }, [borrowers, currentCycleTransactions]);

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
  };

  const sharedProps = {
    borrowers,
    borrowerTotals,
    paymentPlans,
    currentCycle,
    currentCycleTotal,
    currentCycleBnplTotal,
    currentCycleInstallmentTotal,
    currentCycleTransactions,
    currentCycleIndex,
    transactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
    addBorrower,
    removeBorrower,
    onImportData: handleImportData
  };

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <button
            type="button"
            className="cycle-nav-btn"
            onClick={goToPrevCycle}
            aria-label="Previous billing cycle"
          ></button>
          <div className="app-header-main">
            <div>
              <p className="overline">SPayLater Tracker</p>
              <h1>Current Cycle</h1>
              <p className="cycle-dates">{currentCycle.label}</p>
            </div>
            <div className="due-block">
              <p className="label">Next Due Date</p>
              <p className="value">{currentCycle.due.toLocaleDateString()}</p>
            </div>
          </div>
          <button
            type="button"
            className="cycle-nav-btn"
            onClick={goToNextCycle}
            aria-label="Next billing cycle"
          ></button>
        </header>

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
                  onImportData={handleImportData}
                />
              }
            />
          </Routes>
        </main>

        <nav className="mobile-nav" aria-label="Bottom navigation">
          <NavLink to="/" end aria-label="Dashboard">
            <span className="nav-icon">D</span>
          </NavLink>
          <NavLink to="/transactions" aria-label="Transactions">
            <span className="nav-icon">T</span>
          </NavLink>
          <NavLink to="/borrowers" aria-label="Borrowers">
            <span className="nav-icon">B</span>
          </NavLink>
          <NavLink to="/settings" aria-label="Settings">
            <span className="nav-icon">S</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;
