import React from 'react';

// 로그인 / 비밀번호 변경 / 안내 화면에서 함께 쓰는 카드 레이아웃
export const AuthCard = ({ title, subtitle, children }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'var(--bg-primary)'
  }}>
    <div className="modal-content" style={{
      maxWidth: '400px',
      width: '100%',
      padding: '32px',
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))'
      }} />
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img
          src="/WYSH2_로고_1772157440156.webp"
          alt="WYSH Logo"
          style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', marginBottom: '12px' }}
        />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{title}</h3>
        {subtitle && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

export const AuthMessage = ({ tone = 'error', children }) => {
  if (!children) return null;
  const isError = tone === 'error';
  return (
    <div style={{
      background: isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(2, 132, 199, 0.08)',
      color: isError ? 'var(--color-danger)' : 'var(--text-primary)',
      padding: '10px 14px',
      borderRadius: '8px',
      fontSize: '0.8rem',
      fontWeight: 500,
      marginBottom: '16px',
      border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)'}`,
      textAlign: 'left'
    }}>
      {children}
    </div>
  );
};

export const authLabelStyle = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
  display: 'block'
};

export const authInputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  fontSize: '0.9rem',
  boxSizing: 'border-box'
};

export const authPrimaryButtonStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.95rem',
  justifyContent: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer'
};
