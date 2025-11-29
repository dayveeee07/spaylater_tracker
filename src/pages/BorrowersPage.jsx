import React, { useState } from 'react';

const formatCurrency = (value) => `₱${(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

function BorrowersPage({ borrowers, borrowerTotals, addBorrower, removeBorrower, currentCycle }) {
  const [newBorrowerName, setNewBorrowerName] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  return (
    <div className="page borrowers-page">
      <section className="card">
        <header>
          <div>
            <h2>Borrower Overview</h2>
            <p className="meta">Cycle: {currentCycle.label}</p>
          </div>
          <button type="button" className="add-transaction-btn" onClick={() => setIsAddModalOpen(true)}>
            ＋ Add Borrower
          </button>
        </header>
        <div className="borrower-manage-grid">
          {sortedBorrowers.map((name) => {
            const stats = borrowerTotals[name] || { due: 0, count: 0 };
            return (
              <article key={name} className="borrower-manage-card">
                <div>
                  <p className="borrower-name">{name}</p>
                  <p className="meta">{stats.count} transactions</p>
                </div>
                <div className="borrower-item-actions">
                  <p className="value">{formatCurrency(stats.due)}</p>
                  {name !== 'Personal' && (
                    <button type="button" className="danger small" onClick={() => removeBorrower(name)}>
                      Remove
                    </button>
                  )}
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
    </div>
  );
}

export default BorrowersPage;
