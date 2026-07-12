import React, { useState, useMemo } from 'react';
import { useWysh } from '../WyshContext';

const CalendarView = ({ 
  selectedPlan, 
  setSelectedPlan, 
  onOpenRegisterModal, 
  onOpenEditModal, 
  onOpenRecipeDrawer, 
  onDeletePlan 
}) => {
  const { plans, products, inventory } = useWysh();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Find inventory record for the selected plan
  const selectedInvRecord = useMemo(() => {
    if (!selectedPlan) return null;
    return inventory.find(i => i.planId === selectedPlan.id) || null;
  }, [selectedPlan, inventory]);


  // Local-time safe YYYY-MM-DD formatter
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Safe add days to date string
  const addDays = (dateStr, days) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return formatDate(d);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Generate calendar days
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((firstDayOfMonth + totalDays) / 7) * 7;

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      let cellDate;
      let isCurrentMonth = true;

      if (i < firstDayOfMonth) {
        const dayNum = prevMonthTotalDays - firstDayOfMonth + i + 1;
        cellDate = new Date(year, month - 1, dayNum);
        isCurrentMonth = false;
      } else if (i >= firstDayOfMonth + totalDays) {
        const dayNum = i - (firstDayOfMonth + totalDays) + 1;
        cellDate = new Date(year, month + 1, dayNum);
        isCurrentMonth = false;
      } else {
        const dayNum = i - firstDayOfMonth + 1;
        cellDate = new Date(year, month, dayNum);
      }

      cells.push({
        date: cellDate,
        dateStr: formatDate(cellDate),
        isCurrentMonth
      });
    }
    return cells;
  }, [year, month]);

  const todayStr = formatDate(new Date());

  // Calculate layout slot indices to prevent overlapping plan blocks from snapping vertical positions
  const planSlots = useMemo(() => {
    // 1. Sort plans by start date so slots are assigned chronologically
    const sortedPlans = [...plans].sort((a, b) => a.startDate.localeCompare(b.startDate));
    
    // 2. Distribute plans to slots where they do not overlap
    const slots = []; // Array of arrays: [ [plan1, plan2], [plan3], ... ]
    const planToSlotMap = {};
    
    sortedPlans.forEach(plan => {
      let assignedSlotIdx = -1;
      
      for (let i = 0; i < slots.length; i++) {
        const isOverlap = slots[i].some(existingPlan => {
          const startA = existingPlan.startDate;
          const endA = existingPlan.bottlingDate;
          const startB = plan.startDate;
          const endB = plan.bottlingDate;
          // Overlaps if startA <= endB and startB <= endA
          return startA <= endB && startB <= endA;
        });
        
        if (!isOverlap) {
          assignedSlotIdx = i;
          break;
        }
      }
      
      if (assignedSlotIdx === -1) {
        assignedSlotIdx = slots.length;
        slots.push([plan]);
      } else {
        slots[assignedSlotIdx].push(plan);
      }
      
      planToSlotMap[plan.id] = assignedSlotIdx;
    });

    return {
      map: planToSlotMap,
      maxSlotCount: slots.length
    };
  }, [plans]);

  // Find product by plan
  const getProductForPlan = (productId) => {
    return products.find(p => p.id === productId);
  };

  // Right sidebar details calculations
  const selectedPlanDetails = useMemo(() => {
    if (!selectedPlan) return null;
    const plan = plans.find(p => p.id === selectedPlan.id);
    if (!plan) return null;
    const product = getProductForPlan(plan.productId);
    return {
      plan,
      product,
      prodName: product ? product.name : '알 수 없음',
      singleWeight: product ? product.weight : 0,
      yieldRate: product ? (product.yield || 28) : 0
    };
  }, [selectedPlan, plans, products]);

  // Compute remaining stock for the selected plan
  const selectedPlanStock = useMemo(() => {
    if (!selectedPlan) return 0;
    const record = selectedInvRecord || { actualQty: selectedPlan.totalQty, history: [] };
    const outflowSum = record.history ? record.history.reduce((sum, h) => sum + h.qty, 0) : 0;
    return record.actualQty - outflowSum;
  }, [selectedPlan, selectedInvRecord]);

  return (
    <div className="dashboard-grid">
      {/* Left: Calendar Area */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div className="calendar-header-wrapper">
          <div className="calendar-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {year}년 {month + 1}월 생산 일정
            </div>
            {selectedPlan && (
              <div className="calendar-info-banner" style={{ margin: '0 0 0 12px' }}>
                <span style={{ fontSize: '0.95rem' }}>💡</span>
                <span>선택된 계획 <strong>{selectedPlan.id}</strong>의 출고 이력 및 잔여 재고가 표시 중입니다.</span>
              </div>
            )}
          </div>
          <div className="calendar-controls">
            <button className="btn-icon" onClick={prevMonth} title="이전 달">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button className="btn-secondary" onClick={setToday} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>오늘</button>
            <button className="btn-icon" onClick={nextMonth} title="다음 달">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {/* Weekday headers */}
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div key={idx} className="calendar-weekday-cell">
              {day}
            </div>
          ))}

          {/* Calendar day cells */}
          {calendarCells.map((cell, idx) => {
            const isToday = cell.dateStr === todayStr;
            const isShippingHighlight = selectedPlan && cell.dateStr === selectedPlan.shippingLimit;
            const isExpiryHighlight = selectedPlan && cell.dateStr === selectedPlan.expiryDate;

            // Map plans active on this day to their corresponding precalculated slot positions
            const cellEvents = Array(planSlots.maxSlotCount).fill(null);

            plans.forEach((plan, planIdx) => {
              const prod = getProductForPlan(plan.productId);
              const prodName = prod ? prod.name : '알수없음';
              
              const d1 = plan.startDate;
              const d2 = addDays(d1, 1);
              const d3 = plan.bottlingDate;

              let isPlanDay = false;
              let dayLabel = '';
              let dayClass = '';

              if (cell.dateStr === d1) {
                isPlanDay = true;
                dayLabel = `🧪 발효 | ${prodName}`;
                dayClass = 'event-day-1';
              } else if (cell.dateStr === d2) {
                isPlanDay = true;
                dayLabel = `🌀 유청분리`;
                dayClass = 'event-day-2';
              } else if (cell.dateStr === d3) {
                isPlanDay = true;
                dayLabel = `🍼 병입 | 완료`;
                dayClass = 'event-day-3';
              }

              if (isPlanDay) {
                const assignedSlotIdx = planSlots.map[plan.id];
                if (assignedSlotIdx !== undefined && assignedSlotIdx >= 0) {
                  cellEvents[assignedSlotIdx] = {
                    plan,
                    prod,
                    prodName,
                    dayLabel,
                    dayClass,
                    planIdx
                  };
                }
              }
            });

            // Filter outflows related to the selected plan on this day
            const dayOutflows = selectedInvRecord?.history
              ? selectedInvRecord.history.filter(h => h.date.split(' ')[0] === cell.dateStr)
              : [];

            return (
              <div 
                key={idx} 
                className={`calendar-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isShippingHighlight ? 'highlight-shipping' : ''} ${isExpiryHighlight ? 'highlight-expiry' : ''}`}
                onClick={() => setSelectedPlan(null)}
              >
                <div className="day-number">{cell.date.getDate()}</div>
                
                <div className="calendar-events-container">
                  {/* Selected Plan Highlights */}
                  {isShippingHighlight && (
                    <div className="day-highlight-tag shipping" title={`남은 출고 가능 수량: ${selectedPlanStock}개`}>
                      🚚 최종출고 (남은재고: {selectedPlanStock.toLocaleString()}개)
                    </div>
                  )}
                  {isExpiryHighlight && (
                    <div className="day-highlight-tag expiry">
                      ⚠️ 소비기한
                    </div>
                  )}

                  {/* Rendered slots (events or placeholders) */}
                  {cellEvents.map((evt, slotIdx) => {
                    if (evt === null) {
                      return (
                        <div 
                          key={`empty-${slotIdx}`} 
                          className="calendar-event" 
                          style={{ 
                            visibility: 'hidden', 
                            pointerEvents: 'none', 
                            border: '1px solid transparent',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            lineHeight: '1.5',
                            margin: '0'
                          }}
                        >
                          &nbsp;
                        </div>
                      );
                    }

                    const { plan, prod, prodName, dayLabel, dayClass, planIdx } = evt;
                    const eventColor = prod?.color || ['blue', 'purple', 'green', 'orange', 'pink'][planIdx % 5];
                    const isSelected = selectedPlan?.id === plan.id;
                    const isDimmed = selectedPlan && selectedPlan.id !== plan.id;

                    return (
                      <div
                        key={plan.id}
                        className={`calendar-event ${dayClass} event-color-${eventColor} ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`}
                        title={`${plan.name} (${prodName} ${plan.totalQty}개)\n1일차: 발효 | 2일차: 유청분리 | 3일차: 병입`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan);
                        }}
                      >
                        {dayLabel}
                      </div>
                    );
                  })}

                  {/* Render Outflow Histories for Selected Plan on this day */}
                  {dayOutflows.map(outflow => (
                    <div 
                      key={outflow.id} 
                      className="day-outflow-tag" 
                      title={`용도: ${outflow.purpose}\n출고 수량: ${outflow.qty}개`}
                    >
                      📉 {outflow.purpose} -{outflow.qty}개
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Right: Selected Plan Detail Panel */}
      <div className="dashboard-detail-panel">
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="detail-header">
            <h3>선택된 생산 계획 상세 정보</h3>
          </div>
          
          <div id="plan-detail-content" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginTop: '16px' }}>
            {!selectedPlanDetails ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>달력에서 일정을 선택하면 상세 정보 및 레시피가 활성화됩니다.</p>
              </div>
            ) : (
              <>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">차수 ID</span>
                    <span className="value highlight" style={{ color: 'var(--color-primary)' }}>{selectedPlanDetails.plan.id}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">생산 계획명</span>
                    <span className="value" style={{ fontWeight: 600 }}>{selectedPlanDetails.plan.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">생산 품목</span>
                    <span className="value">{selectedPlanDetails.prodName} ({selectedPlanDetails.singleWeight}g, 수율 {selectedPlanDetails.yieldRate}%)</span>
                  </div>
                  <div className="info-row">
                    <span className="label">가동 발효기</span>
                    <span className="value fermenter">{selectedPlanDetails.plan.fermenterType === 'small' ? '소형 발효기' : '대형 발효기'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">원재료 총 투입량</span>
                    <span className="value highlight" style={{ color: 'var(--color-success)' }}>{selectedPlanDetails.plan.totalVolumeL.toFixed(2)} L</span>
                  </div>
                  <div className="info-row">
                    <span className="label">1일차 [발효]</span>
                    <span className="value">{selectedPlanDetails.plan.startDate}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">3일차 [병입]</span>
                    <span className="value">{selectedPlanDetails.plan.bottlingDate}</span>
                  </div>
                  
                  <div className="info-row" style={{ border: '1px dashed var(--color-warning)' }}>
                    <span className="label" style={{ color: 'var(--color-warning)' }}>🚚 최종 출고기한</span>
                    <span className="value" style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{selectedPlanDetails.plan.shippingLimit}</span>
                  </div>
                  <div className="info-row" style={{ border: '1px dashed var(--color-danger)' }}>
                    <span className="label" style={{ color: 'var(--color-danger)' }}>⚠️ 최종 소비기한</span>
                    <span className="value" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{selectedPlanDetails.plan.expiryDate}</span>
                  </div>
                  
                  <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>주문(7일)</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>{selectedPlanDetails.plan.avgOrderQty * 7}</div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>마케팅</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>{selectedPlanDetails.plan.marketingQty}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>여유분</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>{selectedPlanDetails.plan.bufferQty}</div>
                    </div>
                  </div>
                  
                  <div className="info-row" style={{ background: 'rgba(56,189,248,0.05)', borderColor: 'rgba(56,189,248,0.2)' }}>
                    <span className="label" style={{ color: 'var(--color-primary)' }}>총 생산 목표량</span>
                    <span className="value" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{selectedPlanDetails.plan.totalQty.toLocaleString()} 개</span>
                  </div>
                </div>
                
                <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                  <button className="btn-success" onClick={() => onOpenRecipeDrawer(selectedPlanDetails.plan.id)} style={{ flex: 1.2, justifyContent: 'center', fontSize: '0.85rem', padding: '6px 4px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    배합표 보기
                  </button>
                  <button className="btn-primary" onClick={() => onOpenEditModal(selectedPlanDetails.plan.id)} style={{ flex: 1.2, justifyContent: 'center', fontSize: '0.85rem', padding: '6px 4px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                    </svg>
                    수정하기
                  </button>
                  <button className="btn-secondary btn-delete-plan" onClick={() => onDeletePlan(selectedPlanDetails.plan.id)} style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--color-danger)', padding: '0 10px' }} title="계획 삭제">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <button className="btn-primary" onClick={onOpenRegisterModal} style={{ width: '100%', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              새 생산계획 등록하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
