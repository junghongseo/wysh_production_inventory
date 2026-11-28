import React, { useEffect, useRef, useState } from 'react';

// 모바일 상단의 계정 버튼. 누르면 이름·테마·관리자 메뉴·로그아웃을 담은 작은 메뉴가 열린다.
// PC 화면에서는 index.css / mobile.css 에서 숨긴다.
const MobileAccountMenu = ({ profile, isAdmin, theme, setTheme, onOpenTeam, onOpenAppSettings, onLogout }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const isBw = theme === 'wysh-bw';

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn) => () => { setOpen(false); fn(); };
  const initial = (profile?.display_name || '?').trim().charAt(0);

  return (
    <div className="mobile-account" ref={rootRef}>
      <button
        type="button"
        className="mobile-account-btn"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="계정 메뉴"
      >
        <span className={`mobile-account-avatar ${isAdmin ? 'is-admin' : ''}`}>{initial}</span>
        <span className="mobile-account-name">{profile?.display_name}</span>
      </button>

      {open && (
        <div className="mobile-account-menu" role="menu">
          <div className="mobile-account-head">
            <strong>{profile?.display_name}</strong>
            {isAdmin && <span className="mobile-account-role">관리자</span>}
          </div>
          <button type="button" role="menuitem" onClick={run(() => setTheme(isBw ? 'default' : 'wysh-bw'))}>
            <span aria-hidden="true">{isBw ? '☀️' : '🖤'}</span>
            {isBw ? '클래식 라이트 테마로' : '위시 B&W 테마로'}
          </button>
          {isAdmin && (
            <button type="button" role="menuitem" onClick={run(onOpenTeam)}>
              <span aria-hidden="true">👥</span>팀원 관리
            </button>
          )}
          {isAdmin && (
            <button type="button" role="menuitem" onClick={run(onOpenAppSettings)}>
              <span aria-hidden="true">⚙️</span>앱 설정
            </button>
          )}
          <button type="button" role="menuitem" className="danger" onClick={run(onLogout)}>
            <span aria-hidden="true">↩</span>로그아웃
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileAccountMenu;
