import test from 'node:test';
import assert from 'node:assert/strict';

// Financial & Offline Queue Invariant Tests
function computeBalanceDelta(type, amount) {
  if (type === 'credit') return Number(amount);
  if (type === 'debit' || type === 'collection') return -Number(amount);
  return 0;
}

function computeInvoiceTotals(items, gstEnabled, discount = 0) {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const taxAmount = gstEnabled
    ? items.reduce((s, it) => s + (it.quantity * it.unitPrice * it.gstRate) / 100, 0)
    : 0;
  const total = Math.max(0, Math.round((subtotal + taxAmount - discount) * 100) / 100);
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

test('Udhar (credit) increases receivable balance and Jama (debit) decreases it', () => {
  let balance = 0;
  balance += computeBalanceDelta('credit', 1500);
  assert.equal(balance, 1500);
  balance += computeBalanceDelta('debit', 500);
  assert.equal(balance, 1000);
  balance += computeBalanceDelta('collection', 1000);
  assert.equal(balance, 0);
});

test('GST invoice calculations match web billing formula', () => {
  const items = [
    { quantity: 2, unitPrice: 500, gstRate: 18 },
    { quantity: 1, unitPrice: 1000, gstRate: 12 },
  ];
  const gstResult = computeInvoiceTotals(items, true, 100);
  assert.equal(gstResult.subtotal, 2000);
  assert.equal(gstResult.taxAmount, 300);
  assert.equal(gstResult.total, 2200);

  const nonGstResult = computeInvoiceTotals(items, false, 100);
  assert.equal(nonGstResult.taxAmount, 0);
  assert.equal(nonGstResult.total, 1900);
});

test('Offline sync conflict detection flags newer server timestamps instead of blind overwrite', () => {
  const base = '2026-11-25T10:00:00.000Z';
  const newerServer = '2026-11-25T10:05:00.000Z';
  const sameServer = '2026-11-25T10:00:00.000Z';

  assert.equal(detectVersionConflict(base, newerServer), true);
  assert.equal(detectVersionConflict(base, sameServer), false);
  assert.equal(detectVersionConflict(null, newerServer), false);
});
