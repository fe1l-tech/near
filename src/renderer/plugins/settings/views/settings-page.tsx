import { useState, useEffect } from 'react'
import { useUserStore } from '@core/stores'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { GlassCard } from '@components/glass/glass-card'
import { ipc } from '@core/ipc/ipc-client'
import { isElectron } from '@core/platform'
import { APP_VERSION, BUILD_TIME } from '@core/build-info'
import { useI18n, setLanguage } from '@core/i18n'
import { LANGUAGES } from '@core/i18n/language'
import { Trans } from '@core/i18n/trans'
import {
  Key,
  Brain,
  Palette,
  Info,
  Eye,
  EyeOff,
  Save,
  Check,
  ExternalLink,
  Languages,
} from 'lucide-react'
import { cn } from '@lib/utils'

export default function SettingsPage() {
  const { t, language } = useI18n()
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance' | 'about'>('ai')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const {
    deepseekApiKey, setDeepseekApiKey,
    defaultModel, setDefaultModel,
    username, setUsername,
  } = useUserStore()

  // 启动时从 SQLite 加载设置（比 localStorage 更可靠）
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const dbUsername = await ipc.storage.getSetting('username')
        const dbApiKey = await ipc.storage.getSetting('deepseekApiKey')
        const dbModel = await ipc.storage.getSetting('defaultModel')

        if (dbUsername && !username) setUsername(String(dbUsername))
        if (dbApiKey && !deepseekApiKey) setDeepseekApiKey(String(dbApiKey))
        if (dbModel) setDefaultModel(String(dbModel))
      } catch { /* 开发环境降级使用 localStorage */ }
    }
    loadFromDb()
  }, [])

  const handleSave = async () => {
    try {
      // 持久化到 SQLite 数据库
      await Promise.all([
        ipc.storage.setSetting('deepseekApiKey', deepseekApiKey, 'ai'),
        ipc.storage.setSetting('defaultModel', defaultModel, 'ai'),
        ipc.storage.setSetting('username', username, 'general'),
      ])
    } catch { /* 开发环境降级 */ }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { id: 'ai' as const, label: t('settings.tabs.ai'), icon: Brain },
    { id: 'appearance' as const, label: t('settings.tabs.appearance'), icon: Palette },
    { id: 'about' as const, label: t('settings.tabs.about'), icon: Info },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">⚙ {t('settings.title')}</h1>

      {/* Tab 切换 */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all',
              activeTab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* AI 配置 */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <GlassCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">{t('settings.aiConfig')}</h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('settings.apiKey')}</label>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={deepseekApiKey}
                    onChange={(e) => setDeepseekApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10 font-mono"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <Trans
                    k="settings.getKeyAt"
                    link={
                      <a
                        href="https://platform.deepseek.com/api_keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        platform.deepseek.com <ExternalLink className="h-3 w-3" />
                      </a>
                    }
                  />
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('settings.defaultModel')}</label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full rounded-lg border border-border/40 bg-input/50 px-3 py-2 text-sm outline-none focus:border-primary/40"
                >
                  <option value="deepseek-chat">DeepSeek V3 (deepseek-chat)</option>
                  <option value="deepseek-reasoner">DeepSeek R1 (deepseek-reasoner)</option>
                  <option value="deepseek-v4-pro">DeepSeek V4 Pro (deepseek-v4-pro)</option>
                  <option value="deepseek-v4-flash">DeepSeek V4 Flash (deepseek-v4-flash)</option>
                </select>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">{t('settings.usage')}</h2>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {t('settings.keyLocalOnly')}</li>
                <li>• {t('settings.modelChat')}</li>
                <li>• {t('settings.modelReasoner')}</li>
              </ul>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 外观 */}
      {activeTab === 'appearance' && (
        <div className="space-y-4">
          <GlassCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">{t('settings.appearance')}</h2>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('settings.username')}</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('settings.usernamePlaceholder')}
                />
              </div>
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-primary mb-1">{t('settings.sakuraTheme')}</p>
                <p>{t('settings.sakuraThemeBody')}</p>
              </div>
            </div>
          </GlassCard>

          {/* 语言切换：放在设置里作为明确入口，侧栏底部另有一键切换 */}
          <GlassCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">{t('settings.languageSection')}</h2>
              </div>
              <div className="flex gap-2">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLanguage(item.id)}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-3 text-sm transition-colors',
                      language === item.id
                        ? 'border-primary/40 bg-primary/10 font-medium text-primary'
                        : 'border-border/40 text-muted-foreground hover:border-primary/20 hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('common.languageHint')}</p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 关于 */}
      {activeTab === 'about' && (
        <GlassCard>
          <div className="space-y-4 text-center">
            <div className="text-5xl">🌸</div>
            <h2 className="text-xl font-bold text-foreground">near</h2>
            <p className="text-sm text-muted-foreground">
              local-first AI workspace · v{APP_VERSION}
            </p>
            <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
              <p>{t('settings.techStack')}</p>
              <p>{t('settings.aiEngine')}</p>
              <p>{t('settings.storage')}</p>
              <p>{t('settings.uiKit')}</p>
              <p>{isElectron ? t('settings.runtimeDesktop') : t('settings.runtimeBrowser')}</p>
            </div>
            <div className="rounded-xl border border-border/40 p-3 text-xs text-muted-foreground">
              <p>{t('settings.buildTime', { time: BUILD_TIME })}</p>
              <p className="mt-1 text-muted-foreground/70">{t('settings.buildTimeHint')}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 保存按钮（只对 AI 配置有意义，其他标签页隐藏以免误导） */}
      {activeTab === 'ai' && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2" disabled={saved}>
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                {t('common.saved')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('common.saveSettings')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
