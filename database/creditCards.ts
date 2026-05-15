import type { SQLiteDatabase } from 'expo-sqlite';

export interface CreditCard {
  id: number;
  nickname: string;
  last_four_digits: string;
  closing_days_before_due: number;
  due_day: number;
}

export async function getAllCreditCards(db: SQLiteDatabase): Promise<CreditCard[]> {
  return db.getAllAsync<CreditCard>(
    'SELECT * FROM credit_cards ORDER BY nickname'
  );
}

export async function createCreditCard(
  db: SQLiteDatabase,
  card: Omit<CreditCard, 'id'>
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO credit_cards (nickname, last_four_digits, closing_days_before_due, due_day) VALUES (?, ?, ?, ?)',
    [card.nickname, card.last_four_digits, card.closing_days_before_due, card.due_day]
  );
  return result.lastInsertRowId;
}

export async function updateCreditCard(
  db: SQLiteDatabase,
  id: number,
  card: Omit<CreditCard, 'id'>
): Promise<void> {
  await db.runAsync(
    'UPDATE credit_cards SET nickname = ?, last_four_digits = ?, closing_days_before_due = ?, due_day = ? WHERE id = ?',
    [card.nickname, card.last_four_digits, card.closing_days_before_due, card.due_day, id]
  );
}

export async function deleteCreditCard(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM credit_cards WHERE id = ?', [id]);
}