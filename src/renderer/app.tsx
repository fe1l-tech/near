import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@theme/providers/theme-provider'
import { router } from '@core/router/routes'
import { t } from '@core/i18n'

export default function App() {
  return (
    <ThemeProvider>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-[#fef5f7]">
            <div className="text-center">
              <div className="mb-4 text-4xl animate-pulse">🌸</div>
              {/* 懒加载页面的兜底。这里在 Suspense 之外，用非 hook 形式的 t() 即可 */}
              <p className="text-sm text-pink-400">{t('boot.loading')}</p>
            </div>
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </ThemeProvider>
  )
}
