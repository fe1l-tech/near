import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  /** 用户名 */
  username: string
  /** DeepSeek API Key */
  deepseekApiKey: string
  /** 默认模型 */
  defaultModel: string
  /** 是否已配置 API Key */
  isConfigured: boolean

  setUsername: (name: string) => void
  setDeepseekApiKey: (key: string) => void
  setDefaultModel: (model: string) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      username: '',
      deepseekApiKey: '',
      defaultModel: 'deepseek-v4-pro',
      isConfigured: false,

      setUsername: (username) => set({ username }),
      setDeepseekApiKey: (key) => {
        set({ deepseekApiKey: key, isConfigured: key.length > 0 })
      },
      setDefaultModel: (defaultModel) => set({ defaultModel }),
    }),
    {
      name: 'ai-workspace-user',
      partialize: (state) => ({
        username: state.username,
        deepseekApiKey: state.deepseekApiKey,
        defaultModel: state.defaultModel,
        isConfigured: state.isConfigured,
      }),
    },
  ),
)
