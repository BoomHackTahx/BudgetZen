import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import pool from './db.js';
import { clearSessionCookie, requireAuth, setSessionCookie } from './auth.js';
import {
  budgetSchema,
  categories,
  currencies,
  loginSchema,
  parseMonth,
  passwordChangeSchema,
  profileSchema,
  registerSchema,
  settingsSchema,
  transactionSchema,
} from './validation.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a secret of at least 32 characters.');
}

const app = express();
const port = Number(process.env.PORT || 3001);

app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet());
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const asyncRoute = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  currency: row.currency,
});

const asTransaction = (row) => ({
  id: row.id,
  type: row.type,
  amount: row.amount,
  category: row.category,
  note: row.note,
  date: row.transaction_date,
});

app.get('/api/health', (request, response) => response.json({ status: 'ok' }));

app.post('/api/auth/register', authLimiter, asyncRoute(async (request, response) => {
  const input = registerSchema.safeParse(request.body);
  if (!input.success) {
    return response.status(400).json({ error: 'Jereo azafady ny angona nampidirina.' });
  }

  const passwordHash = await bcrypt.hash(input.data.password, 12);
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)',
      [input.data.name, input.data.email, passwordHash, input.data.currency],
    );
    const user = { id: result.insertId, ...input.data };
    setSessionCookie(response, user.id);
    return response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ error: 'Efa misy kaonty mampiasa io mailaka io.' });
    }
    throw error;
  }
}));

app.post('/api/auth/login', authLimiter, asyncRoute(async (request, response) => {
  const input = loginSchema.safeParse(request.body);
  if (!input.success) {
    return response.status(400).json({ error: 'Tsy mety ny mailaka na ny tenimiafina.' });
  }

  const [rows] = await pool.execute(
    'SELECT id, name, email, password_hash, currency FROM users WHERE email = ? LIMIT 1',
    [input.data.email],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(input.data.password, user.password_hash))) {
    return response.status(401).json({ error: 'Tsy mety ny mailaka na ny tenimiafina.' });
  }

  setSessionCookie(response, user.id);
  return response.json({ user: publicUser(user) });
}));

app.post('/api/auth/logout', (request, response) => {
  clearSessionCookie(response);
  response.status(204).end();
});

app.get('/api/auth/me', requireAuth, asyncRoute(async (request, response) => {
  const [rows] = await pool.execute(
    'SELECT id, name, email, currency FROM users WHERE id = ? LIMIT 1',
    [request.userId],
  );
  if (!rows[0]) {
    clearSessionCookie(response);
    return response.status(401).json({ error: 'Tsy hita ny kaonty.' });
  }
  return response.json({ user: publicUser(rows[0]) });
}));

app.patch('/api/profile', requireAuth, asyncRoute(async (request, response) => {
  const input = profileSchema.safeParse(request.body);
  if (!input.success) {
    return response.status(400).json({ error: 'Jereo azafady ny angona nampidirina.' });
  }

  const [rows] = await pool.execute(
    'SELECT password_hash, currency FROM users WHERE id = ? LIMIT 1',
    [request.userId],
  );
  if (!rows[0] || !(await bcrypt.compare(input.data.currentPassword, rows[0].password_hash))) {
    return response.status(401).json({ error: 'Tsy mety ny tenimiafina ankehitriny.' });
  }

  try {
    await pool.execute(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [input.data.name, input.data.email, request.userId],
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ error: 'Efa misy kaonty mampiasa io mailaka io.' });
    }
    throw error;
  }

  return response.json({
    user: {
      id: request.userId,
      name: input.data.name,
      email: input.data.email,
      currency: rows[0].currency,
    },
  });
}));

