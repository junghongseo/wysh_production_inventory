import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { WyshProvider } from './WyshContext.jsx';
import { AuthProvider } from './AuthContext.jsx';
import AuthGate from './components/auth/AuthGate.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';
import './mobile.css';

// 로그인 화면에도 저장된 테마를 적용 (App 마운트 전)
document.documentElement.setAttribute('data-theme', localStorage.getItem('wysh-theme') || 'wysh-bw');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <UpdateBanner />
        <AuthGate>
          <WyshProvider>
            <App />
          </WyshProvider>
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register PWA Service Worker (production only)
// In dev, the cache-first service worker would serve stale source modules and break HMR,
// so remove any previously registered worker and its caches instead.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // 새 서비스 워커가 페이지 제어를 넘겨받으면(= 새 버전 배포) 한 번만 새로고침해 새 화면을 띄운다.
    // 처음 설치될 때(이전 제어자 없음)는 새로고침하지 않는다.
    let hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          // 앱을 다시 화면에 띄울 때마다 새 버전이 있는지 확인 (PWA는 오래 켜 둔 채 쓰는 경우가 많음)
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') reg.update().catch(() => {});
          });
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }
}
