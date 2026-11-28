import React from 'react';
import { useWysh } from '../WyshContext';
import { useAuth } from '../AuthContext';
import { canViewTab, countUnconfirmedReports, countUnverifiedOutflows } from '../utils/permissions';

const Navbar = ({ activeTab, setActiveTab, onOpenAppSettings, appSettingsModalOpen }) => {
  const { reports, inventory } = useWysh();
  const { profile, can } = useAuth();
  const isAdmin = can('admin');
  const showTab = (tab) => canViewTab(profile, tab);

  const visibleUnconfirmedReportsCount = countUnconfirmedReports(profile, reports);
  const unverifiedInventoryCount = countUnverifiedOutflows(profile, inventory);

  return (
    <nav className="app-nav">
      {showTab('calendar-view') && (
      <button 
        className={`nav-tab ${activeTab === 'calendar-view' ? 'active' : ''}`} 
        id="tab-calendar" 
        onClick={() => setActiveTab('calendar-view')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span className="nav-label">생산 일정 및 배합표</span>
        <span className="nav-label-short">일정</span>
      </button>
      )}
      {showTab('inventory-view') && (
      <button 
        className={`nav-tab ${activeTab === 'inventory-view' ? 'active' : ''}`} 
        id="tab-inventory" 
        onClick={() => setActiveTab('inventory-view')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <span className="nav-label">차수별 재고 관리</span>
        <span className="nav-label-short">재고</span>
        {unverifiedInventoryCount > 0 && (
          <span className="nav-badge" style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 'bold',
            marginLeft: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
            lineHeight: '1'
          }}>
            <span className="nav-badge-prefix">미확인 </span>{unverifiedInventoryCount}
          </span>
        )}
      </button>
      )}
      {showTab('reports-view') && (
      <button 
        className={`nav-tab ${activeTab === 'reports-view' ? 'active' : ''}`} 
        id="tab-reports" 
        onClick={() => setActiveTab('reports-view')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span className="nav-label">리포트</span>
        <span className="nav-label-short">리포트</span>
        {visibleUnconfirmedReportsCount > 0 && (
          <span className="nav-badge" style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 'bold',
            marginLeft: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
            lineHeight: '1'
          }}>
            <span className="nav-badge-prefix">미확인 </span>{visibleUnconfirmedReportsCount}
          </span>
        )}
      </button>
      )}
      {showTab('order-view') && (
      <button 
        className={`nav-tab ${activeTab === 'order-view' ? 'active' : ''}`} 
        id="tab-order" 
        onClick={() => setActiveTab('order-view')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span className="nav-label">주문 정리 및 분석</span>
        <span className="nav-label-short">주문</span>
      </button>
      )}
      {showTab('recipes-view') && (
        <button 
          className={`nav-tab ${activeTab === 'recipes-view' ? 'active' : ''}`} 
          id="tab-recipes" 
          onClick={() => setActiveTab('recipes-view')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span className="nav-label">제품 및 레시피 설정</span>
          <span className="nav-label-short">레시피</span>
        </button>
      )}
      {isAdmin && (
        <button
          className={`nav-tab nav-tab-admin ${activeTab === 'team-view' ? 'active' : ''}`}
          id="tab-team"
          onClick={() => setActiveTab('team-view')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          팀원 관리
        </button>
      )}
      {isAdmin && onOpenAppSettings && (
        <button 
          className={`nav-tab nav-tab-admin ${appSettingsModalOpen ? 'active' : ''}`}
          id="tab-settings" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenAppSettings();
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83 2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          앱 설정
        </button>
      )}
    </nav>
  );
};

export default Navbar;
