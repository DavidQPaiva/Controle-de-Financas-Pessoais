import type { SQLiteDatabase } from 'expo-sqlite';

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

export async function getAllCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT * FROM categories ORDER BY type, name'
  );
}

export async function getCategoriesByType(
  db: SQLiteDatabase,
  type: 'income' | 'expense'
): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE type = ? ORDER BY name',
    [type]
  );
}

export async function createCategory(
  db: SQLiteDatabase,
  category: Omit<Category, 'id'>
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)',
    [category.name, category.type, category.color, category.icon]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: number,
  category: Omit<Category, 'id'>
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET name = ?, type = ?, color = ?, icon = ? WHERE id = ?',
    [category.name, category.type, category.color, category.icon, id]
  );
}

export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}
