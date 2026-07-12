import React, { useState } from 'react';
import { useWysh } from './WyshContext';
import HeaderStats from './components/HeaderStats';
import Navbar from './components/Navbar';
import CalendarView from './components/CalendarView';
import InventoryView from './components/InventoryView';
import RecipesView from './components/RecipesView';
import RecipeDrawer from './components/RecipeDrawer';
import PlanRegistrationModal from './components/modals/PlanRegistrationModal';
import ProductRegistrationModal from './components/modals/ProductRegistrationModal';
import ModifyQtyModal from './components/modals/ModifyQtyModal';
import ConfirmModal from './components/modals/ConfirmModal';
import MemoModal from './components/modals/MemoModal';

const App = () => {
  const { deletePlan, deleteProduct, deleteHistoryItem, updateOutflowMemo, loading } = useWysh();

  // Tab state
  const [activeTab, setActiveTab] = useState('calendar-view');

  // Selection states
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Modal open states
  const [planModal, setPlanModal] = useState({ isOpen: false, editPlanId: null });
  const [productModal, setProductModal] = useState({ isOpen: false });
  const [modifyQtyModal, setModifyQtyModal] = useState({ isOpen: false, planId: null });
  const [recipeDrawer, setRecipeDrawer] = useState({ isOpen: false, planId: null });
  const [memoModal, setMemoModal] = useState({ isOpen: false, planId: null, historyId: null, memo: '' });
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

  const handleOpenPlanRegistration = () => {
    setPlanModal({ isOpen: true, editPlanId: null });
  };

  const handleOpenPlanEdit = (planId) => {
    setPlanModal({ isOpen: true, editPlanId: planId });
  };

  const handleOpenRecipeDrawer = (planId) => {
    setRecipeDrawer({ isOpen: true, planId });
  };

  const handleOpenModifyQty = (planId) => {
    setModifyQtyModal({ isOpen: true, planId });
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
        // If selected plan was using this product, deselect it
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
      <header className="app-header">
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
            <h1>WYSH Production & Inventory</h1>
            <p>생산 계획 및 차수별 재고 통합 관리 솔루션</p>
          </div>
        </div>
        <HeaderStats />
      </header>

      {/* Main Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        // Refresh styles on switch
        if (tab === 'recipes-view' && !selectedProduct) {
          setSelectedProduct(null);
        }
      }} />

      {/* Main Content Tabs */}
      <main className={`tab-content ${activeTab === 'calendar-view' ? 'active' : ''}`} id="calendar-view">
        {activeTab === 'calendar-view' && (
          <CalendarView
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            onOpenRegisterModal={handleOpenPlanRegistration}
            onOpenEditModal={handleOpenPlanEdit}
            onOpenRecipeDrawer={handleOpenRecipeDrawer}
            onDeletePlan={handleDeletePlan}
          />
        )}
      </main>

      <section className={`tab-content ${activeTab === 'inventory-view' ? 'active' : ''}`} id="inventory-view">
        {activeTab === 'inventory-view' && (
          <InventoryView
            onOpenModifyQtyModal={handleOpenModifyQty}
            onDeleteHistory={handleDeleteHistory}
            onOpenMemoModal={(planId, historyId, memo) => setMemoModal({ isOpen: true, planId, historyId, memo })}
          />
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

      {/* Slide-out Drawer: Raw Material Recipe (원재료 배합표) */}
      <RecipeDrawer
        isOpen={recipeDrawer.isOpen}
        onClose={() => setRecipeDrawer({ isOpen: false, planId: null })}
        planId={recipeDrawer.planId}
      />

      {/* Popup Modal: Production Plan Registration */}
      <PlanRegistrationModal
        isOpen={planModal.isOpen}
        onClose={() => setPlanModal({ isOpen: false, editPlanId: null })}
        editPlanId={planModal.editPlanId}
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
        onClose={() => setModifyQtyModal({ isOpen: false, planId: null })}
        planId={modifyQtyModal.planId}
      />

      {/* Popup Modal: Outflow Memo View / Edit */}
      <MemoModal
        isOpen={memoModal.isOpen}
        onClose={() => setMemoModal(prev => ({ ...prev, isOpen: false }))}
        planId={memoModal.planId}
        historyId={memoModal.historyId}
        initialMemo={memoModal.memo}
        onSave={updateOutflowMemo}
      />

      {/* Popup Modal: Custom Deletion Confirmation */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
