import { create } from 'zustand';

type AdminSidebarState = {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
  toggle: () => void;
  toggleMobile: () => void;
};

export const useAdminSidebar = create<AdminSidebarState>((set, get) => ({
  collapsed: false,
  mobileOpen: false,
  setCollapsed: (v) => set({ collapsed: v }),
  setMobileOpen: (v) => set({ mobileOpen: v }),
  toggle: () => set({ collapsed: !get().collapsed }),
  toggleMobile: () => set({ mobileOpen: !get().mobileOpen }),
}));

