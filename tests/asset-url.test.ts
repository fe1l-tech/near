/**
 * 资源路径解析测试
 *
 * 为什么值得单独测：sql.js 的 wasm 是**运行时**按 URL 加载的，Vite 改写不了，
 * 只能由我们拼。拼错的后果极不直观 —— 静态服务器把不存在的路径回退成
 * index.html，于是浏览器报 WebAssembly 的 "expected magic word"（拿到了 `<!do`），
 * 看上去像 wasm 文件损坏，实际是路径多了或少了斜杠。
 *
 * 这里钉住两个具体形态：
 * - 部署在仓库子路径（GitHub Pages 的 /<repo>/）时必须拼成 /near/sql-wasm.wasm
 * - 绝不能拼出 /near/near/... 这种把子路径重复一次的地址
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/** 以指定基础路径重新加载模块（assetUrl 依赖构建期注入的常量） */
async function loadWithBase(base: string | undefined) {
  vi.resetModules()
  if (base === undefined) {
    Reflect.deleteProperty(globalThis, '__APP_BASE__')
  } else {
    Reflect.set(globalThis, '__APP_BASE__', base)
  }
  return import('@core/build-info')
}

describe('assetUrl — 部署基础路径拼接', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__APP_BASE__')
  })

  it('根路径部署：资源指向 / 下', async () => {
    const { assetUrl } = await loadWithBase('/')
    expect(assetUrl('sql-wasm.wasm')).toBe('/sql-wasm.wasm')
  })

  it('仓库子路径部署：资源指向 /near/ 下', async () => {
    const { assetUrl } = await loadWithBase('/near/')
    expect(assetUrl('sql-wasm.wasm')).toBe('/near/sql-wasm.wasm')
  })

  it('基础路径缺少结尾斜杠时自动补上，不产生 //', async () => {
    const { assetUrl } = await loadWithBase('/near')
    expect(assetUrl('sql-wasm.wasm')).toBe('/near/sql-wasm.wasm')
  })

  it('回归：绝不把子路径重复拼接（曾经拼出 /near/near/sql-wasm.wasm）', async () => {
    const { assetUrl } = await loadWithBase('/near/')
    const url = assetUrl('sql-wasm.wasm')
    expect(url).not.toMatch(/near\/near/)
    // 路径中不应出现连续斜杠
    expect(url).not.toMatch(/\/\//)
  })

  it('未注入构建常量时（测试等场景）回退到根路径', async () => {
    const { assetUrl, APP_BASE } = await loadWithBase(undefined)
    expect(APP_BASE).toBe('/')
    expect(assetUrl('sql-wasm.wasm')).toBe('/sql-wasm.wasm')
  })
})
