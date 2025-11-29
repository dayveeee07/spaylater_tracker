import { useEffect, useState } from 'react';

const STORAGE_KEY = 'spaylater-transactions-v1';
const BORROWERS_KEY = 'spaylater-borrowers-v1';

const PAYMENT_PLAN_MONTHS = {
  bnpl: 1,
  '3months': 3,
  '6months': 6,
  '12months': 12
};

export const setupDatabase = () => {
  // No-op for localStorage-backed implementation
};

const loadFromStorage = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.error('Failed to load transactions from storage', error);
    return [];
  }
};

const saveToStorage = (transactions) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions to storage', error);
  }
};

const loadBorrowers = () => {
  try {
    const raw = window.localStorage.getItem(BORROWERS_KEY);
    if (!raw) return ['Personal'];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ['Personal'];
    return parsed;
  } catch (error) {
    console.error('Failed to load borrowers from storage', error);
    return ['Personal'];
  }
};

const saveBorrowers = (borrowers) => {
  try {
    window.localStorage.setItem(BORROWERS_KEY, JSON.stringify(borrowers));
  } catch (error) {
    console.error('Failed to save borrowers to storage', error);
  }
};

export const useBorrowers = () => {
  const [borrowers, setBorrowers] = useState(() => loadBorrowers());

  useEffect(() => {
    saveBorrowers(borrowers);
  }, [borrowers]);

  const addBorrower = async (name) => {
    if (!name || borrowers.includes(name)) return;
    setBorrowers((prev) => [...prev, name]);
  };

  const removeBorrower = async (name) => {
    if (name === 'Personal') return;
    setBorrowers((prev) => prev.filter((b) => b !== name));
  };

  const replaceAllBorrowers = async (newBorrowers) => {
    if (!Array.isArray(newBorrowers)) {
      throw new Error('Borrowers must be an array');
    }
    // Always ensure 'Personal' is included
    const borrowersSet = new Set(['Personal', ...newBorrowers]);
    setBorrowers(Array.from(borrowersSet));
  };

  return { borrowers, addBorrower, removeBorrower, replaceAllBorrowers };
};

export const useTransactions = () => {
  const [transactions, setTransactions] = useState(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(transactions);
  }, [transactions]);

  const addTransaction = async (transaction) => {
    const now = new Date().toISOString();
    const totalMonths = PAYMENT_PLAN_MONTHS[transaction.paymentPlan] || 1;

    // Anchor this transaction to the billing cycle where the order date belongs.
    // We only store the cycle index (year*12 + month of due date) so we can
    // later derive which cycles the installment is active in.
    const { getBillingCycle } = await import('./billingCycle');
    const startCycle = getBillingCycle(transaction.orderDate);
    const startCycleIndex = startCycle.due.getFullYear() * 12 + startCycle.due.getMonth();

    const newRecord = {
      id: crypto.randomUUID(),
      productName: transaction.productName,
      amount: transaction.amount,
      borrower: transaction.borrower,
      paymentPlan: transaction.paymentPlan,
      orderDate: transaction.orderDate,
      monthlyPayment: transaction.monthlyPayment,
      mode: transaction.mode || 'single',
      shares: Array.isArray(transaction.shares) ? transaction.shares : undefined,
      totalMonths,
      startCycleIndex,
      createdAt: now,
      updatedAt: now
    };
    setTransactions((prev) => [...prev, newRecord]);
  };

  const editTransaction = async (id, updates) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              ...updates,
              updatedAt: new Date().toISOString()
            }
          : tx
      )
    );
  };

  const deleteTransaction = async (id) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const replaceAllTransactions = async (newTransactions) => {
    if (!Array.isArray(newTransactions)) {
      throw new Error('Transactions must be an array');
    }
    // Ensure all required fields are present
    const validatedTransactions = newTransactions.map(tx => ({
      id: tx.id || crypto.randomUUID(),
      productName: tx.productName || '',
      amount: Number(tx.amount) || 0,
      borrower: tx.borrower || 'Personal',
      paymentPlan: tx.paymentPlan || 'bnpl',
      orderDate: tx.orderDate || new Date().toISOString().split('T')[0],
      monthlyPayment: Number(tx.monthlyPayment) || 0,
      mode: tx.mode || 'single',
      shares: Array.isArray(tx.shares) ? tx.shares : undefined,
      totalMonths: tx.totalMonths || 1,
      startCycleIndex: tx.startCycleIndex || 0,
      createdAt: tx.createdAt || new Date().toISOString(),
      updatedAt: tx.updatedAt || new Date().toISOString()
    }));
    
    setTransactions(validatedTransactions);
  };

  return { 
    transactions, 
    addTransaction, 
    editTransaction, 
    deleteTransaction, 
    replaceAllTransactions 
  };
};
