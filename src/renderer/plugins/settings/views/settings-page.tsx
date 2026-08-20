import { useState, useEffect } from 'react'
import { useUserStore } from '@core/stores'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { GlassCard } from '@components/glass/glass-card'
import { ipc } from '@core/ipc/ipc-client'
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
} from 'lucide-react'
import { cn } from '@lib/utils'

export default function SettingsPage() {
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
    { id: 'ai' as const, label: 'AI 配置', icon: Brain },
    { id: 'appearance' as const, label: '外观', icon: Palette },
    { id: 'about' as const, label: '关于', icon: Info },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">⚙ 设置</h1>

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
                <h2 className="font-semibold text-foreground">API 配置</h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">DeepSeek API Key</label>
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
                  在{' '}
                  <a
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    platform.deepseek.com <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  获取 API Key
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">默认模型</label>
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
                <h2 className="font-semibold text-foreground">使用说明</h2>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• API Key 仅存储在你的本地设备上，不会上传到任何服务器</li>
                <li>• DeepSeek V3：通用对话，速度快，成本低</li>
                <li>• DeepSeek R1：深度推理，会展示思考过程</li>
              </ul>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 外观 */}
      {activeTab === 'appearance' && (
        <GlassCard>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">外观设置</h2>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">用户名</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入你的名字"
              />
            </div>
            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-primary mb-1">🌸 樱花主题</p>
              <p>当前使用 Sakura Dream 暗色主题。更多主题选项将在后续版本中添加。</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 关于 */}
      {activeTab === 'about' && (
        <GlassCard>
          <div className="space-y-4 text-center">
            <div className="text-5xl">🌸</div>
            <h2 className="text-xl font-bold text-foreground">小零</h2>
            <p className="text-sm text-muted-foreground">Sakura Dream · v0.1.0</p>
            <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
              <p>🚀 技术栈：React 19 + TypeScript + Tailwind CSS 4</p>
              <p>🤖 AI 引擎：DeepSeek API</p>
              <p>💾 数据存储：SQLite (sql.js)</p>
              <p>🎨 UI 组件：shadcn/ui + Radix UI</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2" disabled={saved}>
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              已保存
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
