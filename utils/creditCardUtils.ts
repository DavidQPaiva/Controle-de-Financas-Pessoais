import { addMonths, setDate, isBefore, isSameDay, subDays  } from 'date-fns';
import type { CreditCard } from '../database/creditCards';

export function getInvoiceDueDate(purchaseDate: Date, dueDay: number, closingDaysBeforeDue: number): Date {
  let currentMonthDue = setDate(purchaseDate, dueDay);
  let closingDate = subDays(currentMonthDue, closingDaysBeforeDue);

  if (isBefore(purchaseDate, closingDate) || isSameDay(purchaseDate, closingDate)) {
    return currentMonthDue;
  } else {
    return addMonths(currentMonthDue, 1);
  }
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDatePtBr(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function parseAmountInput(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}
