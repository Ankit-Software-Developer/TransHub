// frontend/store/useStore.js
import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  activeBranch: { id: null, code: 'ALL', name: 'All Branches' },
  dateFilter: '30d',
  terminology: typeof window !== 'undefined' && localStorage.getItem('transporter_terminology') ? localStorage.getItem('transporter_terminology') : 'Docket',
  isSearchModalOpen: false,
  isFleetCommsOpen: false,
  theme: typeof window !== 'undefined' && localStorage.getItem('transporter_theme') === 'dark' ? 'dark' : 'light', // 'dark' or 'light'

  setUser: (user) => set({
    user,
    terminology: (typeof window !== 'undefined' && localStorage.getItem('transporter_terminology')) || user?.documentTerminology || user?.document_terminology || 'Docket',
  }),

  setActiveBranch: (branch) => set({ activeBranch: branch }),
  setDateFilter: (filter) => set({ dateFilter: filter }),
  setTerminology: (term) => {
    if (typeof window !== 'undefined' && term) {
      try {
        localStorage.setItem('transporter_terminology', term);
      } catch (e) {}
    }
    set({ terminology: term });
  },
  toggleSearchModal: () => set((state) => ({ isSearchModalOpen: !state.isSearchModalOpen })),
  setSearchModalOpen: (open) => set({ isSearchModalOpen: open }),
  toggleFleetComms: () => set((state) => ({ isFleetCommsOpen: !state.isFleetCommsOpen })),
  setFleetCommsOpen: (open) => set({ isFleetCommsOpen: open }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('transporter_theme', theme);
        document.cookie = `transporter_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
          document.documentElement.style.colorScheme = 'light';
        }
      } catch (e) {}
    }
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('transporter_theme', nextTheme);
        document.cookie = `transporter_theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
          document.documentElement.style.colorScheme = 'light';
        }
      } catch (e) {}
    }
    return { theme: nextTheme };
  }),
}));
