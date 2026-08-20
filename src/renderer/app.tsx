import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@theme/providers/theme-provider'
import { router } from '@core/router/routes'

export default function App() {
  return (
    <ThemeProvider>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-[#fef5f7]">
            <div className="text-center">
              <div className="mb-4 text-4xl animate-pulse">🌸</div>
              <p className="text-sm text-pink-400">加载中...</p>
            </div>
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </ThemeProvider>
  )
}
