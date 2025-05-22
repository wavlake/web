import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrencyDisplayStore {
  showSats: boolean;
  setShowSats: (showSats: boolean) => void;
  toggleCurrency: () => void;
}

export const useCurrencyDisplayStore = create<CurrencyDisplayStore>()(
  persist(
    (set) => ({
      showSats: false, // Default to USD
      setShowSats: (showSats) => set({ showSats }),
      toggleCurrency: () => set((state) => ({ showSats: !state.showSats })),
    }),
    {
      name: 'currency-display-preference',
    }
  )
);