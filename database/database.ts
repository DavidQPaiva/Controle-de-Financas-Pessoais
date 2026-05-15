import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT NOT NULL DEFAULT '#6B7280',
      icon TEXT NOT NULL DEFAULT 'tag'
    );

    CREATE TABLE IF NOT EXISTS credit_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      last_four_digits TEXT NOT NULL,
      closing_days_before_due INTEGER NOT NULL DEFAULT 7,
      due_day INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'pix', 'debit', 'credit')),
      credit_card_id INTEGER,
      installment_count INTEGER NOT NULL DEFAULT 1,
      current_installment INTEGER NOT NULL DEFAULT 1,
      base_transaction_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id)
    );
  `);

  await seedDefaultCategories(db);
}

async function seedDefaultCategories(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if (result && result.count > 0) return;

  const expenseCategories = [
    { name: 'Alimentação', color: '#f97316', icon: 'restaurant-outline' },
    { name: 'Moradia', color: '#8b5cf6', icon: 'home-outline' },
    { name: 'Transporte', color: '#3b82f6', icon: 'car-outline' },
    { name: 'Educação', color: '#06b6d4', icon: 'school-outline' },
    { name: 'Lazer', color: '#ec4899', icon: 'game-controller-outline' },
    { name: 'Saúde', color: '#ef4444', icon: 'medkit-outline' },
    { name: 'Viagem', color: '#f59e0b', icon: 'airplane-outline' },
    { name: 'Casa e Utilidades', color: '#84cc16', icon: 'basket-outline' },
    { name: 'Assinaturas', color: '#6366f1', icon: 'repeat-outline' },
    { name: 'Beleza e Cuidados', color: '#f43f5e', icon: 'sparkles-outline' },
    { name: 'Vestuário', color: '#14b8a6', icon: 'shirt-outline' },
    { name: 'Mercado', color: '#22c55e', icon: 'cart-outline' },
    { name: 'Outros', color: '#6b7280', icon: 'ellipsis-horizontal-outline' },
  ];

  const incomeCategories = [
    { name: 'Salário', color: '#22c55e', icon: 'cash-outline' },
    { name: 'Freelance', color: '#10b981', icon: 'briefcase-outline' },
    { name: 'Investimentos', color: '#0ea5e9', icon: 'trending-up-outline' },
    { name: 'Outras Receitas', color: '#6b7280', icon: 'add-circle-outline' },
  ];

  for (const cat of expenseCategories) {
    await db.runAsync(
      'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)',
      [cat.name, 'expense', cat.color, cat.icon]
    );
  }
  for (const cat of incomeCategories) {
    await db.runAsync(
      'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)',
      [cat.name, 'income', cat.color, cat.icon]
    );
  }
}
