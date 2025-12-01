import React, { useState } from 'react';

const formatCurrency = (value) => `₱${(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

function BorrowersPage({
  borrowers,
  borrowerTotals,
  addBorrower,
  removeBorrower,
  currentCycle,
  currentCycleIndex,
  addPayment,
  editPayment,
  deletePayment,
  payments
}) {
  const [newBorrowerName, setNewBorrowerName] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentBorrower, setPaymentBorrower] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentMethodNote, setPaymentMethodNote] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState(null);

  const sortedBorrowers = [...borrowers].sort((a, b) => {
    const dueA = borrowerTotals[a]?.due || 0;
    const dueB = borrowerTotals[b]?.due || 0;
    return dueB - dueA;
  });

  const handleAddBorrower = (event) => {
    event.preventDefault();
    const trimmed = newBorrowerName.trim();
    if (!trimmed) return;
    addBorrower(trimmed);
    setNewBorrowerName('');
    setIsAddModalOpen(false);
  };

  const openPaymentModalFor = (name) => {
    setEditingPaymentId(null);
    setPaymentBorrower(name);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setPaymentMethodNote('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    const amountNumber = parseFloat(paymentAmount);
    if (!paymentBorrower || Number.isNaN(amountNumber) || amountNumber <= 0) return;

    if (editingPaymentId) {
      await editPayment(editingPaymentId, {
        amount: amountNumber,
        date: paymentDate,
        method: paymentMethod,
        methodNote: paymentMethodNote
      });
    } else {
      await addPayment({
        borrower: paymentBorrower,
        cycleIndex: currentCycleIndex,
        amount: amountNumber,
        date: paymentDate,
        method: paymentMethod,
        methodNote: paymentMethodNote
      });
    }

    setIsPaymentModalOpen(false);
  };

  const openEditPaymentModal = (payment) => {
    setEditingPaymentId(payment.id);
    setPaymentBorrower(payment.borrower);
    setPaymentAmount(String(payment.amount ?? ''));
    setPaymentDate(payment.date || new Date().toISOString().split('T')[0]);
    setPaymentMethod(payment.method || 'cash');
    setPaymentMethodNote(payment.methodNote || '');
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = async (id) => {
    await deletePayment(id);
  };

  return (
    <div className="page borrowers-page">
      <section className="card borrowers-card">
        <header className="borrowers-header">
          <h2>Borrowers</h2>
          <span className="cycle-tag">{currentCycle.label}</span>
        </header>
        <div className="borrower-manage-grid">
          {sortedBorrowers.map((name) => {
            const stats = borrowerTotals[name] || { due: 0, count: 0, paid: 0, balance: 0 };
            const due = stats.due || 0;
            const paid = stats.paid || 0;
            const balance = stats.balance || 0;
            const progress = due > 0 ? Math.min((paid / due) * 100, 120) : 0;
            return (
              <article
                key={name}
                className={`borrower-manage-card${balance === 0 && due > 0 ? ' paid-up' : ''}`}
                onClick={() => openPaymentModalFor(name)}
              >
                <div className="borrower-card-header">
                  <div className="borrower-card-info">
                    <p className="borrower-name">{name}</p>
                    <span className="borrower-badge">{stats.count}</span>
                  </div>
                  <div className="borrower-card-amount">
                    <p className="value">{formatCurrency(due)}</p>
                    {name !== 'Personal' && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeBorrower(name);
                        }}
                        title="Remove borrower"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <div className="borrower-progress">
                  <div className="borrower-progress-bar">
                    <div
                      className={`borrower-progress-fill${paid > due ? ' overpaid' : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="borrower-progress-stats">
                    <span>{formatCurrency(paid)} paid</span>
                    {balance > 0 && <span className="balance-tag">₱{balance.toLocaleString('en-PH')} left</span>}
                    {paid > due && <span className="overpaid-tag">+₱{(paid - due).toLocaleString('en-PH')}</span>}
                  </div>
                </div>
              </article>
            );
          })}
          {sortedBorrowers.length === 0 && <p className="empty-state">No borrowers yet.</p>}
        </div>
      </section>

      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Add Borrower</h2>
            <form className="transaction-form" onSubmit={handleAddBorrower}>
              <label>
                Name
                <input
                  name="borrowerName"
                  type="text"
                  placeholder="e.g. Ate Maya"
                  value={newBorrowerName}
                  onChange={(event) => setNewBorrowerName(event.target.value)}
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit">Add Borrower</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isPaymentModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Borrower Payments</h2>
            <form className="transaction-form" onSubmit={handleRecordPayment}>
              <p className="meta">Borrower: {paymentBorrower}</p>
              <label>
                Amount handed
                <input
                  name="paymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  required
                />
              </label>
              <label>
                Date
                <input
                  name="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  required
                />
              </label>
              <label>
                Method
                <select
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Notes (optional)
                <input
                  name="paymentMethodNote"
                  type="text"
                  placeholder="e.g. reference number, e-wallet name"
                  value={paymentMethodNote}
                  onChange={(event) => setPaymentMethodNote(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit">Save Payment</button>
              </div>
            </form>
            {paymentBorrower && (
              <div className="borrower-payments-section">
                <h3 className="payments-title">Payments this cycle</h3>
                {(() => {
                  const borrowerPayments = (payments || []).filter(
                    (p) => p.borrower === paymentBorrower && p.cycleIndex === currentCycleIndex
                  );
                  if (borrowerPayments.length === 0) {
                    return <p className="empty-state">No payments recorded yet.</p>;
                  }
                  return (
                    <ul className="borrower-payments-list">
                      {borrowerPayments.map((p) => (
                        <li key={p.id} className="borrower-payment-item">
                          <span>
                            {formatCurrency(p.amount)} · {p.date}{' '}
                            {p.method && `· ${p.method}`}
                          </span>
                          <span className="borrower-payment-actions">
                            <button
                              type="button"
                              className="secondary small"
                              onClick={() => openEditPaymentModal(p)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger small"
                              onClick={() => handleDeletePayment(p.id)}
                            >
                              Delete
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        className="fab-add-borrower"
        onClick={() => setIsAddModalOpen(true)}
        title="Add Borrower"
      >
        ＋
      </button>
    </div>
  );
}

export default BorrowersPage;
