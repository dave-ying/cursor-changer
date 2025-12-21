import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tauri-apps/api/updater': path.resolve(__dirname, 'test/mocks/tauri-updater.ts'),
      '@tauri-apps/api/app': path.resolve(__dirname, 'test/mocks/tauri-app.ts')
    }
  },

  server: {
    fs: {
      allow: ['..']
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    setupFiles: ['./test/setup.ts'],
    include: [
      'test/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/*.d.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'clover'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'coverage/**',
        'test/**',
        'src/types/generated/**',
        'src/diagnostics/**',
        'src/main.tsx',
        'src/**/*.test.*',
        'src/**/*.spec.*',

        // UI wrappers / boilerplate components (meaningful-coverage mode)
        'src/components/ui/**',
        'src/components/Settings/**',
        'src/components/Settings.tsx',
        'src/components/Titlebar.tsx',
        'src/components/Sidebar.tsx',
        'src/components/WindowControlsBar.tsx',

        // Animation-only helpers/constants (meaningful-coverage mode)
        'src/constants/animationConstants.ts',
        'src/hooks/useLibraryAnimation.ts',
        'src/utils/logger.ts',

        // CursorCustomization view components (keep hooks + core logic covered separately)
        'src/components/CursorCustomization/ActiveCursor.tsx',
        'src/components/CursorCustomization/ActiveCursorContextMenu.tsx',
        'src/components/CursorCustomization/ActiveSection.tsx',
        'src/components/CursorCustomization/ClickOutsideHandler.tsx',
        'src/components/CursorCustomization/ContentArea.tsx',
        'src/components/CursorCustomization/ContextMenu.tsx',
        'src/components/CursorCustomization/DragDropContext.tsx',
        'src/components/CursorCustomization/LibraryCursor.tsx',
        'src/components/CursorCustomization/LibrarySection.tsx',
        'src/components/CursorCustomization/MainLayout.tsx',
        'src/components/CursorCustomization/ModeToggle.tsx',
        'src/components/CursorCustomization/Navigation.tsx',
        'src/components/CursorCustomization/SettingsModal.tsx',

        // HotspotPicker view components (keep logic hooks covered separately)
        'src/components/HotspotPicker/ImageCanvas.tsx',
        'src/components/HotspotPicker/ImageControls.tsx',
        'src/components/HotspotPicker/HotspotControls.tsx',
        '**/*.config.js',
        '**/*.config.cjs',
        '**/*.d.ts',
        'lib/tauri-bootstrap.js'
      ],
      include: [
        'src/**/*.{js,jsx,ts,tsx}'
      ]
    },
    // Add TypeScript specific configuration
    transformMode: {
      web: [/.[tj]sx?$/]
    },
    // Ensure TypeScript files are properly processed
    deps: {
      inline: ['vitest']
    }
  },
  // Add esbuild configuration for TypeScript
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
    jsxInject: `import React from 'react'`
  }
})