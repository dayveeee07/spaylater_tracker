import React, { useEffect, useMemo, useState } from 'react';

const todayLabel = new Date().toISOString().slice(0, 10);

const formatCurrency = (value) =>
  `₱${(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

function TransactionsPage({
  borrowers,
  paymentPlans,
  currentCycleTransactions,
  currentCycleIndex,
  addTransaction,
  editTransaction,
  deleteTransaction
}) {
  const [formState, setFormState] = useState({
    productName: '',
    amount: '',
    orderDate: todayLabel,
    borrower: 'Personal',
    paymentPlan: 'bnpl',
    monthlyPayment: '',
    mode: 'single',
    description: ''
  });
  const [shareRows, setShareRows] = useState([
    { borrower: 'Personal', amount: '' },
    { borrower: 'Personal', amount: '' }
  ]);
  const [editingId, setEditingId] = useState(null);
  const [editFormState, setEditFormState] = useState(null);
  const [borrowerFilter, setBorrowerFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  const filteredTransactions = useMemo(() => {
    return currentCycleTransactions.filter((tx) => {
      if (borrowerFilter !== 'all') {
        if (tx.mode === 'shared' && Array.isArray(tx.shares)) {
          const involved = tx.shares.some((share) => share.borrower === borrowerFilter);
          if (!involved) return false;
        } else if (tx.borrower !== borrowerFilter) {
          return false;
        }
      }
      if (planFilter !== 'all' && tx.paymentPlan !== planFilter) return false;
      return true;
    });
  }, [currentCycleTransactions, borrowerFilter, planFilter]);

  const searchedTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredTransactions;

    return filteredTransactions.filter((tx) => {
      const productName = (tx.productName || '').toLowerCase();
      const borrower = (tx.borrower || '').toLowerCase();
      const planMeta = paymentPlans.find((plan) => plan.value === tx.paymentPlan);
      const planLabel = (planMeta?.label || '').toLowerCase();
      const orderDate = (tx.orderDate || '').toLowerCase();
      const description = (tx.description || '').toLowerCase();

      let sharedBorrowers = '';
      if (tx.mode === 'shared' && Array.isArray(tx.shares)) {
        sharedBorrowers = tx.shares
          .map((share) => share.borrower || '')
          .join(' ')
          .toLowerCase();
      }

      return (
        productName.includes(query) ||
        borrower.includes(query) ||
        sharedBorrowers.includes(query) ||
        planLabel.includes(query) ||
        orderDate.includes(query) ||
        description.includes(query)
      );
    });
  }, [filteredTransactions, searchQuery, paymentPlans]);

  const totalPages = useMemo(
    () => (searchedTransactions.length === 0 ? 1 : Math.ceil(searchedTransactions.length / ITEMS_PER_PAGE)),
    [searchedTransactions]
  );

  const paginatedTransactions = useMemo(() => {
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return searchedTransactions.slice(startIndex, endIndex);
  }, [searchedTransactions, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [borrowerFilter, planFilter, searchQuery, currentCycleIndex]);

  const computeInterestPreview = (amountValue, monthlyValue, paymentPlan) => {
    const principal = parseFloat(amountValue);
    const monthly = parseFloat(monthlyValue);
    const plan = paymentPlans.find((planItem) => planItem.value === paymentPlan);
    const totalMonths = plan?.months || (paymentPlan === 'bnpl' ? 1 : undefined);
    if (!totalMonths || totalMonths <= 1) return null;
    if (!principal || !monthly || Number.isNaN(principal) || Number.isNaN(monthly)) {
      return null;
    }
    const totalPaid = monthly * totalMonths;
    const totalInterest = totalPaid - principal;
    if (totalInterest <= 0) return { totalPaid, totalInterest: 0, percent: 0 };
    return { totalPaid, totalInterest, percent: (totalInterest / principal) * 100 };
  };

  const handleSplitEvenly = () => {
    if (!formState.monthlyPayment) return;
    const monthlyAmount = parseFloat(formState.monthlyPayment);
    if (isNaN(monthlyAmount) || monthlyAmount <= 0) return;
    const shareAmount = (monthlyAmount / shareRows.length).toFixed(2);
    const updatedRows = shareRows.map(row => ({
      ...row,
      amount: shareAmount
    }));
    setShareRows(updatedRows);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsedAmount = parseFloat(formState.amount);
    if (!formState.productName || Number.isNaN(parsedAmount)) {
      return;
    }

    const basePayload = {
      productName: formState.productName,
      amount: parsedAmount,
      orderDate: formState.orderDate,
      paymentPlan: formState.paymentPlan,
      monthlyPayment: formState.monthlyPayment ? parseFloat(formState.monthlyPayment) : undefined,
      description: formState.description || ''
    };

    if (formState.mode === 'shared') {
      const validRows = shareRows.filter(
        (row) => row.borrower && row.amount && !Number.isNaN(parseFloat(row.amount))
      );
      if (validRows.length < 2) {
        window.alert('Shared transactions must include at least two borrowers with amounts.');
        return;
      }

      const planMeta = paymentPlans.find((plan) => plan.value === formState.paymentPlan);
      const totalMonths = planMeta?.months || (formState.paymentPlan === 'bnpl' ? 1 : undefined);
      const required =
        totalMonths && totalMonths > 1
          ? basePayload.monthlyPayment ?? 0
          : parsedAmount;

      const sumShares = validRows.reduce(
        (sum, row) => sum + (parseFloat(row.amount) || 0),
        0
      );

      if (Math.abs(sumShares - required) > 0.01) {
        window.alert('Shared amounts must add up exactly to the required amount for this cycle.');
        return;
      }

      await addTransaction({
        ...basePayload,
        mode: 'shared',
        shares: validRows.map((row) => ({
          borrower: row.borrower,
          amountPerCycle: parseFloat(row.amount)
        }))
      });
    } else {
      if (!formState.borrower) {
        return;
      }

      await addTransaction({
        ...basePayload,
        borrower: formState.borrower,
        mode: 'single'
      });
    }

    setFormState({
      productName: '',
      amount: '',
      orderDate: todayLabel,
      borrower: 'Personal',
      paymentPlan: 'bnpl',
      monthlyPayment: '',
      mode: 'single',
      description: ''
    });
    setShareRows([]);
    setIsAddModalOpen(false);
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditFormState({
      productName: transaction.productName,
      amount: String(transaction.amount ?? ''),
      orderDate: transaction.orderDate?.slice(0, 10) ?? todayLabel,
      borrower: transaction.borrower ?? 'Personal',
      paymentPlan: transaction.paymentPlan ?? 'bnpl',
      monthlyPayment: transaction.monthlyPayment ? String(transaction.monthlyPayment) : '',
      description: transaction.description || ''
    });
  };

  const handleCloseEdit = () => {
    setEditingId(null);
    setEditFormState(null);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingId || !editFormState) return;

    const parsedAmount = parseFloat(editFormState.amount);
    const parsedMonthly = editFormState.monthlyPayment ? parseFloat(editFormState.monthlyPayment) : undefined;
    if (!editFormState.productName || !editFormState.borrower || Number.isNaN(parsedAmount)) {
      return;
    }

    await editTransaction(editingId, {
      productName: editFormState.productName,
      amount: parsedAmount,
      orderDate: editFormState.orderDate,
      borrower: editFormState.borrower,
      paymentPlan: editFormState.paymentPlan,
      monthlyPayment: parsedMonthly,
      description: editFormState.description || ''
    });

    handleCloseEdit();
  };

  const handleDelete = async () => {
    if (!editingId) return;
    await deleteTransaction(editingId);
    handleCloseEdit();
  };

  return (
    <div className="page transactions-page">
      <section className="card transactions-panel">
        <header>
          <div>
            <h2>Transactions</h2>
            <p className="meta">{searchedTransactions.length} in this cycle</p>
          </div>
          <div className="filters-row">
            <button type="button" className="add-transaction-btn" onClick={handleOpenAddModal}>
              + Add
            </button>
            <div className="select-control">
              <span className="label">Borrower</span>
              <select value={borrowerFilter} onChange={(event) => setBorrowerFilter(event.target.value)}>
                <option value="all">All</option>
                {borrowers.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="select-control">
              <span className="label">Payment Plan</span>
              <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
                <option value="all">All</option>
                {paymentPlans.map((plan) => (
                  <option key={plan.value} value={plan.value}>{plan.label}</option>
                ))}
              </select>
            </div>
            <div className="select-control">
              <span className="label">Search</span>
              <input
                type="text"
                placeholder="Product, borrower, plan..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </header>
        <div className="transaction-grid">
          {searchedTransactions.length === 0 ? (
            <p className="empty-state">No transactions match the filters or search.</p>
          ) : (
            paginatedTransactions.map((transaction) => {
              const planMeta = paymentPlans.find((plan) => plan.value === transaction.paymentPlan);
              const totalMonths = planMeta?.months || (transaction.paymentPlan === 'bnpl' ? 1 : 1);
              const isInstallment = transaction.paymentPlan !== 'bnpl' && totalMonths > 1;
              const amountForCycle = isInstallment ? transaction.monthlyPayment || transaction.amount : transaction.amount;
              const isShared = transaction.mode === 'shared' && Array.isArray(transaction.shares);

              let progressLabel = null;
              if (isInstallment && typeof transaction.startCycleIndex === 'number') {
                const currentMonth = Math.min(
                  Math.max(currentCycleIndex - transaction.startCycleIndex + 1, 1),
                  totalMonths
                );
                progressLabel = `${currentMonth} / ${totalMonths}`;
              }

              return (
                <article
                  key={transaction.id}
                  className="transaction-card"
                  onClick={isShared ? undefined : () => handleOpenEdit(transaction)}
                >
                  <div className="transaction-header">
                    <div className="transaction-title-block">
                      <h3>{transaction.productName}</h3>
                      {transaction.description && (
                        <p className="meta transaction-description">{transaction.description}</p>
                      )}
                    </div>
                    <span className="badge">{planMeta?.label || '—'}</span>
                  </div>
                  <div className="transaction-footer">
                    <div className="transaction-footer-main">
                      <p className="borrower">
                        {isShared && transaction.shares
                          ? `Shared: ${transaction.shares
                              .map((share) => `${share.borrower} (${formatCurrency(share.amountPerCycle)})`)
                              .join(' • ')}`
                          : transaction.borrower}
                      </p>
                      <p className="meta">Ordered on {new Date(transaction.orderDate).toLocaleDateString()}</p>
                      {progressLabel && (
                        <p className="meta installment-progress">Installment: {progressLabel}</p>
                      )}
                    </div>
                    <p className="amount">{formatCurrency(amountForCycle)}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
        {searchedTransactions.length > ITEMS_PER_PAGE && (
          <div className="transactions-pagination">
            <button
              type="button"
              className="secondary small"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="meta">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              className="secondary small"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </section>

      <button
        type="button"
        className="fab-add-transaction"
        onClick={handleOpenAddModal}
        aria-label="Add transaction"
      >
        +
      </button>

      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseAddModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Add Transaction</h2>
            <form className="transaction-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="mode"
                    value="single"
                    checked={formState.mode === 'single'}
                    onChange={() => setFormState({ ...formState, mode: 'single' })}
                  />
                  <span>Single</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="mode"
                    value="shared"
                    checked={formState.mode === 'shared'}
                    onChange={() => setFormState({ ...formState, mode: 'shared' })}
                  />
                  <span>Shared</span>
                </label>
              </div>
              <label>
                Product Name
                <input
                  value={formState.productName}
                  onChange={(event) => setFormState({ ...formState, productName: event.target.value })}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={formState.description || ''}
                  onChange={(event) => setFormState({ ...formState, description: event.target.value })}
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  step="0.01"
                  value={formState.amount}
                  onChange={(event) => setFormState({ ...formState, amount: event.target.value })}
                  required
                />
              </label>
              <label>
                Order Date
                <input
                  type="date"
                  value={formState.orderDate}
                  onChange={(event) => setFormState({ ...formState, orderDate: event.target.value })}
                  required
                />
              </label>
              {formState.mode === 'single' ? (
                <label>
                  Borrower
                  <select
                    value={formState.borrower}
                    onChange={(event) => setFormState({ ...formState, borrower: event.target.value })}
                  >
                    {borrowers.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="shared-borrowers">
                  <div className="shared-borrower-actions">
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => setShareRows([...shareRows, { borrower: 'Personal', amount: '' }])}
                    >
                      + Add Borrower
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      onClick={handleSplitEvenly}
                      disabled={!formState.monthlyPayment || formState.paymentPlan === 'bnpl'}
                    >
                      Split Evenly
                    </button>
                  </div>
                  {shareRows.map((row, index) => (
                    <div key={index} className="shared-borrower-row">
                      <select
                        value={row.borrower}
                        onChange={(e) => {
                          const newRows = [...shareRows];
                          newRows[index].borrower = e.target.value;
                          setShareRows(newRows);
                        }}
                      >
                        {borrowers.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Amount"
                        value={row.amount}
                        onChange={(e) => {
                          const newRows = [...shareRows];
                          newRows[index].amount = e.target.value;
                          setShareRows(newRows);
                        }}
                        required
                      />
                      <button
                        type="button"
                        className="danger small"
                        onClick={() => {
                          if (shareRows.length > 2) {
                            setShareRows(shareRows.filter((_, i) => i !== index));
                          } else {
                            const newRows = [...shareRows];
                            newRows[index] = { borrower: 'Personal', amount: '' };
                            setShareRows(newRows);
                          }
                        }}
                      >
                        X
                      </button>
                    </div>
                  ))}
                  {formState.paymentPlan && (
                    <div className={`shared-summary ${shareRows.some(r => !r.amount) ? 'invalid' : 'valid'}`}>
                      {shareRows.some(r => !r.amount)
                        ? 'Please fill in all amounts'
                        : `Total: ${formatCurrency(shareRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0))}`}
                    </div>
                  )}
                </div>
              )}
              <label>
                Payment Plan
                <select
                  value={formState.paymentPlan}
                  onChange={(event) => setFormState({ ...formState, paymentPlan: event.target.value })}
                >
                  {paymentPlans.map((plan) => (
                    <option key={plan.value} value={plan.value}>{plan.label}</option>
                  ))}
                </select>
              </label>
              {formState.paymentPlan !== 'bnpl' && (
                <label>
                  Monthly Payment
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.monthlyPayment}
                    onChange={(event) => setFormState({ ...formState, monthlyPayment: event.target.value })}
                    required
                  />
                </label>
              )}
              {formState.paymentPlan !== 'bnpl' && formState.monthlyPayment && (() => {
                const preview = computeInterestPreview(formState.amount, formState.monthlyPayment, formState.paymentPlan);
                if (!preview) return null;
                return (
                  <p className="meta interest-preview">
                    Interest: {formatCurrency(preview.totalInterest)} ({preview.percent.toFixed(2)}%) - Total paid: {formatCurrency(preview.totalPaid)}
                  </p>
                );
              })()}
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={handleCloseAddModal}>Cancel</button>
                <button type="submit">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingId && editFormState && (
        <div className="modal-backdrop" onClick={handleCloseEdit}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Edit Transaction</h2>
            <form className="transaction-form" onSubmit={handleEditSubmit}>
              <label>
                Product Name
                <input
                  value={editFormState.productName}
                  onChange={(event) => setEditFormState({ ...editFormState, productName: event.target.value })}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={editFormState.description || ''}
                  onChange={(event) => setEditFormState({ ...editFormState, description: event.target.value })}
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  step="0.01"
                  value={editFormState.amount}
                  onChange={(event) => setEditFormState({ ...editFormState, amount: event.target.value })}
                  required
                />
              </label>
              <label>
                Order Date
                <input
                  type="date"
                  value={editFormState.orderDate}
                  onChange={(event) => setEditFormState({ ...editFormState, orderDate: event.target.value })}
                  required
                />
              </label>
              <label>
                Borrower
                <select
                  value={editFormState.borrower}
                  onChange={(event) => setEditFormState({ ...editFormState, borrower: event.target.value })}
                >
                  {borrowers.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </label>
              <label>
                Payment Plan
                <select
                  value={editFormState.paymentPlan}
                  onChange={(event) => setEditFormState({ ...editFormState, paymentPlan: event.target.value })}
                >
                  {paymentPlans.map((plan) => (
                    <option key={plan.value} value={plan.value}>{plan.label}</option>
                  ))}
                </select>
              </label>
              {editFormState.paymentPlan !== 'bnpl' && (
                <label>
                  Monthly Payment
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormState.monthlyPayment}
                    onChange={(event) => setEditFormState({ ...editFormState, monthlyPayment: event.target.value })}
                    required
                  />
                </label>
              )}
              {editFormState.paymentPlan !== 'bnpl' && editFormState.monthlyPayment && (() => {
                const preview = computeInterestPreview(editFormState.amount, editFormState.monthlyPayment, editFormState.paymentPlan);
                if (!preview) return null;
                return (
                  <p className="meta interest-preview">
                    Interest: {formatCurrency(preview.totalInterest)} ({preview.percent.toFixed(2)}%) - Total paid: {formatCurrency(preview.totalPaid)}
                  </p>
                );
              })()}
              <div className="modal-actions">
                <button type="button" className="danger" onClick={handleDelete}>Delete</button>
                <button type="button" className="secondary" onClick={handleCloseEdit}>Cancel</button>
                <button type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionsPage;
