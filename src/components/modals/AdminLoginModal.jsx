import React, { useState, useEffect, useRef } from 'react';

const AdminLoginModal = ({ isOpen, onClose, onLogin }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const idInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setId('');
      setPassword('');
      setError('');
      setTimeout(() => {
        if (idInputRef.current) {
          idInputRef.current.focus();
        }
      }, 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!id.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }
    const success = onLogin(id, password);
    if (success) {
      onClose();
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="modal-overlay open" style={{ zIndex: 11000 }}>
      <div className="modal-content" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Top Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))'
        }} />

        <div style={{ marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(2, 132, 199, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--color-primary)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>관리자 인증</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>모든 메뉴의 편집 권한을 획득합니다.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-danger)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 500,
              marginBottom: '16px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="modal-admin-id" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>관리자 아이디</label>
            <input
              type="text"
              id="modal-admin-id"
              className="form-control"
              ref={idInputRef}
              placeholder="아이디를 입력하세요"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError('');
              }}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.9rem',
                transition: 'var(--transition-smooth)'
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="modal-admin-pw" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>비밀번호</label>
            <input
              type="password"
              id="modal-admin-pw"
              className="form-control"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.9rem',
                transition: 'var(--transition-smooth)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                justifyContent: 'center',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)',
                transition: 'var(--transition-smooth)',
                justifyContent: 'center',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;
