import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/database/schema.ts',
  out: './src/main/database/migrations',
  dbCredentials: {
    url: './data.db',
  },
})
