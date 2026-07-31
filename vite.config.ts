import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
            build: {
                lib: {
                    entry: 'electron/main.ts',
                    formats: ['cjs'],
                    fileName: () => 'main.js'
                },
                rollupOptions: {
                    external: ['electron']
                }
            }
        }
      },
      {
        entry: 'electron/preload.mjs',
        onstart(options) {
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
})
