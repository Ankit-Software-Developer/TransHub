// frontend/store/useStore.js
import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  activeBranch: { id: null, code: 'ALL', name: 'All Branches' },
  dateFilter: '30d',
  terminology: typeof window !== 'undefined' && localStorage.getItem('transporter_terminology') ? localStorage.getItem('transporter_terminology') : 'Bilty',
  isSearchModalOpen: false,
  isFleetCommsOpen: false,
  isMobileSidebarOpen: false,
  theme: typeof window !== 'undefined' && localStorage.getItem('transporter_theme') === 'dark' ? 'dark' : 'light', // 'dark' or 'light'

  setUser: (user) => {
    const enrichedUser = user ? {
      ...user,
      transporterType: user.transporterType || user.transporter_type || user.organization?.settings?.transporterType || user.organization?.settings?.transporter_type || 'FTL',
      transporterSubType: user.transporterSubType !== undefined
        ? user.transporterSubType
        : (user.transporter_sub_type !== undefined
            ? user.transporter_sub_type
            : (user.organization?.settings?.transporterSubType || user.organization?.settings?.transporter_subtype || ((user?.subscription?.planCode === 'BASIC' || user?.organization?.settings?.registered_plan === 'BASIC') ? 'FLEET_SUPPLIER' : undefined))),
      organization: user.organization ? {
        ...user.organization,
        settings: {
          ...(user.organization.settings || {}),
          transporterType: user.transporterType || user.transporter_type || user.organization?.settings?.transporterType || 'FTL',
          transporterSubType: user.transporterSubType !== undefined
            ? user.transporterSubType
            : (user.organization?.settings?.transporterSubType || ((user?.subscription?.planCode === 'BASIC' || user?.organization?.settings?.registered_plan === 'BASIC') ? 'FLEET_SUPPLIER' : undefined)),
        },
      } : user.organization,
    } : user;

    if (typeof window !== 'undefined' && enrichedUser) {
      try {
        localStorage.setItem('transporter_user', JSON.stringify(enrichedUser));
      } catch (e) {}
    }

    return set({
      user: enrichedUser,
      terminology: (typeof window !== 'undefined' && localStorage.getItem('transporter_terminology')) || user?.documentTerminology || user?.document_terminology || 'Bilty',
    });
  },

  setTransporterType: (transporterType, transporterSubType) => set((state) => {
    if (
      state.user &&
      state.user.transporterType === transporterType &&
      state.user.transporterSubType === transporterSubType
    ) {
      return state;
    }
    const updatedUser = state.user ? {
      ...state.user,
      transporterType,
      transporter_type: transporterType,
      transporterSubType: transporterSubType !== undefined ? transporterSubType : state.user.transporterSubType,
      transporter_sub_type: transporterSubType !== undefined ? transporterSubType : state.user.transporter_sub_type,
      organization: state.user.organization ? {
        ...state.user.organization,
        settings: {
          ...(state.user.organization.settings || {}),
          transporterType,
          transporter_type: transporterType,
          transporterSubType: transporterSubType !== undefined ? transporterSubType : state.user.organization?.settings?.transporterSubType,
          transporter_subtype: transporterSubType !== undefined ? transporterSubType : state.user.organization?.settings?.transporter_subtype,
        },
      } : state.user.organization,
    } : state.user;

    if (typeof window !== 'undefined' && updatedUser) {
      try {
        localStorage.setItem('transporter_user', JSON.stringify(updatedUser));
      } catch (e) {}
    }

    return { user: updatedUser };
  }),

  setActiveBranch: (branch) => set({ activeBranch: branch }),
  setDateFilter: (filter) => set({ dateFilter: filter }),
  setTerminology: (term) => {
    if (typeof window !== 'undefined' && term) {
      try {
        localStorage.setItem('transporter_terminology', term);
      } catch (e) {}
    }
    set((state) => {
      if (state.terminology === term) return state;
      return { terminology: term };
    });
  },
  toggleSearchModal: () => set((state) => ({ isSearchModalOpen: !state.isSearchModalOpen })),
  setSearchModalOpen: (open) => set({ isSearchModalOpen: open }),
  toggleFleetComms: () => set((state) => ({ isFleetCommsOpen: !state.isFleetCommsOpen })),
  setFleetCommsOpen: (open) => set({ isFleetCommsOpen: open }),
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
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
