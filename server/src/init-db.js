import { readFile } from 'node:fs/promises';
import pool from './db.js';

try {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log('BudgetZen database tables are ready.');
} catch (error) {
  console.error('Could not initialize the database:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
