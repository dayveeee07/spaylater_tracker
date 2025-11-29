const DATE_LOCALE = 'en-US';

const formatRangeLabel = (start, end) => {
  const startLabel = start.toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
};

export const getBillingCycle = (orderDateInput) => {
  const date = new Date(orderDateInput);
  const cycleStart = new Date(date);
  if (date.getDate() >= 25) {
    cycleStart.setDate(25);
  } else {
    cycleStart.setMonth(cycleStart.getMonth() - 1);
    cycleStart.setDate(25);
  }
  cycleStart.setHours(0, 0, 0, 0);

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  cycleEnd.setDate(25);
  cycleEnd.setHours(0, 0, 0, 0);

  const dueDate = new Date(cycleEnd);
  dueDate.setMonth(dueDate.getMonth() + 1);
  dueDate.setDate(5);
  dueDate.setHours(0, 0, 0, 0);

  return {
    start: cycleStart,
    end: cycleEnd,
    due: dueDate,
    label: formatRangeLabel(cycleStart, cycleEnd)
  };
};
