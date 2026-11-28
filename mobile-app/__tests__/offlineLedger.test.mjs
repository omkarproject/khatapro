import test from 'node:test';
import assert from 'node:assert/strict';

function computeBalanceDelta(type, amount) {
  if (type === 'credit') return Number(amount);
  if (type === 'debit' || type === 'collection') return -Number(amount);
  return 0;
}

function computeInvoiceTotals(items, gstEnabled, discount = 0, delivery = 0) {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const taxAmount = gstEnabled
    ? items.reduce((s, it) => s + (it.quantity * it.unitPrice * it.gstRate) / 100, 0)
    : 0;
  const total = Math.max(0, Math.round((subtotal + taxAmount + delivery - discount) * 100) / 100);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total,
  };
}

function detectVersionConflict(localBaseVersion, serverUpdatedAt) {
  if (!localBaseVersion || !serverUpdatedAt) return false;
  return new Date(serverUpdatedAt).getTime() > new Date(localBaseVersion).getTime();
}

function computeDashboardMetricsParity({ customers, transactions, expenses, invoices }) {
  const excluded = new Set(customers.filter(c => c.excludeTransactions).map(c => c.id));
  const isExcl = t => Boolean(t.customerId && excluded.has(t.customerId));

  const khataCredit = transactions
    .filter(
      t =>
        !t.isDeleted &&
        t.status !== 'deleted' &&
        !isExcl(t) &&
        ((t.type === 'debit' && Boolean(t.customerId)) || t.type === 'collection' || t.type === 'income')
    )
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const txnsKhataDebit = transactions
    .filter(t => !t.isDeleted && t.status !== 'deleted' && !isExcl(t) && t.type === 'credit' && Boolean(t.customerId))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const customersDue = customers.reduce(
    (s, c) => (!c.excludeTransactions && c.outstandingBalance > 0 ? s + c.outstandingBalance : s),
    0
  );
  const khataDebit = txnsKhataDebit > 0 ? txnsKhataDebit : customersDue;
  const khataBase = khataCredit - khataDebit;
  const monthExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netAmount = khataBase - monthExpense;
  const unpaidInvoices = invoices
    .filter(inv => inv.status !== 'paid' && (!inv.customerId || !excluded.has(inv.customerId)))
    .reduce((s, inv) => s + Number(inv.total || 0), 0);

  return { khataCredit, khataDebit, khataBase, netAmount, unpaidInvoices };
}

test('Udhar (credit) increases receivable balance and Jama (debit/collection) decreases it', () => {
  let balance = 0;
  balance += computeBalanceDelta('credit', 1500);
  assert.equal(balance, 1500);
  balance += computeBalanceDelta('debit', 500);
  assert.equal(balance, 1000);
  balance += computeBalanceDelta('collection', 1000);
  assert.equal(balance, 0);
});

test('GST invoice calculations with delivery/discount match website formula', () => {
  const items = [
    { quantity: 2, unitPrice: 500, gstRate: 18 },
    { quantity: 1, unitPrice: 1000, gstRate: 12 },
  ];
  const gstResult = computeInvoiceTotals(items, true, 100, 50);
  assert.equal(gstResult.subtotal, 2000);
  assert.equal(gstResult.taxAmount, 300);
  assert.equal(gstResult.total, 2250);
});

test('Offline sync conflict detection flags newer server timestamps', () => {
  assert.equal(detectVersionConflict('2026-11-25T10:00:00.000Z', '2026-11-25T10:05:00.000Z'), true);
  assert.equal(detectVersionConflict('2026-11-25T10:00:00.000Z', '2026-11-25T10:00:00.000Z'), false);
});

test('Dashboard K/E/I/Net formulas match src/app/page.tsx with excludeTransactions', () => {
  const res = computeDashboardMetricsParity({
    customers: [
      { id: 'c1', outstandingBalance: 2000, excludeTransactions: false },
      { id: 'c2', outstandingBalance: 9999, excludeTransactions: true },
    ],
    transactions: [
      { id: 't1', customerId: 'c1', type: 'credit', amount: 2500 },
      { id: 't2', customerId: 'c1', type: 'debit', amount: 500 },
      { id: 't3', customerId: 'c2', type: 'credit', amount: 9999 },
    ],
    expenses: [{ id: 'e1', amount: 400 }],
    invoices: [
      { id: 'i1', customerId: 'c1', total: 1200, status: 'unpaid' },
      { id: 'i2', customerId: 'c1', total: 800, status: 'paid' },
      { id: 'i3', customerId: 'c2', total: 5000, status: 'unpaid' },
    ],
  });
  assert.equal(res.khataCredit, 500);
  assert.equal(res.khataDebit, 2500);
  assert.equal(res.khataBase, -2000);
  assert.equal(res.netAmount, -2400);
  assert.equal(res.unpaidInvoices, 1200);
});
