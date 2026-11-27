import React, { useCallback, useEffect, useRef, useState } from 'react';
import { APP_VERSION } from '../AuthContext.jsx';
import { flushPendingPushes } from '../services/pushTracker.js';

// 켜 둔 앱이 새 배포를 알아차리게 한다.
// - 5분마다, 그리고 앱을 다시 화면에 띄울 때 /version.json 을 확인한다.
// - 새 버전이 있으면 화면 위에 안내 막대를 띄운다.
// - 앱을 다시 띄웠을 때 입력 중인 창(모달·입력칸)이 없으면 바로 새로고침한다.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

const fetchServerVersion = async () => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
};

// 사용자가 무언가 입력하거나 창을 열어 둔 상태면 자동 새로고침하지 않는다
const isUserBusy = () => {
  const active = document.activeElement;
  if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return true;
  if (active && active.isContentEditable) return true;
  return !!document.querySelector('.modal-overlay.open, .drawer-overlay.open');
};

export default function UpdateBanner() {
  const [newVersion, setNewVersion] = useState(null);
  const [reloading, setReloading] = useState(false);
  const newVersionRef = useRef(null);
  const reloadingRef = useRef(false);

  const reloadNow = useCallback(async () => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    setReloading(true);
    // 저장 중인 내용이 있으면 끝날 때까지 기다린 뒤 새로고침
    await flushPendingPushes(8000);
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || APP_VERSION === 'dev') return undefined;

    const check = async () => {
      const serverVersion = await fetchServerVersion();
      if (serverVersion && serverVersion !== APP_VERSION) {
        newVersionRef.current = serverVersion;
        setNewVersion(serverVersion);
        return true;
      }
      return false;
    };

    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      const hasUpdate = newVersionRef.current ? true : await check();
      if (hasUpdate && !isUserBusy()) reloadNow();
    };

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reloadNow]);

  if (!newVersion) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        background: '#111',
        color: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        fontSize: '14px',
        maxWidth: 'calc(100vw - 24px)'
      }}
    >
      <span>새 버전이 있습니다.</span>
      <button
        type="button"
        onClick={reloadNow}
        disabled={reloading}
        style={{
          padding: '6px 12px',
          background: '#fff',
          color: '#111',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: reloading ? 'default' : 'pointer'
        }}
      >
        {reloading ? '새로고침 중...' : '새로고침'}
      </button>
    </div>
  );
}
