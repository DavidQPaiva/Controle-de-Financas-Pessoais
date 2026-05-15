import { create } from 'zustand';

interface FinanceState {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  selectedMonth: new Date(),

  setSelectedMonth: (date) => set({ selectedMonth: date }),

  goToPreviousMonth: () => {
    const { selectedMonth } = get();
    set({
      selectedMonth: new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() - 1,
        1
      ),
    });
  },

  goToNextMonth: () => {
    const { selectedMonth } = get();
    set({
      selectedMonth: new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() + 1,
        1
      ),
    });
  },
}));
