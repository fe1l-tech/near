import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean
  /** 命令面板是否打开 */
  commandPaletteOpen: boolean
  /** 当前主题（始终 dark） */
  theme: 'dark'

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      theme: 'dark',

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'ai-workspace-app',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
)
