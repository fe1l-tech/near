declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayBuffer) => Database
    (config?: { locateFile?: (url: string) => string }): Promise<SqlJsStatic>
  }

  interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
    prepare(sql: string): Statement
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
