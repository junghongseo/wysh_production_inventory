import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// 앱 버전 = package.json 버전 + 빌드 시각. 팀원 관리 화면에서 기기별로 새 버전인지 확인하는 데 쓴다.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const buildStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${buildStamp}`)
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-excel': ['xlsx'],
          'vendor-canvas': ['html2canvas']
        }
      }
    }
  }
});
