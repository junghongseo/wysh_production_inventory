import React, { useState } from 'react';
import { useAuth, APP_VERSION } from '../../AuthContext';
import {
  MENU_PERMISSIONS,
  FEATURE_PERMISSIONS,
  validateUsername,
  validatePassword
} from '../../utils/permissions';
import PermissionPicker from './PermissionPicker';

const PERMISSION_LABELS = Object.fromEntries(
  [...MENU_PERMISSIONS, ...FEATURE_PERMISSIONS].map(p => [p.key, p.label])
);

// 헷갈리는 글자(0/O, 1/l/I)를 뺀 임시 비밀번호
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const buf = new Uint32Array(10);
  crypto.getRandomValues(buf);
  return Array.from(buf, n => chars[n % chars.length]).join('');
};

const formatDateTime = (iso) => {
  if (!iso) return '접속 기록 없음';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  fontSize: '0.88rem',
  boxSizing: 'border-box'
};
const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' };
const smallBtn = { padding: '6px 10px', fontSize: '0.78rem', borderRadius: '8px', cursor: 'pointer' };

const Notice = ({ tone, children }) => {
  if (!children) return null;
  const isError = tone === 'error';
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: '8px',
      fontSize: '0.82rem',
      marginBottom: '12px',
      background: isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
      color: isError ? 'var(--color-danger)' : 'var(--text-primary)',
      border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.3)'}`,
      whiteSpace: 'pre-wrap'
    }}>
      {children}
    </div>
  );
};

// 새 계정 만들기
const CreateUserForm = ({ onDone }) => {
  const { callAdminUsers } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState(generateTempPassword);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalid = validateUsername(username) || (!displayName.trim() && '표시 이름을 입력해 주세요.') || validatePassword(password);
    if (invalid) return setError(invalid);
    setSubmitting(true);
    const { error: err } = await callAdminUsers('create', {
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      password,
      isAdmin,
      permissions
    });
    setSubmitting(false);
    if (err) return setError(err);
    onDone(`${displayName.trim()} 계정을 만들었습니다.\n아이디: ${username.trim().toLowerCase()}\n초기 비밀번호: ${password}\n첫 로그인 때 비밀번호를 바꾸게 됩니다.`);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>새 계정 만들기</h3>
      <Notice tone="error">{error}</Notice>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label htmlFor="new-username" style={labelStyle}>아이디 (영문 소문자·숫자·.·_ 3~20자)</label>
          <input id="new-username" className="form-control" style={inputStyle} value={username} autoCapitalize="none"
            onChange={(e) => { setUsername(e.target.value); setError(''); }} />
        </div>
        <div>
          <label htmlFor="new-display-name" style={labelStyle}>표시 이름</label>
          <input id="new-display-name" className="form-control" style={inputStyle} value={displayName} placeholder="예: 김민수"
            onChange={(e) => { setDisplayName(e.target.value); setError(''); }} />
        </div>
        <div>
          <label htmlFor="new-password" style={labelStyle}>초기 비밀번호 (8자 이상)</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input id="new-password" className="form-control" style={inputStyle} value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }} />
            <button type="button" className="btn-secondary" style={smallBtn} onClick={() => setPassword(generateTempPassword())}>새로 만들기</button>
          </div>
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.88rem', fontWeight: 600 }}>
        <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
        관리자 (모든 권한 + 팀원 관리 + 앱 설정)
      </label>
      <div style={{ marginBottom: '16px' }}>
        <span style={labelStyle}>권한</span>
        <PermissionPicker value={permissions} onChange={setPermissions} isAdmin={isAdmin} idPrefix="new" />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
        <button type="button" className="btn-secondary" style={smallBtn} onClick={() => onDone('')}>취소</button>
        <button type="submit" className="btn-primary" style={smallBtn} disabled={submitting}>{submitting ? '만드는 중...' : '계정 만들기'}</button>
      </div>
    </form>
  );
};

