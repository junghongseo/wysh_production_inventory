import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { validatePassword } from '../../utils/permissions';
import { AuthCard, AuthMessage, authLabelStyle, authInputStyle, authPrimaryButtonStyle } from './AuthCard';

const ChangePasswordScreen = () => {
  const { profile, changePassword, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalid = validatePassword(password);
    if (invalid) return setError(invalid);
    if (password !== confirm) return setError('두 비밀번호가 일치하지 않습니다.');
    setSubmitting(true);
    const { error: changeError } = await changePassword(password);
    setSubmitting(false);
    if (changeError) setError(changeError);
  };

  return (
    <AuthCard
      title="비밀번호 변경"
      subtitle={`${profile?.display_name || ''}님, 처음 로그인했거나 비밀번호가 초기화되었습니다. 새 비밀번호를 정해 주세요.`}
    >
      <form onSubmit={handleSubmit}>
        <AuthMessage>{error}</AuthMessage>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="new-password" style={authLabelStyle}>새 비밀번호 (8자 이상)</label>
          <input
            id="new-password"
            type="password"
            className="form-control"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            style={authInputStyle}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="confirm-password" style={authLabelStyle}>새 비밀번호 확인</label>
          <input
            id="confirm-password"
            type="password"
            className="form-control"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(''); }}
            style={authInputStyle}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={submitting} style={authPrimaryButtonStyle}>
          {submitting ? '변경 중...' : '비밀번호 변경'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => logout({ skipConfirm: true })}
          style={{ ...authPrimaryButtonStyle, marginTop: '8px' }}
        >
          로그아웃
        </button>
      </form>
    </AuthCard>
  );
};

export default ChangePasswordScreen;
