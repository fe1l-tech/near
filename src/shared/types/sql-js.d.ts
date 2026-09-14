declare module 'sql.js' {
  /**
   * sql.js 的初始化配置。
   * - `locateFile`：交给 emscripten 自行按 URL 加载 wasm；
   * - `wasmBinary`：直接传入 wasm 二进制，跳过 URL 解析。
   *   浏览器端用后者，因为 URL 解析出错时 emscripten 只会抛出难以定位的
   *   「expected magic word」（实际拿到了 index.html）。
   */
  interface SqlJsConfig {
    locateFile?: (url: string) => string
    wasmBinary?: ArrayBuffer | Uint8Array
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayBuffer | Uint8Array | null) => Database
    (config?: SqlJsConfig): Promise<SqlJsStatic>
  }

  interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
    prepare(sql: string, params?: unknown[]): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
  }

  interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): boolean
  }

  const initSqlJs: SqlJsStatic
  export default initSqlJs
}
