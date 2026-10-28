import { z } from 'zod';

export const categories = [
  'food',
  'transport',
  'housing',
  'study',
  'health',
  'leisure',
  'salary',
  'other',
];

export const currencies = ['MGA', 'EUR', 'USD', 'GBP', 'CAD', 'CHF', 'JPY', 'AUD', 'NZD', 'XOF', 'XAF', 'INR'];

const amount = z.string().regex(/^\d{1,12}(\.\d{1,4})?$/, 'Invalid amount');
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid month');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid date');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(72),
  currency: z.enum(currencies).default('MGA'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: amount.refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
  category: z.enum(categories),
  note: z.string().trim().max(160).default(''),
  date,
}).refine(
  (transaction) => transaction.type === 'income'
    ? ['salary', 'other'].includes(transaction.category)
    : transaction.category !== 'salary',
  'Category does not match the transaction type',
);

export const budgetSchema = z.object({
  category: z.enum(categories.filter((category) => category !== 'salary')),
  month,
  limitAmount: amount.refine((value) => Number(value) > 0, 'Limit must be greater than zero'),
});

export const settingsSchema = z.object({
  currency: z.enum(currencies),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  currentPassword: z.string().min(1).max(72),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(10).max(72),
  confirmPassword: z.string().min(10).max(72),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
}).refine((value) => value.newPassword !== value.currentPassword, {
  path: ['newPassword'],
  message: 'New password must differ from current password',
});

export function parseMonth(value) {
  const parsed = month.safeParse(value);
  return parsed.success ? parsed.data : new Date().toISOString().slice(0, 7);
}
