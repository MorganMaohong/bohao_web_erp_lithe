import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import svgLoader from 'vite-svg-loader'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      vueJsx(),
      tailwindcss(),
      svgLoader({ defaultImport: 'url' }),
      createSvgIconsPlugin({
        iconDirs: [path.resolve(process.cwd(), 'src/icons/svg')],
        symbolId: 'icon-[dir]-[name]',
      }),
    ],
    base: env.VITE_PUBLIC_PATH || '/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3336,
      host: true,
      proxy: {
        [env.VITE_BASE_API || '/api']: {
          target: env.VITE_BASE_URL || env.VITE_SITE_BASE_API,
          changeOrigin: true,
          ws: true,
          rewrite: (requestPath) =>
            requestPath.replace(new RegExp(`^${env.VITE_BASE_API || '/api'}`), ''),
        },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'echarts',
                test: /\/echarts/,
              },
              {
                name: 'chroma-js',
                test: /\/chroma-js/,
              },
              {
                name: 'es-toolkit',
                test: /\/es-toolkit/,
              },
              {
                name: 'naive-ui',
                test: /\/naive-ui/,
              },
              {
                name: 'dnd-kit',
                test: /\/@dnd-kit\/vue/,
              },
              {
                name: 'vueuse',
                test: /\/vueuse/,
              },
              {
                name: 'vue-router',
                test: /\/vue-router/,
              },
              {
                name: 'pinia',
                test: /\/pinia/,
              },
              {
                name: 'axios',
                test: /\/axios/,
              },
              {
                name: 'vue',
                test: /\/vue/,
              },
            ],
          },

          assetFileNames: (asset) => {
            const notHash = ['topography.svg', 'texture.png', 'noise.png']
            if (asset.names?.some((name) => notHash.includes(name))) {
              return 'assets/[name][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },

          minify: {
            compress: {
              dropConsole: true,
              dropDebugger: true,
            },
          },
        },
      },
    },
  }
})
