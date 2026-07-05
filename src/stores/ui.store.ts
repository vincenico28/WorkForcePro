import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  notificationOpen: boolean
  aiAssistantOpen: boolean
  commandOpen: boolean
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
  setNotificationOpen: (v: boolean) => void
  setAiAssistantOpen: (v: boolean) => void
  setCommandOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  notificationOpen: false,
  aiAssistantOpen: false,
  commandOpen: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setNotificationOpen: (v) => set({ notificationOpen: v }),
  setAiAssistantOpen: (v) => set({ aiAssistantOpen: v }),
  setCommandOpen: (v) => set({ commandOpen: v }),
}))
