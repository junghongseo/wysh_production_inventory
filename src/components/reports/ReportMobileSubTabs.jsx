import React from 'react';

// Mobile-only sub-tab selector (리포트 작성 / 작성 이력)
const subTabStyle = (isActive) => ({
  flex: 1,
  padding: '10px',
  borderRadius: '8px',
  fontSize: '0.86rem',
  fontWeight: 700,
  background: isActive ? 'var(--color-primary)' : 'transparent',
  color: isActive ? '#fff' : 'var(--text-secondary)',
  border: 'none',
  cursor: 'pointer',
  transition: 'var(--transition-smooth)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px'
});

const ReportMobileSubTabs = ({ mobileSubTab, setMobileSubTab, historyCount }) => (
  <div className="mobile-subtab-container" style={{ display: 'none', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
    <button
      type="button"
      onClick={() => setMobileSubTab('form')}
      style={subTabStyle(mobileSubTab === 'form')}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
      리포트 작성
    </button>
    <button
      type="button"
      onClick={() => setMobileSubTab('history')}
      style={subTabStyle(mobileSubTab === 'history')}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      작성 이력 ({historyCount})
    </button>
  </div>
);

export default ReportMobileSubTabs;
