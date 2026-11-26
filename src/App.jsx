import React, { useState, lazy, Suspense } from 'react';
import { useWysh } from './WyshContext';
import { useAuth } from './AuthContext';
import { canViewTab, firstAllowedTab, countUnconfirmedReports, countUnverifiedOutflows } from './utils/permissions';
import HeaderStats from './components/HeaderStats';
import Navbar from './components/Navbar';
import RecipeDrawer from './components/RecipeDrawer';
import WyshThemeSwitcher from './components/WyshThemeSwitcher';
import WyshTopBanner from './components/WyshTopBanner';
import PlanRegistrationModal from './components/modals/PlanRegistrationModal';
import ProductRegistrationModal from './components/modals/ProductRegistrationModal';
import ModifyQtyModal from './components/modals/ModifyQtyModal';
import ConfirmModal from './components/modals/ConfirmModal';
import MemoModal from './components/modals/MemoModal';
import CalendarNoteModal from './components/modals/CalendarNoteModal';
import AppSettingsModal from './components/modals/AppSettingsModal';
import { AIManagerChat } from './components/AIManagerChat';

// Code-split tabs using React.lazy for lightweight bundle and faster initial load
const CalendarView = lazy(() => import('./components/CalendarView'));
const InventoryView = lazy(() => import('./components/InventoryView'));
const RecipesView = lazy(() => import('./components/RecipesView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const OrderView = lazy(() => import('./components/OrderView'));
const TeamManagementView = lazy(() => import('./components/team/TeamManagementView'));

const ViewFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      화면을 불러오는 중...
    </div>
  </div>
);

const App = () => {
  const { reports, inventory, deletePlan, deleteProduct, deleteHistoryItem, updateOutflowMemo, saveCalendarNote, deleteCalendarNote, loading, isDbConnected, dbError, products, plans } = useWysh();
  const { profile, can, logout } = useAuth();
  const isAdmin = can('admin');
  const defaultTab = firstAllowedTab(profile);

  // Tab state (권한이 있는 첫 번째 탭에서 시작)
  const [activeTab, setActiveTab] = useState(() => defaultTab || 'calendar-view');

  // WYSH B&W Theme state (default: 'wysh-bw')
  const [theme, setTheme] = useState(() => localStorage.getItem('wysh-theme') || 'wysh-bw');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wysh-theme', theme);
  }, [theme]);

  // 미확인 배지: 권한에 맞는 항목만 센다
  const unconfirmedCount = React.useMemo(() => {
    if (!reports) return 0;
    return countUnconfirmedReports(profile, reports) + countUnverifiedOutflows(profile, inventory || []);
  }, [reports, inventory, profile]);

  // Update PWA App Badge when unconfirmed reports or inventory change
  React.useEffect(() => {
    if (!reports) return;

    const updateBadge = () => {
      if ('setAppBadge' in navigator) {
        if (unconfirmedCount > 0) {
          navigator.setAppBadge(unconfirmedCount).catch((err) => console.log('App Badge error:', err));
        } else {
          navigator.clearAppBadge().catch((err) => console.log('App Badge error:', err));
        }
      }

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_BADGE',
          count: unconfirmedCount
        });
      }
    };

    // iOS 16.4+ and Android Chrome require Notification permission for PWA Home Screen icon badges
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const handleUserInteraction = () => {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              updateBadge();
            }
          }).catch(err => console.log('Notification permission error:', err));
          window.removeEventListener('click', handleUserInteraction);
          window.removeEventListener('touchstart', handleUserInteraction);
        };
        window.addEventListener('click', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);
      } else if (Notification.permission === 'granted') {
        updateBadge();
      }
    }

    updateBadge();
  }, [reports, inventory, unconfirmedCount]);

  const [appSettingsModalOpen, setAppSettingsModalOpen] = useState(false);

  // 권한이 바뀌어 지금 탭을 볼 수 없게 되면 볼 수 있는 첫 번째 탭으로 이동
  React.useEffect(() => {
    if (!canViewTab(profile, activeTab) && defaultTab && defaultTab !== activeTab) {
      setActiveTab(defaultTab);
    }
  }, [profile, activeTab, defaultTab]);

  // 관리자 권한이 해제되면 앱 설정 창을 닫는다
  React.useEffect(() => {
    if (!isAdmin && appSettingsModalOpen) setAppSettingsModalOpen(false);
  }, [isAdmin, appSettingsModalOpen]);

  // Selection states
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Keep selectedProduct in sync with updated products list from WyshContext
  React.useEffect(() => {
    if (selectedProduct) {
      const updated = products.find(p => p.id === selectedProduct.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedProduct)) {
        setSelectedProduct(updated);
      }
    }
  }, [products, selectedProduct]);

  // Keep selectedPlan in sync with updated plans list from WyshContext
  React.useEffect(() => {
    if (selectedPlan) {
      const updated = plans.find(p => p.id === selectedPlan.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedPlan)) {
        setSelectedPlan(updated);
      }
    }
  }, [plans, selectedPlan]);

  // Modal open states
  const [planModal, setPlanModal] = useState({ 
    isOpen: false, 
    editPlanId: null, 
    initialStartDate: null,
    initialPlanType: 'yogurt',
    initialSubProductId: '',
    initialTargetYogurtProductId: '',
    initialTargetYogurtQty: ''
  });
  const [productModal, setProductModal] = useState({ isOpen: false });
  const [modifyQtyModal, setModifyQtyModal] = useState({ isOpen: false, planId: null });
  const [recipeDrawer, setRecipeDrawer] = useState({ isOpen: false, planId: null });
  const [memoModal, setMemoModal] = useState({ isOpen: false, planId: null, historyId: null, memo: '' });
  const [noteModal, setNoteModal] = useState({ isOpen: false, dateStr: '', existingNote: null });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Common confirm helper
  const triggerConfirm = (title, message, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const handleOpenPlanRegistration = (initialStartDate = null) => {
    setPlanModal({ 
      isOpen: true, 
      editPlanId: null, 
      initialStartDate,
      initialPlanType: 'yogurt',
      initialSubProductId: '',
      initialTargetYogurtProductId: '',
      initialTargetYogurtQty: ''
    });
  };

  const handleRequestSubPlanModal = ({ subProductId, targetYogurtProductId, targetYogurtQty, startDate }) => {
    setPlanModal({
      isOpen: true,
      editPlanId: null,
      initialStartDate: startDate,
      initialPlanType: 'sub_ingredient',
      initialSubProductId: subProductId,
      initialTargetYogurtProductId: targetYogurtProductId,
      initialTargetYogurtQty: targetYogurtQty
    });
  };

  const handleOpenPlanEdit = (planId) => {
    setPlanModal({ isOpen: true, editPlanId: planId });
  };

  const handleOpenRecipeDrawer = (planId) => {
    setRecipeDrawer({ isOpen: true, planId });
  };

  const handleOpenModifyQty = (planId, productId) => {
    setModifyQtyModal({ isOpen: true, planId, productId });
  };

  const handleDeletePlan = (planId) => {
    triggerConfirm(
      '생산 계획 삭제',
      '정말로 이 생산 계획을 삭제하시겠습니까? 관련 재고 기록도 함께 삭제됩니다.',
      () => {
        deletePlan(planId);
        if (selectedPlan?.id === planId) {
          setSelectedPlan(null);
        }
      }
    );
  };

  const handleDeleteProduct = (prodId) => {
    triggerConfirm(
      '제품 삭제',
      '정말로 이 요거트 제품을 삭제하시겠습니까? 관련된 생산 계획 및 재고 데이터가 함께 삭제됩니다.',
      () => {
        deleteProduct(prodId);
        if (selectedProduct?.id === prodId) {
          setSelectedProduct(null);
        }
        if (selectedPlan && selectedPlan.productId === prodId) {
          setSelectedPlan(null);
        }
      }
    );
  };

  const handleDeleteHistory = (planId, historyId) => {
    triggerConfirm(
      '출고 취소',
      '이 출고 내역을 취소(삭제)하시겠습니까? 재고에 수량이 환원됩니다.',
      () => {
        deleteHistoryItem(planId, historyId);
      }
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
        데이터 동기화 및 마이그레이션 모듈 로딩 중...
      </div>
    );
  }

  return (
    <>
      <WyshTopBanner />
      <div className="app-container">
        {/* Header */}
        <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div 
            className="brand-section" 
            onClick={() => defaultTab && setActiveTab(defaultTab)}
            style={{ cursor: 'pointer' }}
            title="첫 화면으로 이동"
          >
            <div className="brand-logo" style={{ background: 'transparent', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/WYSH2_로고_1772157440156.webp" alt="WYSH Logo" style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
            <div className="brand-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0 }}>Wyshboard</h1>
                {!isDbConnected && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    color: '#ffffff',
                    backgroundColor: 'var(--color-warning, #f59e0b)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    verticalAlign: 'middle'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      display: 'inline-block'
                    }}></span>
                    로컬 오프라인 모드
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0' }}>생산부터 재고까지, 위시의 모든 흐름을 한눈에</p>
              {dbError && (
                <p style={{ fontSize: '0.7rem', color: 'var(--color-danger, #ef4444)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⚠️ 동기화 실패: {dbError}
                </p>
              )}
            </div>
          </div>

          <div className="header-controls-group">
            <WyshThemeSwitcher theme={theme} setTheme={setTheme} />
            {/* 현재 로그인한 사람 */}
            <div className="glass-card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--glass-shadow)',
              backdropFilter: 'blur(10px)',
              transition: 'var(--transition-smooth)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: isAdmin ? 'var(--color-success, #10b981)' : 'var(--color-primary, #0ea5e9)',
                  display: 'inline-block',
                  boxShadow: isAdmin ? '0 0 8px #10b981' : '0 0 8px #0ea5e9'
                }}></span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }} id="current-user-name">
                  {profile?.display_name}
                </span>
                {isAdmin && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1px 6px' }}>관리자</span>
                )}
              </div>
              <button
                onClick={() => logout()}
                className="btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  borderRadius: '8px',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                로그아웃
              </button>
            </div>
            <HeaderStats />
          </div>
        </header>

        {/* Main Navigation */}
        <Navbar activeTab={activeTab} setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'recipes-view' && !selectedProduct) {
            setSelectedProduct(null);
          }
        }} onOpenAppSettings={() => setAppSettingsModalOpen(true)} appSettingsModalOpen={appSettingsModalOpen} />

      {!defaultTab && (
        <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>아직 권한이 없습니다</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>볼 수 있는 메뉴가 없습니다. 관리자에게 권한을 요청하세요.</p>
        </div>
      )}

      {/* Main Content Tabs */}
      <Suspense fallback={<ViewFallback />}>
        <main className={`tab-content ${activeTab === 'calendar-view' ? 'active' : ''}`} id="calendar-view">
          {activeTab === 'calendar-view' && (
            <CalendarView
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
              onOpenRegisterModal={handleOpenPlanRegistration}
              onOpenEditModal={handleOpenPlanEdit}
              onOpenRecipeDrawer={handleOpenRecipeDrawer}
              onDeletePlan={handleDeletePlan}
              onOpenNoteModal={(dateStr, existing) => setNoteModal({ isOpen: true, dateStr, existingNote: existing })}
            />
          )}
        </main>

        <section className={`tab-content ${activeTab === 'inventory-view' ? 'active' : ''}`} id="inventory-view">
          {activeTab === 'inventory-view' && (
            <InventoryView
              onDeleteHistory={handleDeleteHistory}
              onOpenMemoModal={(planId, historyId, memo) => setMemoModal({ isOpen: true, planId, historyId, memo })}
            />
          )}
        </section>

        <section className={`tab-content ${activeTab === 'reports-view' ? 'active' : ''}`} id="reports-view">
          {activeTab === 'reports-view' && (
            <ReportsView />
          )}
        </section>

        <section className={`tab-content ${activeTab === 'recipes-view' ? 'active' : ''}`} id="recipes-view">
          {activeTab === 'recipes-view' && (
            <RecipesView
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              onOpenProductModal={() => setProductModal({ isOpen: true })}
              onDeleteProduct={handleDeleteProduct}
              onConfirmModal={triggerConfirm}
            />
          )}
        </section>

        <section className={`tab-content ${activeTab === 'order-view' ? 'active' : ''}`} id="order-view">
          {activeTab === 'order-view' && (
            <OrderView />
          )}
        </section>

        <section className={`tab-content ${activeTab === 'team-view' ? 'active' : ''}`} id="team-view">
          {activeTab === 'team-view' && isAdmin && (
            <TeamManagementView />
          )}
        </section>
      </Suspense>

      {/* Slide-out Drawer: Raw Material Recipe (원재료 배합표) */}
      <RecipeDrawer
        isOpen={recipeDrawer.isOpen && can('calendar.recipe')}
        onClose={() => setRecipeDrawer({ isOpen: false, planId: null })}
        planId={recipeDrawer.planId}
      />

      {/* Popup Modal: Production Plan Registration */}
      <PlanRegistrationModal
        isOpen={planModal.isOpen}
        onClose={() => setPlanModal({ isOpen: false, editPlanId: null, initialStartDate: null, initialPlanType: 'yogurt', initialSubProductId: '', initialTargetYogurtProductId: '', initialTargetYogurtQty: '' })}
        editPlanId={planModal.editPlanId}
        initialStartDate={planModal.initialStartDate}
        initialPlanType={planModal.initialPlanType}
        initialSubProductId={planModal.initialSubProductId}
        initialTargetYogurtProductId={planModal.initialTargetYogurtProductId}
        initialTargetYogurtQty={planModal.initialTargetYogurtQty}
        onRequestSubPlanModal={handleRequestSubPlanModal}
      />

      {/* Popup Modal: Register New Product */}
      <ProductRegistrationModal
        isOpen={productModal.isOpen}
        onClose={() => setProductModal({ isOpen: false })}
        onSuccess={(addedProd) => setSelectedProduct(addedProd)}
      />

      {/* Popup Modal: Modify Actual Quantity */}
      <ModifyQtyModal
        isOpen={modifyQtyModal.isOpen}
        onClose={() => setModifyQtyModal({ isOpen: false, planId: null, productId: null })}
        planId={modifyQtyModal.planId}
        productId={modifyQtyModal.productId}
      />

      {/* Popup Modal: Outflow Memo View / Edit */}
      <MemoModal
        isOpen={memoModal.isOpen}
        onClose={() => setMemoModal(prev => ({ ...prev, isOpen: false }))}
        planId={memoModal.planId}
        historyId={memoModal.historyId}
        initialMemo={memoModal.memo}
        onSave={updateOutflowMemo}
        canEdit={can('inventory.verify')}
      />

      {/* Popup Modal: Custom Deletion Confirmation */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Popup Modal: Calendar Day Custom Memo */}
      <CalendarNoteModal
        isOpen={noteModal.isOpen}
        onClose={() => setNoteModal({ isOpen: false, dateStr: '', existingNote: null })}
        dateStr={noteModal.dateStr}
        existingNote={noteModal.existingNote}
        onSave={saveCalendarNote}
        onDelete={deleteCalendarNote}
        canEdit={can('calendar.notes')}
      />

      {/* Admin App Settings Modal */}
      <AppSettingsModal
        isOpen={isAdmin && appSettingsModalOpen}
        onClose={() => setAppSettingsModalOpen(false)}
      />

      {/* Floating AI Production Manager Chat Widget */}
      <AIManagerChat />
    </div>
    </>
  );
};

export default App;
