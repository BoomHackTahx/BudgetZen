import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoData } from './demoData.js';

test('creates fictional demo data for the selected month', () => {
  const demo = createDemoData('2026-10');

  assert.equal(demo.month, '2026-10');
  assert.equal(demo.user.name, 'Demo');
  assert.equal(demo.user.currency, 'MGA');
  assert.equal(demo.totals.income, '370000.0000');
  assert.equal(demo.totals.expenses, '169000.0000');
  assert.equal(demo.transactions.length, 6);
  assert.equal(demo.transactions[0].date, '2026-10-15');
  assert.equal(demo.transactions.at(-1).date, '2026-10-02');
  assert.equal(demo.budgets.length, 3);
  assert.equal(demo.expensesByCategory.length, 4);
});
