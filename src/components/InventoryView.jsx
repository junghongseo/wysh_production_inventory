import React, { useState, useMemo, useCallback } from 'react';
import { useWysh } from '../WyshContext';

const InventoryView = ({ onOpenModifyQtyModal, onDeleteHistory, onOpenMemoModal, isAdminLoggedIn }) => {
  const { plans, products, inventory, addOutflow, updateOutflow, getInventoryRecord } = useWysh();

  const [outflowPlanId, setOutflowPlanId] = useState('');
  const [outflowQty, setOutflowQty] = useState('');
  const [outflowPurpose, setOutflowPurpose] = useState('');
  const [outflowDate, setOutflowDate] = useState('');
  const [outflowMemo, setOutflowMemo] = useState('');
  const [selectedInventoryPlanId, setSelectedInventoryPlanId] = useState(null);
  const [editingHistoryId, setEditingHistoryId] = useState(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'all'
  const [monthFilter, setMonthFilter] = useState(''); // 'YYYY-MM' or ''
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Local-time safe today string
  const todayStr = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split('T')[0];
  }, []);

  // Filter plans whose shipping limit has not passed AND bottling has completed (strictly for drop-down selection)
  const activePlans = useMemo(() => {
    return plans.filter(plan => plan.shippingLimit >= todayStr && todayStr >= plan.bottlingDate);
  }, [plans, todayStr]);

  // Extract list of months dynamically for dropdown filtering
  const uniqueMonths = useMemo(() => {
    const months = plans.map(p => p.startDate.substring(0, 7));
    return [...new Set(months)].sort((a, b) => b.localeCompare(a));
  }, [plans]);

  // Reset page number back to 1 on filter query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, monthFilter, searchTerm]);

  // Set default outflow date to todayStr
  React.useEffect(() => {
    if (todayStr) {
      setOutflowDate(todayStr);
    }
  }, [todayStr]);

  // Compute stats for all plans in the system
  const allInventoryData = useMemo(() => {
    return plans.map(plan => {
      const prod = products.find(p => p.id === plan.productId);
      const prodName = prod ? prod.name : '알수없음';
      
      const invRecord = inventory.find(i => i.planId === plan.id) || { actualQty: plan.totalQty, history: [] };
      const totalOutflows = invRecord.history ? invRecord.history.reduce((sum, item) => sum + item.qty, 0) : 0;
      const currentStock = invRecord.actualQty - totalOutflows;

      return {
        plan,
        prodName,
        actualQty: invRecord.actualQty,
        currentStock
      };
    });
  }, [plans, products, inventory]);

  // Apply filters on allInventoryData
  const filteredInventoryData = useMemo(() => {
    return allInventoryData.filter(item => {
      const { plan, prodName } = item;

      // Status filter
      if (statusFilter === 'active') {
        const isActive = plan.shippingLimit >= todayStr && todayStr >= plan.bottlingDate;
        if (!isActive) return false;
      }

      // Month filter
      if (monthFilter && !plan.startDate.startsWith(monthFilter)) {
        return false;
      }

      // Search term text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = plan.name.toLowerCase().includes(query);
        const matchId = plan.id.toLowerCase().includes(query);
        const matchProdName = prodName.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchProdName) return false;
      }

      return true;
    });
  }, [allInventoryData, statusFilter, monthFilter, searchTerm, todayStr]);

  // Paginate filtered plans list
  const totalPages = Math.ceil(filteredInventoryData.length / itemsPerPage);
  
  const paginatedInventoryData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredInventoryData.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredInventoryData, currentPage, itemsPerPage]);


  // Combine and sort outflow history
  const outflowHistory = useMemo(() => {
    const historyList = [];
    inventory.forEach(inv => {
      // Filter logs by selected plan if set
      if (selectedInventoryPlanId && inv.planId !== selectedInventoryPlanId) return;

      const plan = plans.find(p => p.id === inv.planId);
      const planName = plan ? plan.name : '삭제된 계획';
      
      if (inv.history) {
        inv.history.forEach(hist => {
          historyList.push({
            planId: inv.planId,
            planName: planName,
            ...hist
          });
        });
      }
    });
    // Sort strictly by date timestamp descending
    return historyList.sort((a, b) => new Date(b.date.replace(/-/g, '/')) - new Date(a.date.replace(/-/g, '/')));
  }, [inventory, plans, selectedInventoryPlanId]);

  // Handle start/cancel edit outflow
  const handleStartEdit = useCallback((item) => {
    setEditingHistoryId(item.id);
    setOutflowPlanId(item.planId);
    setOutflowDate(item.date.split(' ')[0]);
    setOutflowQty(item.qty.toString());
    setOutflowPurpose(item.purpose);
    setOutflowMemo(item.memo || '');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingHistoryId(null);
    setOutflowPlanId('');
    setOutflowQty('');
    setOutflowPurpose('');
    setOutflowMemo('');
    setOutflowDate(todayStr);
  }, [todayStr]);


  // Handle Outflow submission
  const handleOutflowSubmit = useCallback((e) => {
    e.preventDefault();
    const qty = parseInt(outflowQty) || 0;
    
    if (!outflowPlanId) {
      alert('출고할 생산 차수를 선택하세요.');
      return;
    }
    if (qty <= 0) {
      alert('출고 수량은 1개 이상이어야 합니다.');
      return;
    }
    if (!outflowPurpose.trim()) {
      alert('용도를 입력해 주세요.');
      return;
    }
    if (!outflowDate) {
      alert('출고 일자를 선택하세요.');
      return;
    }

    // Alert if future date is selected
    if (outflowDate > todayStr) {
      const confirmFuture = window.confirm(
        `⚠️ 선택한 출고 일자(${outflowDate})가 오늘 이후(미래)입니다. 그래도 반영하시겠습니까?`
      );
      if (!confirmFuture) return;
    }

    // Check inventory limit
    const record = getInventoryRecord(outflowPlanId);
    if (record) {
      const totalOutflows = record.history ? record.history.reduce((sum, item) => sum + item.qty, 0) : 0;
      const currentStock = record.actualQty - totalOutflows;

      let maxAvailable = currentStock;
      if (editingHistoryId) {
        const oldItem = record.history.find(h => h.id === editingHistoryId);
        if (oldItem) {
          maxAvailable += oldItem.qty;
        }
      }

      if (qty > maxAvailable) {
        alert(`출고 실패: 현재 재고 수량(${maxAvailable}개)을 초과하는 수량은 출고할 수 없습니다.`);
        return;
      }
    }

    // Append current time to date string
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const finalDateStr = `${outflowDate} ${timeStr}`;

    if (editingHistoryId) {
      updateOutflow(outflowPlanId, editingHistoryId, qty, outflowPurpose.trim(), finalDateStr, outflowMemo.trim());
      handleCancelEdit();
    } else {
      addOutflow(outflowPlanId, qty, outflowPurpose.trim(), finalDateStr, outflowMemo.trim());
      // Reset inputs
      setOutflowQty('');
      setOutflowPurpose('');
      setOutflowMemo('');
      setOutflowDate(todayStr);
    }
  }, [
    outflowQty,
    outflowPlanId,
    outflowPurpose,
    outflowDate,
    todayStr,
    getInventoryRecord,
    editingHistoryId,
    updateOutflow,
    handleCancelEdit,
    addOutflow
  ]);

  return (
    <div className="inventory-layout">
      {/* Upper Table: Batch Production Qty */}
      <div className="glass-card">
        <div className="inventory-header-row" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>차수별 생산 및 재고 리스트</h3>
        </div>

        {/* Filter / Search Bar */}
        <div className="inventory-filter-bar">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="계획명, 차수 ID, 제품명 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select 
              className="form-control" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="active">출고 가능 계획만 보기</option>
              <option value="all">전체 계획 보기</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select 
              className="form-control" 
              value={monthFilter} 
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">전체 월</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m.substring(0, 4)}년 {parseInt(m.substring(5, 7))}월</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="wysh-table-wrapper">
          <table className="wysh-table" id="inventory-table">
            <thead>
              <tr>
                <th>차수 ID</th>
                <th>생산 계획명</th>
                <th>출고기한</th>
                <th>소비기한</th>
                <th>생산 품목</th>
                <th style={{ textAlign: 'right' }}>계획 수량(개)</th>
                <th style={{ textAlign: 'right' }}>실제 입고(개)</th>
                <th style={{ textAlign: 'right' }}>현재 재고(개)</th>
                <th style={{ textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody id="inventory-table-body">
              {paginatedInventoryData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-state" style={{ textAlign: 'center', padding: '30px' }}>
                    조건에 부합하는 생산 차수가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedInventoryData.map(({ plan, prodName, actualQty, currentStock }) => {
                  const isSelected = selectedInventoryPlanId === plan.id;
                  return (
                    <tr 
                      key={plan.id}
                      className={`clickable-row ${isSelected ? 'selected-row' : ''}`}
                      onClick={() => setSelectedInventoryPlanId(isSelected ? null : plan.id)}
                    >
                      <td style={{ fontFamily: 'var(--font-outfit)', fontWeight: 600, color: 'var(--color-primary)' }}>{plan.id}</td>
                      <td style={{ fontWeight: 500 }}>{plan.name}</td>
                      <td style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)' }}>{plan.shippingLimit}</td>
                      <td style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)' }}>{plan.expiryDate}</td>
                      <td>{prodName}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{plan.totalQty.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600, color: 'var(--color-success)' }}>{actualQty.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 700, color: currentStock < 100 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                        {currentStock.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isAdminLoggedIn ? (
                          <button 
                            className="btn-secondary modify-qty-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenModifyQtyModal(plan.id);
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            실제 생산량 수정
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <button 
              className="pagination-btn" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
               <button 
                 key={pageNum}
                 className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                 onClick={() => setCurrentPage(pageNum)}
               >
                 {pageNum}
               </button>
            ))}
            <button 
              className="pagination-btn" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* Lower Split: Outflow Form & Timeline History */}
      <div className="inventory-grid-split">
        {/* Usage Input Form */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>사용(출고) {editingHistoryId ? '수정' : '입력'}</h3>
            {editingHistoryId && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCancelEdit}
                style={{ padding: '4px 8px', fontSize: '0.75rem', borderStyle: 'dashed' }}
              >
                수정 취소
              </button>
            )}
          </div>
          {!isAdminLoggedIn && (
            <div style={{
              background: 'rgba(14, 165, 233, 0.08)',
              border: '1px solid rgba(14, 165, 233, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '0.82rem',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
              lineHeight: '1.4'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              읽기 전용 상태입니다. 출고 정보 등록 및 수정은 관리자 로그인 후 사용하실 수 있습니다.
            </div>
          )}
          <form id="outflow-form" onSubmit={handleOutflowSubmit}>
            <div className="form-group">
              <label htmlFor="outflow-plan-select">출고 차수 선택</label>
              <select 
                className="form-control" 
                id="outflow-plan-select" 
                value={outflowPlanId}
                onChange={(e) => setOutflowPlanId(e.target.value)}
                disabled={!isAdminLoggedIn || !!editingHistoryId}
                required
              >
                <option value="" disabled>출고할 생산 차수를 선택하세요</option>
                {editingHistoryId && !activePlans.some(p => p.id === outflowPlanId) && (() => {
                  const plan = plans.find(p => p.id === outflowPlanId);
                  if (!plan) return null;
                  const prod = products.find(p => p.id === plan.productId);
                  const prodName = prod ? prod.name : '알수없음';
                  return (
                    <option key={plan.id} value={plan.id}>
                      [{plan.id}] {plan.name} ({prodName}) (출고 기한 경과)
                    </option>
                  );
                })()}
                {activePlans.map(plan => {
                  const prod = products.find(p => p.id === plan.productId);
                  const prodName = prod ? prod.name : '알수없음';
                  return (
                    <option key={plan.id} value={plan.id}>
                      [{plan.id}] {plan.name} ({prodName})
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-group-grid" style={{ gridTemplateColumns: '1.2fr 1fr 1.5fr' }}>
              <div className="form-group">
                <label htmlFor="outflow-date">출고 일자</label>
                <input 
                  type="date" 
                  className="form-control" 
                  id="outflow-date" 
                  value={outflowDate}
                  onChange={(e) => setOutflowDate(e.target.value)}
                  required 
                  disabled={!isAdminLoggedIn}
                />
              </div>
              <div className="form-group">
                <label htmlFor="outflow-qty">출고 수량 (개)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="outflow-qty" 
                  min="1" 
                  placeholder="수량 입력" 
                  value={outflowQty}
                  onChange={(e) => setOutflowQty(e.target.value)}
                  required 
                  disabled={!isAdminLoggedIn}
                />
              </div>
              <div className="form-group">
                <label htmlFor="outflow-purpose">용도 (예: 정상 출고, 마케팅 발송, 폐기 등)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="outflow-purpose" 
                  placeholder="용도 직접 입력" 
                  value={outflowPurpose}
                  onChange={(e) => setOutflowPurpose(e.target.value)}
                  required 
                  disabled={!isAdminLoggedIn}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="outflow-memo">메모 (선택사항)</label>
              <input 
                type="text" 
                className="form-control" 
                id="outflow-memo" 
                placeholder="출고와 관련된 세부 특이사항 메모를 입력하세요 (선택)" 
                value={outflowMemo}
                onChange={(e) => setOutflowMemo(e.target.value)}
                disabled={!isAdminLoggedIn}
              />
            </div>
            {isAdminLoggedIn && (
              <button type="submit" className={editingHistoryId ? "btn-primary" : "btn-success"} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {editingHistoryId ? (
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  ) : (
                    <polyline points="20 6 9 17 4 12"></polyline>
                  )}
                </svg>
                {editingHistoryId ? '출고 내역 수정완료' : '출고 내역 반영하기'}
              </button>
            )}
          </form>
        </div>

        {/* Outflow Timeline History */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>출고 히스토리</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span id="history-filter-badge" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedInventoryPlanId ? `[${selectedInventoryPlanId}] 내역` : '전체 내역'}
              </span>
              {selectedInventoryPlanId && (
                <button 
                  onClick={() => setSelectedInventoryPlanId(null)}
                  className="btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.75rem', borderStyle: 'dashed' }}
                >
                  전체 보기
                </button>
              )}
            </div>
          </div>
          <div className="history-timeline" id="inventory-history-timeline">
            {outflowHistory.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>출고 내역이 없습니다. 양식을 작성하여 반영해 보세요.</p>
              </div>
            ) : (
              outflowHistory.map(item => (
                <div 
                  key={item.id} 
                  className="timeline-item"
                  style={{
                    cursor: isAdminLoggedIn ? 'pointer' : 'default',
                    borderColor: editingHistoryId === item.id ? 'var(--color-primary)' : 'var(--border-color)',
                    background: editingHistoryId === item.id ? 'rgba(2, 132, 199, 0.05)' : 'var(--bg-secondary)',
                    transition: 'var(--transition-smooth)'
                  }}
                  onClick={isAdminLoggedIn ? () => handleStartEdit(item) : undefined}
                >
                  <div className="timeline-item-meta">
                    <span className="date">{item.date.split(' ')[0]}</span>
                    <span className="purpose">
                      <strong style={{ color: 'var(--color-primary)' }}>{item.planId}</strong>{' '}
                      ({item.purpose}) - {item.planName}
                    </span>
                  </div>
                  <div className="timeline-item-values" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.memo && (
                      <button 
                        type="button" 
                        title={isAdminLoggedIn ? "출고 메모 확인/수정" : "출고 메모 확인"} 
                        onClick={(e) => { e.stopPropagation(); onOpenMemoModal(item.planId, item.id, item.memo); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </button>
                    )}
                    <span className="qty">-{item.qty}개</span>
                    {isAdminLoggedIn && (
                      <button 
                        className="btn-delete-tiny" 
                        title="출고 취소"
                        onClick={(e) => { e.stopPropagation(); onDeleteHistory(item.planId, item.id); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
