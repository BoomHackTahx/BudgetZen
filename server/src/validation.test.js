import test from 'node:test';
import assert from 'node:assert/strict';
import {
  budgetSchema,
  parseMonth,
  passwordChangeSchema,
  profileSchema,
  transactionSchema,
} from './validation.js';

test('accepts a valid expense transaction', () => {
  const result = transactionSchema.safeParse({
    type: 'expense',
    amount: '12500',
    category: 'food',
    note: 'Lunch',
    date: '2026-10-28',
  });
  assert.equal(result.success, true);
});

test('rejects invalid calendar dates and categories for a transaction type', () => {
  assert.equal(transactionSchema.safeParse({
    type: 'expense',
    amount: '12500',
    category: 'food',
    note: '',
    date: '2026-02-31',
  }).success, false);

  assert.equal(transactionSchema.safeParse({
    type: 'expense',
    amount: '12500',
    category: 'salary',
    note: '',
    date: '2026-10-28',
  }).success, false);
});

test('rejects zero amounts, excessive precision, and salary budgets', () => {
  assert.equal(transactionSchema.safeParse({
    type: 'income',
    amount: '0',
    category: 'salary',
    note: '',
    date: '2026-10-28',
  }).success, false);

  assert.equal(transactionSchema.safeParse({
    type: 'income',
    amount: '1.12345',
    category: 'salary',
    note: '',
    date: '2026-10-28',
  }).success, false);

  assert.equal(budgetSchema.safeParse({
    category: 'salary',
    month: '2026-10',
    limitAmount: '1000',
  }).success, false);
});

test('falls back to the current month for malformed query values', () => {
  assert.equal(parseMonth('2026-13'), new Date().toISOString().slice(0, 7));
});

test('validates profile updates and password changes', () => {
  assert.equal(profileSchema.safeParse({
    name: 'Budget User',
    email: 'USER@example.com',
    currentPassword: 'a-long-current-password',
  }).success, true);

  const mismatched = passwordChangeSchema.safeParse({
    currentPassword: 'old-password',
    newPassword: 'a-long-new-password',
    confirmPassword: 'a-different-password',
  });
  assert.equal(mismatched.success, false);
  assert.equal(mismatched.error.issues[0].message, 'Passwords do not match');

  const unchanged = passwordChangeSchema.safeParse({
    currentPassword: 'same-password',
    newPassword: 'same-password',
    confirmPassword: 'same-password',
  });
  assert.equal(unchanged.success, false);
  assert.equal(unchanged.error.issues[0].message, 'New password must differ from current password');

  assert.equal(passwordChangeSchema.safeParse({
    currentPassword: 'old-password',
    newPassword: 'a-long-new-password',
    confirmPassword: 'a-long-new-password',
  }).success, true);
});
