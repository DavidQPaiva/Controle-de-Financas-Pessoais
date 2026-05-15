import type { SQLiteDatabase } from 'expo-sqlite';

export interface Transaction {
  id: number;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  category_id: number;
  payment_method: 'cash' | 'pix' | 'debit' | 'credit';
  credit_card_id: number | null;
  installment_count: number;
  current_installment: number;
  base_transaction_id: number | null;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string;
  category_color: string;
  category_icon: string;
}

export async function getTransactionsByMonth(
  db: SQLiteDatabase,
  year: number,
  month: number
): Promise<TransactionWithCategory[]> {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const start = `${y}-${m}-01`;
  const end = `${y}-${m}-31`;
  return db.getAllAsync<TransactionWithCategory>(
    `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.date >= ? AND t.date <= ?
     ORDER BY t.date DESC`,
    [start, end]
  );
}

export async function createTransaction(
  db: SQLiteDatabase,
  tx: Omit<Transaction, 'id'>
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO transactions
      (title, type, amount, date, category_id, payment_method,
       credit_card_id, installment_count, current_installment, base_transaction_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.title,
      tx.type,
      tx.amount,
      tx.date,
      tx.category_id,
      tx.payment_method,
      tx.credit_card_id ?? null,
      tx.installment_count,
      tx.current_installment,
      tx.base_transaction_id ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function deleteTransaction(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function deleteTransactionGroup(
  db: SQLiteDatabase,
  baseTransactionId: number
): Promise<void> {
  await db.runAsync(
    'DELETE FROM transactions WHERE base_transaction_id = ? OR id = ?',
    [baseTransactionId, baseTransactionId]
  );
}