app.post('/api/auth/change-password', requireAuth, authLimiter, asyncRoute(async (request, response) => {
  const input = passwordChangeSchema.safeParse(request.body);
  if (!input.success) {
    const mismatch = input.error.issues.some((issue) => issue.message === 'Passwords do not match');
    const samePassword = input.error.issues.some((issue) => issue.message === 'New password must differ from current password');
    return response.status(400).json({
      error: mismatch
        ? 'Tsy mitovy ny tenimiafina roa.'
        : samePassword
          ? 'Tsy maintsy hafa amin’ny tenimiafina ankehitriny ny tenimiafina vaovao.'
          : 'Jereo azafady ny angona nampidirina.',
    });
  }

  const [rows] = await pool.execute(
    'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
    [request.userId],
  );
  if (!rows[0] || !(await bcrypt.compare(input.data.currentPassword, rows[0].password_hash))) {
    return response.status(401).json({ error: 'Tsy mety ny tenimiafina ankehitriny.' });
  }

  const passwordHash = await bcrypt.hash(input.data.newPassword, 12);
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [
    passwordHash,
    request.userId,
  ]);
  return response.json({ message: 'Nohavaozina ny tenimiafina.' });
}));

app.patch('/api/settings', requireAuth, asyncRoute(async (request, response) => {
  const input = settingsSchema.safeParse(request.body);
  if (!input.success) {
    return response.status(400).json({ error: 'Tsy tohanana io vola io.' });
  }
  await pool.execute('UPDATE users SET currency = ? WHERE id = ?', [
    input.data.currency,
    request.userId,
  ]);
  return response.json({ currency: input.data.currency });
}));

app.get('/api/dashboard', requireAuth, asyncRoute(async (request, response) => {
  const selectedMonth = parseMonth(request.query.month);
  const [totals] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
     FROM transactions
     WHERE user_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?`,
    [request.userId, selectedMonth],
  );
  const [recent] = await pool.execute(
    `SELECT id, type, amount, category, note, transaction_date
     FROM transactions
     WHERE user_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT 6`,
    [request.userId, selectedMonth],
  );
  const [categoryTotals] = await pool.execute(
    `SELECT category, SUM(amount) AS amount
     FROM transactions
     WHERE user_id = ? AND type = 'expense'
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY category
     ORDER BY amount DESC`,
    [request.userId, selectedMonth],
  );
  const [budgets] = await pool.execute(
    `SELECT b.category, b.limit_amount AS limitAmount,
       COALESCE(SUM(t.amount), 0) AS spent
     FROM budgets b
     LEFT JOIN transactions t
       ON t.user_id = b.user_id
       AND t.category = b.category
       AND t.type = 'expense'
       AND DATE_FORMAT(t.transaction_date, '%Y-%m') = b.budget_month
     WHERE b.user_id = ? AND b.budget_month = ?
     GROUP BY b.id, b.category, b.limit_amount`,
    [request.userId, selectedMonth],
  );

  return response.json({
    month: selectedMonth,
    totals: totals[0],
    recent: recent.map(asTransaction),
    expensesByCategory: categoryTotals,
    budgets,
  });
}));

app.get('/api/transactions', requireAuth, asyncRoute(async (request, response) => {
  const selectedMonth = parseMonth(request.query.month);
  const [rows] = await pool.execute(
    `SELECT id, type, amount, category, note, transaction_date
     FROM transactions
     WHERE user_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     ORDER BY transaction_date DESC, id DESC`,
    [request.userId, selectedMonth],
  );
  return response.json({ transactions: rows.map(asTransaction) });
}));

app.post('/api/transactions', requireAuth, asyncRoute(async (request, response) => {
  const input = transactionSchema.safeParse(request.body);
  if (!input.success) {
    return response.status(400).json({ error: 'Jereo azafady ny angona nampidirina.' });
  }
  const [result] = await pool.execute(
    `INSERT INTO transactions (user_id, type, amount, category, note, transaction_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      request.userId,
      input.data.type,
      input.data.amount,
      input.data.category,
      input.data.note,
      input.data.date,
    ],
  );
  return response.status(201).json({
    transaction: { id: result.insertId, ...input.data },
  });
}));

app.patch('/api/transactions/:id', requireAuth, asyncRoute(async (request, response) => {
  const id = Number(request.params.id);
  const input = transactionSchema.safeParse(request.body);
  if (!Number.isSafeInteger(id) || id < 1 || !input.success) {
    return response.status(400).json({ error: 'Tsy mety ny fanovana nangatahina.' });
  }
  const [result] = await pool.execute(
    `UPDATE transactions
     SET type = ?, amount = ?, category = ?, note = ?, transaction_date = ?
     WHERE id = ? AND user_id = ?`,
    [
      input.data.type,
      input.data.amount,
      input.data.category,
      input.data.note,
      input.data.date,
      id,
      request.userId,
    ],
  );
  if (!result.affectedRows) {
    return response.status(404).json({ error: 'Tsy hita ilay fifanakalozana.' });
  }
  return response.json({ transaction: { id, ...input.data } });
}));

