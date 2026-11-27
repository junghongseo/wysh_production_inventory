import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// 앱 버전 = package.json 버전 + 빌드 시각. 팀원 관리 화면에서 기기별로 새 버전인지 확인하는 데 쓴다.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const buildStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
const appVersion = `${pkg.version}+${buildStamp}`;

// 빌드 결과에 /version.json 을 함께 내보낸다. 켜 둔 앱이 이 파일을 주기적으로 확인해 새 배포를 알아차린다.
const versionFilePlugin = () => ({
  name: 'wysh-version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: appVersion }) });
  }
});

export default defineConfig({
  plugins: [react(), versionFilePlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
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
