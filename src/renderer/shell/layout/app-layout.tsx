import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Titlebar } from './titlebar'
import { CommandPalette } from '../command-palette/command-palette'
import { SakuraPetals } from '@components/display/sakura-petals'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* 飘落樱花瓣背景 */}
      <SakuraPetals />

      {/* 标题栏 */}
      <Titlebar />

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 主内容区 */}
        <main className="relative flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 命令面板 (Ctrl+K) */}
      <CommandPalette />
    </div>
  )
}
