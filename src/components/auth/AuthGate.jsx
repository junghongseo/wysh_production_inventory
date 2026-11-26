import React from 'react';
import { useAuth } from '../../AuthContext';
import LoginScreen from './LoginScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import { AuthCard, authPrimaryButtonStyle } from './AuthCard';

const FullScreenMessage = ({ children }) => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
    {children}
  </div>
);

// 로그인·계정 상태를 확인한 뒤에만 앱(데이터 동기화 포함)을 띄운다.
// 로그아웃하면 children(WyshProvider)이 언마운트되어 메모리의 데이터도 사라진다.
const AuthGate = ({ children }) => {
  const { isConfigured, authLoading, profileLoading, session, profile, logout } = useAuth();

  if (!isConfigured) {
    return (
      <AuthCard title="서버 설정 오류" subtitle="Supabase 연결 정보(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 없어 로그인할 수 없습니다." />
    );
  }

  if (authLoading) return <FullScreenMessage>로그인 정보를 확인하는 중...</FullScreenMessage>;

  if (!session) return <LoginScreen />;

  if (profileLoading && !profile) return <FullScreenMessage>계정 정보를 불러오는 중...</FullScreenMessage>;

  if (!profile || !profile.is_active) {
    return (
      <AuthCard
        title="사용할 수 없는 계정"
        subtitle={!profile ? '계정 정보를 찾을 수 없습니다. 관리자에게 문의하세요.' : '비활성화된 계정입니다. 관리자에게 문의하세요.'}
      >
        <button type="button" className="btn-secondary" onClick={() => logout({ skipConfirm: true })} style={authPrimaryButtonStyle}>
          로그아웃
        </button>
      </AuthCard>
    );
  }

  if (profile.must_change_password) return <ChangePasswordScreen />;

  return children;
};

export default AuthGate;
