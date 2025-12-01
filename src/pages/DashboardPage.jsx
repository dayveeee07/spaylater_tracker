import React from 'react';

const formatCurrency = (value) => `₱${(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

function DashboardPage({
  currentCycle,
  currentCycleTotal,
  currentCycleBnplTotal,
  currentCycleInstallmentTotal,
  borrowerTotals,
  borrowers,
  currentCycleTransactions,
  creditLimit,
  remainingCredit,
  creditUtilization
}) {
  const borrowerRanking = borrowers
    .map((name) => ({ name, ...(borrowerTotals[name] || { due: 0, count: 0 }) }))
    .sort((a, b) => b.due - a.due);

  const hasCreditLimit = typeof creditLimit === 'number' && creditLimit > 0;
  const safeRemaining = typeof remainingCredit === 'number' ? remainingCredit : 0;
  const safeUtilization = typeof creditUtilization === 'number' ? creditUtilization : 0;

  let utilizationClassName = 'meta';
  if (hasCreditLimit) {
    if (safeUtilization >= 80) {
      utilizationClassName = 'meta text-danger';
    } else if (safeUtilization >= 50) {
      utilizationClassName = 'meta text-warning';
    } else {
      utilizationClassName = 'meta text-success';
    }
  }

  return (
    <div className="page dashboard-page">
      {hasCreditLimit && (
        <section className="summary-row">
          <article>
            <p className="label">Global Credit Limit</p>
            <p className="value">{formatCurrency(creditLimit)}</p>
            <p className="meta">Shared across all borrowers and users</p>
          </article>
          <article>
            <p className="label">Remaining Credit</p>
            <p className="value">{formatCurrency(safeRemaining)}</p>
            <p className="meta">
              {safeRemaining < 0 ? 'Over your limit' : 'Available within your limit'}
            </p>
          </article>
          <article>
            <p className="label">Utilization</p>
            <p className="value">{`${safeUtilization.toFixed(0)}%`}</p>
            <p className={utilizationClassName}>
              {safeUtilization >= 80
                ? 'High usage of your limit'
                : safeUtilization >= 50
                  ? 'Moderate usage of your limit'
                  : 'Comfortable usage of your limit'}
            </p>
          </article>
        </section>
      )}

      <section className="summary-row">
        <article>
          <p className="label">Total Due</p>
          <p className="value">{formatCurrency(currentCycleTotal)}</p>
          <p className="meta">Across all plans this cycle</p>
        </article>
        <article>
          <p className="label">BNPL Due</p>
          <p className="value">{formatCurrency(currentCycleBnplTotal)}</p>
          <p className="meta">Single-pay purchases</p>
        </article>
        <article>
          <p className="label">Installments Due</p>
          <p className="value">{formatCurrency(currentCycleInstallmentTotal)}</p>
          <p className="meta">Monthly amortizations</p>
        </article>
      </section>

      <section className="card dashboard-card">
        <header>
          <div>
            <h2>Current Snapshot</h2>
            <p className="meta">{currentCycleTransactions.length} transactions in this cycle</p>
          </div>
        </header>
        <div className="snapshot-grid">
          <article>
            <p className="label">Average Due per Borrower</p>
            <p className="value">
              {formatCurrency(currentCycleTotal / Math.max(borrowers.length, 1))}
            </p>
          </article>
          <article>
            <p className="label">Average Ticket Size</p>
            <p className="value">
              {formatCurrency(
                currentCycleTransactions.length
                  ? currentCycleTotal / currentCycleTransactions.length
                  : 0
              )}
            </p>
          </article>
          <article>
            <p className="label">Highest Borrower Share</p>
            <p className="value">{formatCurrency(borrowerRanking[0]?.due || 0)}</p>
            <p className="meta">{borrowerRanking[0]?.name || '—'}</p>
          </article>
        </div>
      </section>

      <section className="card dashboard-card">
        <header>
          <div>
            <h2>Borrower Highlights</h2>
            <p className="meta">Sorted by total due this cycle</p>
          </div>
        </header>
        <div className="borrower-highlight-grid">
          {borrowerRanking.map((borrower) => (
            <article key={borrower.name} className="borrower-highlight-card">
              <div>
                <p className="borrower-name">{borrower.name}</p>
                <p className="meta">{borrower.count} transactions</p>
              </div>
              <p className="value">{formatCurrency(borrower.due)}</p>
            </article>
          ))}
          {borrowerRanking.length === 0 && <p className="empty-state">No borrowers yet.</p>}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
