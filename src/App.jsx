import React, { useState, lazy, Suspense } from 'react';
import { useWysh } from './WyshContext';
import HeaderStats from './components/HeaderStats';
import Navbar from './components/Navbar';
import RecipeDrawer from './components/RecipeDrawer';
import PlanRegistrationModal from './components/modals/PlanRegistrationModal';
import ProductRegistrationModal from './components/modals/ProductRegistrationModal';
import ModifyQtyModal from './components/modals/ModifyQtyModal';
import ConfirmModal from './components/modals/ConfirmModal';
import MemoModal from './components/modals/MemoModal';
import CalendarNoteModal from './components/modals/CalendarNoteModal';
import AdminLoginModal from './components/modals/AdminLoginModal';

// Code-split tabs using React.lazy for lightweight bundle and faster initial load
const CalendarView = lazy(() => import('./components/CalendarView'));
const InventoryView = lazy(() => import('./components/InventoryView'));
const RecipesView = lazy(() => import('./components/RecipesView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const OrderView = lazy(() => import('./components/OrderView'));

const ViewFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      화면을 불러오는 중...
    </div>
  </div>
);

const App = () => {
  const { deletePlan, deleteProduct, deleteHistoryItem, updateOutflowMemo, saveCalendarNote, deleteCalendarNote, loading, isDbConnected, dbError, isAdminLoggedIn, loginAdmin, logoutAdmin, products } = useWysh();

  // Tab state
  const [activeTab, setActiveTab] = useState('calendar-view');

  // Admin login modal state
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);

  // Redirect to calendar-view if user logs out while on recipes-view
  React.useEffect(() => {
    if (!isAdminLoggedIn && activeTab === 'recipes-view') {
      setActiveTab('calendar-view');
    }
  }, [isAdminLoggedIn, activeTab]);

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
    <div className="app-container">
      {/* Header */}
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div 
          className="brand-section" 
          onClick={() => setActiveTab('calendar-view')}
          style={{ cursor: 'pointer' }}
          title="생산 일정 및 배합표 탭으로 이동"
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
          {/* Admin Authority Indicator */}
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
                backgroundColor: isAdminLoggedIn ? 'var(--color-success, #10b981)' : 'var(--color-primary, #0ea5e9)',
                display: 'inline-block',
                boxShadow: isAdminLoggedIn ? '0 0 8px #10b981' : '0 0 8px #0ea5e9',
                transition: 'all 0.3s ease'
              }}></span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isAdminLoggedIn ? '관리자 모드' : '일반 사용자 모드'}
              </span>
            </div>
            {isAdminLoggedIn ? (
              <button 
                onClick={logoutAdmin}
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
            ) : (
              <button 
                onClick={() => setAdminLoginModalOpen(true)}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                  border: 'none',
                  color: '#ffffff',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                관리자 로그인
              </button>
            )}
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
      }} isAdminLoggedIn={isAdminLoggedIn} />

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
              isAdminLoggedIn={isAdminLoggedIn}
            />
          )}
        </main>

        <section className={`tab-content ${activeTab === 'inventory-view' ? 'active' : ''}`} id="inventory-view">
          {activeTab === 'inventory-view' && (
            <InventoryView
              onOpenModifyQtyModal={handleOpenModifyQty}
              onDeleteHistory={handleDeleteHistory}
              onOpenMemoModal={(planId, historyId, memo) => setMemoModal({ isOpen: true, planId, historyId, memo })}
              isAdminLoggedIn={isAdminLoggedIn}
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
      </Suspense>

      {/* Slide-out Drawer: Raw Material Recipe (원재료 배합표) */}
      <RecipeDrawer
        isOpen={recipeDrawer.isOpen}
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
        isAdminLoggedIn={isAdminLoggedIn}
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
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={adminLoginModalOpen}
        onClose={() => setAdminLoginModalOpen(false)}
        onLogin={loginAdmin}
      />
    </div>
  );
};

export default App;
