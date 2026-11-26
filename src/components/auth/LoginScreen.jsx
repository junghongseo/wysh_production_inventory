import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { AuthCard, AuthMessage, authLabelStyle, authInputStyle, authPrimaryButtonStyle } from './AuthCard';

const LoginScreen = () => {
  const { login, authNotice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: loginError } = await login(username, password, remember);
    setSubmitting(false);
    if (loginError) setError(loginError);
  };

  return (
    <AuthCard title="Wyshboard 로그인" subtitle="관리자에게 받은 아이디로 로그인하세요.">
      <form onSubmit={handleSubmit}>
        <AuthMessage tone="info">{!error && authNotice}</AuthMessage>
        <AuthMessage>{error}</AuthMessage>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="login-username" style={authLabelStyle}>아이디</label>
          <input
            id="login-username"
            type="text"
            className="form-control"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            placeholder="아이디"
            style={authInputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="login-password" style={authLabelStyle}>비밀번호</label>
          <input
            id="login-password"
            type="password"
            className="form-control"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="비밀번호"
            style={authInputStyle}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '24px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ marginTop: '3px' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            이 기기에서 로그인 유지
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              공용 기기에서는 체크하지 마세요. 체크하지 않으면 30분 동안 사용하지 않을 때 자동으로 로그아웃됩니다.
            </span>
          </span>
        </label>

        <button type="submit" className="btn-primary" disabled={submitting} style={authPrimaryButtonStyle}>
          {submitting ? '로그인 중...' : '로그인'}
        </button>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '16px 0 0' }}>
          비밀번호를 잊었다면 관리자에게 초기화를 요청하세요.
        </p>
      </form>
    </AuthCard>
  );
};

export default LoginScreen;
