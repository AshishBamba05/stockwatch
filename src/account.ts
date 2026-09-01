import { db } from './db';

// Must match db/schema.sql's account_balances.cash_balance DEFAULT
export const STARTING_BALANCE = 10000;

export async function ensureBalance(sessionId: string) {
  await db.query(
    'INSERT INTO account_balances(session_id) VALUES($1) ON CONFLICT DO NOTHING',
    [sessionId]
  );
}

export async function getBalance(sessionId: string) {
  await ensureBalance(sessionId);
  const r = await db.query(
    'SELECT cash_balance::float8 AS cash_balance FROM account_balances WHERE session_id=$1',
    [sessionId]
  );
  return r.rows[0].cash_balance as number;
}

export async function deductBalance(sessionId: string, amount: number) {
  await ensureBalance(sessionId);
  const r = await db.query(
    `UPDATE account_balances
     SET cash_balance = cash_balance - $2
     WHERE session_id = $1 AND cash_balance >= $2
     RETURNING cash_balance::float8 AS cash_balance`,
    [sessionId, amount]
  );
  return r.rows[0]?.cash_balance as number | undefined;
}

export async function creditBalance(sessionId: string, amount: number) {
  await ensureBalance(sessionId);
  const r = await db.query(
    `UPDATE account_balances
     SET cash_balance = cash_balance + $2
     WHERE session_id = $1
     RETURNING cash_balance::float8 AS cash_balance`,
    [sessionId, amount]
  );
  return r.rows[0].cash_balance as number;
}