app.delete('/api/transactions/:id', requireAuth, asyncRoute(async (request, response) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return response.status(400).json({ error: 'Tsy mety ny laharana.' });
  }
  const [result] = await pool.execute(
    'DELETE FROM transactions WHERE id = ? AND user_id = ?',
    [id, request.userId],
  );
  if (!result.affectedRows) {
    return response.status(404).json({ error: 'Tsy hita ilay fifanakalozana.' });
  }
  return response.status(204).end();
}));

app.put('/api/budgets', requireAuth, asyncRoute(async (request, response) => {
  const input = budgetSchema.safeParse(request.body);
  if (!input.success) {
    return response.status(400).json({ error: 'Jereo azafady ny teti-bola nampidirina.' });
  }
  await pool.execute(
    `INSERT INTO budgets (user_id, category, budget_month, limit_amount)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount)`,
    [request.userId, input.data.category, input.data.month, input.data.limitAmount],
  );
  return response.json({ budget: input.data });
}));

app.delete('/api/budgets/:category/:month', requireAuth, asyncRoute(async (request, response) => {
  if (!categories.includes(request.params.category) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(request.params.month)) {
    return response.status(400).json({ error: 'Tsy mety ny teti-bola nangatahina.' });
  }
  const [result] = await pool.execute(
    'DELETE FROM budgets WHERE user_id = ? AND category = ? AND budget_month = ?',
    [request.userId, request.params.category, request.params.month],
  );
  if (!result.affectedRows) {
    return response.status(404).json({ error: 'Tsy hita ilay teti-bola.' });
  }
  return response.status(204).end();
}));

app.get('/api/demo', (request, response) => {
  const selectedMonth = parseMonth(request.query.month);
  const sampleTransactions = [
    { id: 1, type: 'income', amount: '320000.0000', category: 'salary', note: 'Volan-kely isam-bolana', date: `${selectedMonth}-02` },
    { id: 2, type: 'expense', amount: '68000.0000', category: 'food', note: 'Tsena sy sakafo', date: `${selectedMonth}-04` },
    { id: 3, type: 'expense', amount: '24000.0000', category: 'transport', note: 'Saran-dalana', date: `${selectedMonth}-06` },
    { id: 4, type: 'expense', amount: '45000.0000', category: 'study', note: 'Boky sy fitaovana', date: `${selectedMonth}-09` },
    { id: 5, type: 'expense', amount: '32000.0000', category: 'leisure', note: 'Fialam-boly', date: `${selectedMonth}-12` },
    { id: 6, type: 'income', amount: '50000.0000', category: 'other', note: 'Asa fanampiny', date: `${selectedMonth}-15` },
  ];
  return response.json({
    month: selectedMonth,
    totals: { income: '370000.0000', expenses: '169000.0000' },
    recent: sampleTransactions.slice().reverse(),
    expensesByCategory: [
      { category: 'food', amount: '68000.0000' },
      { category: 'study', amount: '45000.0000' },
      { category: 'leisure', amount: '32000.0000' },
      { category: 'transport', amount: '24000.0000' },
    ],
    budgets: [
      { category: 'food', limitAmount: '100000.0000', spent: '68000.0000' },
      { category: 'transport', limitAmount: '50000.0000', spent: '24000.0000' },
      { category: 'study', limitAmount: '60000.0000', spent: '45000.0000' },
    ],
    transactions: sampleTransactions.slice().reverse(),
    user: { name: 'Demo', currency: 'MGA' },
  });
});

app.use('/api', (request, response) => {
  response.status(404).json({ error: 'Tsy hita ilay lalana nangatahina.' });
});

app.use((error, request, response, next) => {
  console.error(error);
  if (response.headersSent) {
    return next(error);
  }
  return response.status(500).json({ error: 'Nisy olana teo amin’ny mpizara. Andramo indray afaka kelikely.' });
});

const server = app.listen(port, () => {
  console.log(`BudgetZen API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
