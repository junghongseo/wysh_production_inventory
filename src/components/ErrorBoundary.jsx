import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Antigravity Uncaught React Error Boundary Caught Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetLocalData = () => {
    if (window.confirm("주의: 오프라인 캐시 데이터를 초기화하시겠습니까? (Supabase 클라우드 데이터는 보존됩니다)")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px 24px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px 0', color: '#f8fafc' }}>
              화면 표시 중 오차가 발생하였습니다
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              시스템 보호를 위해 예외 처리되었으며, 대시보드 데이터는 안전합니다. 아래 버튼을 눌러 다시 로드해 주세요.
            </p>
            {this.state.error && (
              <div style={{
                background: '#020617',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.78rem',
                color: '#ef4444',
                fontFamily: 'monospace',
                textAlign: 'left',
                marginBottom: '20px',
                wordBreak: 'break-all',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                {this.state.error.toString()}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                }}
              >
                🔄 새로고침
              </button>
              <button
                onClick={this.handleResetLocalData}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'transparent',
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                🛠️ 오프라인 캐시 재설정
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