// 기존 계정 한 줄
const UserRow = ({ member, isMe, onMessage }) => {
  const { updateUserPermissions, callAdminUsers } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(member.display_name);
  const [isAdmin, setIsAdmin] = useState(member.is_admin);
  const [permissions, setPermissions] = useState(member.permissions || []);
  const [busy, setBusy] = useState(false);

  const startEdit = () => {
    setDisplayName(member.display_name);
    setIsAdmin(member.is_admin);
    setPermissions(member.permissions || []);
    setEditing(true);
  };

  const run = async (fn, successMsg) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      onMessage('error', error);
      return false;
    }
    if (successMsg) onMessage('success', successMsg);
    return true;
  };

  const handleSave = async () => {
    if (!displayName.trim()) return onMessage('error', '표시 이름을 입력해 주세요.');
    const ok = await run(
      () => updateUserPermissions(member.id, { displayName: displayName.trim(), isAdmin, permissions }),
      `${displayName.trim()}님의 권한을 저장했습니다. 바로 적용됩니다.`
    );
    if (ok) setEditing(false);
  };

  const handleResetPassword = async () => {
    const temp = generateTempPassword();
    if (!window.confirm(`${member.display_name}님의 비밀번호를 임시 비밀번호로 초기화할까요?`)) return;
    await run(
      () => callAdminUsers('resetPassword', { userId: member.id, password: temp }),
      `${member.display_name}님의 임시 비밀번호: ${temp}\n다음 로그인 때 비밀번호를 바꾸게 됩니다.`
    );
  };

  const handleSetActive = async (active) => {
    const msg = active
      ? `${member.display_name}님의 계정을 다시 활성화할까요?`
      : `${member.display_name}님의 계정을 비활성화할까요?\n바로 로그아웃되고 다시 로그인할 수 없습니다. 남긴 기록은 그대로 유지됩니다.`;
    if (!window.confirm(msg)) return;
    await run(
      () => callAdminUsers('setActive', { userId: member.id, active }),
      active ? `${member.display_name}님의 계정을 활성화했습니다.` : `${member.display_name}님의 계정을 비활성화했습니다.`
    );
  };

  const outdated = member.is_active && member.last_app_version && member.last_app_version !== APP_VERSION;
  const permSummary = member.is_admin
    ? '모든 권한'
    : (member.permissions || []).map(k => PERMISSION_LABELS[k] || k).join(', ') || '권한 없음';

  return (
    <div className="glass-card" style={{ padding: '14px 16px', marginBottom: '10px', opacity: member.is_active ? 1 : 0.7 }} data-username={member.username}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.95rem' }}>{member.display_name}</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>@{member.username}</span>
            {member.is_admin && <span style={{ fontSize: '0.7rem', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1px 6px' }}>관리자</span>}
            {isMe && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>(나)</span>}
            {!member.is_active && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>비활성</span>}
            {member.must_change_password && member.is_active && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>비밀번호 변경 대기</span>}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{permSummary}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            마지막 접속: {formatDateTime(member.last_seen_at)} · 앱 버전: {member.last_app_version || '—'}
            {outdated && <strong style={{ color: 'var(--color-warning, #f59e0b)', marginLeft: '6px' }}>이전 버전</strong>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {member.is_active ? (
            <>
              {!editing && <button type="button" className="btn-secondary" style={smallBtn} onClick={startEdit} disabled={busy}>권한 편집</button>}
              <button type="button" className="btn-secondary" style={smallBtn} onClick={handleResetPassword} disabled={busy}>비밀번호 초기화</button>
              {!isMe && (
                <button type="button" className="btn-secondary" style={{ ...smallBtn, color: 'var(--color-danger)' }} onClick={() => handleSetActive(false)} disabled={busy}>비활성화</button>
              )}
            </>
          ) : (
            <button type="button" className="btn-secondary" style={smallBtn} onClick={() => handleSetActive(true)} disabled={busy}>다시 활성화</button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '12px', paddingTop: '12px' }}>
          <div style={{ maxWidth: '280px', marginBottom: '12px' }}>
            <label htmlFor={`name-${member.id}`} style={labelStyle}>표시 이름</label>
            <input id={`name-${member.id}`} className="form-control" style={inputStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.88rem', fontWeight: 600 }}>
            <input type="checkbox" checked={isAdmin} disabled={isMe} onChange={(e) => setIsAdmin(e.target.checked)} />
            관리자
            {isMe && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>(자기 자신의 관리자 권한은 해제할 수 없습니다)</span>}
          </label>
          <PermissionPicker value={permissions} onChange={setPermissions} isAdmin={isAdmin} idPrefix={`edit-${member.id}`} />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" style={smallBtn} onClick={() => setEditing(false)} disabled={busy}>취소</button>
            <button type="button" className="btn-primary" style={smallBtn} onClick={handleSave} disabled={busy}>{busy ? '저장 중...' : '저장'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

const TeamManagementView = () => {
  const { profiles, profile, refreshProfiles } = useAuth();
  const [creating, setCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [message, setMessage] = useState({ tone: '', text: '' });

  const active = profiles.filter(p => p.is_active);
  const inactive = profiles.filter(p => !p.is_active);
  const outdatedCount = active.filter(p => p.last_app_version && p.last_app_version !== APP_VERSION).length;
  const neverSeenCount = active.filter(p => !p.last_app_version).length;

  const showMessage = (tone, text) => setMessage({ tone, text });

  return (
    <div style={{ maxWidth: '900px', paddingBottom: '96px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>팀원 관리</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            현재 앱 버전: {APP_VERSION} · 이전 버전 사용 {outdatedCount}명 · 접속 기록 없음 {neverSeenCount}명
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-secondary" style={smallBtn} onClick={() => refreshProfiles().catch(() => {})}>새로고침</button>
          {!creating && (
            <button type="button" className="btn-primary" style={smallBtn} onClick={() => { setCreating(true); setMessage({ tone: '', text: '' }); }}>
              + 새 계정
            </button>
          )}
        </div>
      </div>

      <Notice tone={message.tone}>{message.text}</Notice>

      {creating && (
        <CreateUserForm onDone={(text) => { setCreating(false); if (text) showMessage('success', text); }} />
      )}

      {active.map(member => (
        <UserRow key={member.id} member={member} isMe={member.id === profile?.id} onMessage={showMessage} />
      ))}

      {inactive.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <button type="button" className="btn-secondary" style={smallBtn} onClick={() => setShowInactive(v => !v)}>
            {showInactive ? '▾' : '▸'} 비활성 계정 {inactive.length}명
          </button>
          {showInactive && (
            <div style={{ marginTop: '10px' }}>
              {inactive.map(member => (
                <UserRow key={member.id} member={member} isMe={false} onMessage={showMessage} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamManagementView;
