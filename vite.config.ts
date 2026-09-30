/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // 並行作業用の worktree（.claude/worktrees）のテストは対象外
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
