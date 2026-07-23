import React, { useState, useMemo, useCallback } from 'react';
import { useWysh } from '../WyshContext';

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

const CalendarView = ({ 
  selectedPlan, 
  setSelectedPlan, 
  onOpenRegisterModal, 
  onOpenEditModal, 
  onOpenRecipeDrawer, 
  onDeletePlan,
  onOpenNoteModal,
  isAdminLoggedIn
}) => {
  const { plans, products, inventory, calendarNotes } = useWysh();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateNote, setSelectedDateNote] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSubProductId, setSelectedSubProductId] = useState('ALL');

  // Find inventory record for the selected plan
  const selectedInvRecord = useMemo(() => {
    if (!selectedPlan) return null;
    return inventory.find(i => i.planId === selectedPlan.id) || null;
  }, [selectedPlan, inventory]);

  const nextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const prevMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const setToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

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

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Calculate layout slot indices to prevent overlapping plan blocks from snapping vertical positions
  const planSlots = useMemo(() => {
    // 1. Sort plans by start date so slots are assigned chronologically
    const sortedPlans = [...plans].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    
    // 2. Distribute plans to slots where they do not overlap
    const slots = []; // Array of arrays: [ [plan1, plan2], [plan3], ... ]
    const planToSlotMap = {};
    
    sortedPlans.forEach(plan => {
      let assignedSlotIdx = -1;
      
      for (let i = 0; i < slots.length; i++) {
        const isOverlap = slots[i].some(existingPlan => {
          const startA = existingPlan.startDate || '';
          const endA = existingPlan.bottlingDate || startA;
          const startB = plan.startDate || '';
          const endB = plan.bottlingDate || startB;
          if (!startA || !startB) return false;
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

  // Pre-calculate active plan events on all days to prevent nested loops in rendering
  const cellEventsMap = useMemo(() => {
    const map = {};
    calendarCells.forEach(cell => {
      const cellEvents = Array(planSlots.maxSlotCount).fill(null);
      plans.forEach((plan, planIdx) => {
        if (plan.planType === 'sub_ingredient') {
          const subProd = products.find(p => p.id === plan.subProductId);
          const targetYogurt = products.find(p => p.id === plan.targetYogurtProductId);
          const subProdName = subProd ? subProd.name : '부재료';
          const targetYogurtName = targetYogurt ? targetYogurt.name : '';

          if (cell.dateStr === plan.startDate) {
            const assignedSlotIdx = planSlots.map[plan.id];
            if (assignedSlotIdx !== undefined && assignedSlotIdx >= 0) {
              cellEvents[assignedSlotIdx] = {
                plan,
                prod: subProd,
                prodName: subProdName,
                dayLabel: `🍞 [부재료] ${subProdName} (${targetYogurtName} ${plan.targetYogurtQty || 0}개분)`,
                dayClass: 'event-day-sub',
                planIdx,
                isMulti: false
              };
            }
          }
          return;
        }

        const planItems = plan.items && Array.isArray(plan.items) && plan.items.length > 0 ? plan.items : [{ productId: plan.productId }];
        const isMulti = planItems.length > 1;

        const prodNames = planItems.map(it => {
          const p = products.find(prod => prod.id === it.productId);
          return p ? p.name : '';
        }).filter(Boolean).join(' + ');

        const prod = products.find(p => p.id === plan.productId);
        const prodName = isMulti ? prodNames : (prod ? prod.name : '알수없음');
        
        const d1 = plan.startDate;
        const d3 = plan.bottlingDate;

        let isPlanDay = false;
        let dayLabel = '';
        let dayClass = '';

        if (cell.dateStr === d1) {
          isPlanDay = true;
          dayLabel = isMulti ? `✨ 2종 동시 | 🧪 발효 | ${prodName}` : `🧪 발효 | ${prodName}`;
          dayClass = 'event-day-1';
        } else if (cell.dateStr === d3) {
          isPlanDay = true;
          dayLabel = isMulti ? `✨ 2종 동시 | 🍼 병입` : `🍼 병입 | 완료`;
          dayClass = 'event-day-3';
        } else if (cell.dateStr > d1 && cell.dateStr < d3) {
          isPlanDay = true;
          dayLabel = isMulti ? `✨ 2종 동시 | 🌀 유청분리` : `🌀 유청분리`;
          dayClass = 'event-day-2';
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
              planIdx,
              isMulti
            };
          }
        }
      });
      map[cell.dateStr] = cellEvents;
    });
    return map;
  }, [calendarCells, plans, products, planSlots]);

  // Right sidebar details calculations for all items
  const selectedPlanDetails = useMemo(() => {
    if (!selectedPlan) return null;
    const plan = plans.find(p => p.id === selectedPlan.id);
    if (!plan) return null;

    const planItems = plan.items && Array.isArray(plan.items) && plan.items.length > 0
      ? plan.items
      : [{
          productId: plan.productId,
          expectedOrderQty: plan.expectedOrderQty,
          marketingQty: plan.marketingQty,
          bufferQty: plan.bufferQty,
          totalQty: plan.totalQty,
          bottlingDate: plan.bottlingDate,
          shippingLimit: plan.shippingLimit,
          expiryDate: plan.expiryDate
        }];

    const invRecord = inventory.find(i => i.planId === plan.id) || { actualQty: plan.totalQty, history: [] };
    const isMulti = planItems.length > 1;

    const itemDetails = planItems.map(it => {
      const prod = products.find(p => p.id === it.productId);
      const prodName = prod ? prod.name : '알 수 없음';
      const weight = prod ? prod.weight : 0;
      const yieldRate = prod ? (prod.yield || 28) : 0;

      const plannedQty = it.totalQty || ((it.expectedOrderQty || 0) + (it.marketingQty || 0) + (it.bufferQty || 0));

      let itemActualQty = plannedQty;
      if (invRecord.itemActualQtys && invRecord.itemActualQtys[it.productId] !== undefined) {
        itemActualQty = invRecord.itemActualQtys[it.productId];
      } else if (!isMulti && invRecord.actualQty !== undefined) {
        itemActualQty = invRecord.actualQty;
      }

      const itemOutflows = (invRecord.history || []).reduce((sum, h) => {
        if (!isMulti || !h.productId || h.productId === it.productId) {
          return sum + (h.qty || 0);
        }
        return sum;
      }, 0);

      const currentStock = itemActualQty - itemOutflows;

      const botDate = it.bottlingDate || plan.bottlingDate;
      const shipLimit = it.shippingLimit || (botDate ? addDays(botDate, prod ? (prod.shippingLimitDays ?? 7) : 7) : plan.shippingLimit);
      const expDate = it.expiryDate || (botDate ? addDays(botDate, prod ? (prod.expiryDays ?? 22) : 22) : plan.expiryDate);

      return {
        ...it,
        prod,
        prodName,
        weight,
        yieldRate,
        plannedQty,
        itemActualQty,
        currentStock,
        bottlingDate: botDate,
        shippingLimit: shipLimit,
        expiryDate: expDate
      };
    });

    return {
      plan,
      items: itemDetails
    };
  }, [selectedPlan, plans, products, inventory]);

  // Active highlights per cell based on selected sub-product filter
  const activeHighlights = useMemo(() => {
    if (!selectedPlanDetails) return { shipping: [], expiry: [] };
    
    const shipping = [];
    const expiry = [];

    selectedPlanDetails.items.forEach((it, idx) => {
      if (selectedSubProductId !== 'ALL' && selectedSubProductId !== it.productId) return;

      if (it.shippingLimit) {
        shipping.push({
          productId: it.productId,
          prodName: it.prodName,
          dateStr: it.shippingLimit,
          currentStock: it.currentStock,
          itemIndex: idx + 1
        });
      }
      if (it.expiryDate) {
        expiry.push({
          productId: it.productId,
          prodName: it.prodName,
          dateStr: it.expiryDate,
          itemIndex: idx + 1
        });
      }
    });

    return { shipping, expiry };
  }, [selectedPlanDetails, selectedSubProductId]);

  const handleDayClick = useCallback((dateStr) => {
    setSelectedPlan(null);
    setSelectedSubProductId('ALL');
    setSelectedDate(dateStr);
    const note = calendarNotes.find(n => n.dateStr === dateStr) || null;
    setSelectedDateNote(note);
  }, [setSelectedPlan, setSelectedDate, calendarNotes, setSelectedDateNote]);

  const handleDayDoubleClick = useCallback((dateStr) => {
    const existing = calendarNotes.find(n => n.dateStr === dateStr) || null;
    onOpenNoteModal(dateStr, existing);
  }, [calendarNotes, onOpenNoteModal]);

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
              <div className="calendar-info-banner" style={{ margin: '0 0 0 12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.95rem' }}>💡</span>
                <span>선택 차수: <strong>{selectedPlan.id}</strong></span>
                {selectedPlanDetails && selectedPlanDetails.items.length > 1 && (
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
                    <button
                      type="button"
                      className={`btn-secondary ${selectedSubProductId === 'ALL' ? 'active' : ''}`}
                      onClick={() => setSelectedSubProductId('ALL')}
                      style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '10px' }}
                    >
                      🌐 전체 보기
                    </button>
                    {selectedPlanDetails.items.map((it, idx) => (
                      <button
                        key={it.productId}
                        type="button"
                        className={`btn-secondary ${selectedSubProductId === it.productId ? 'active' : ''}`}
                        onClick={() => setSelectedSubProductId(it.productId)}
                        style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '10px' }}
                      >
                        품목 {idx + 1}: {it.prodName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="calendar-controls">
            <button className="btn-icon" onClick={prevMonth} title="이전 달">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button className="btn-secondary" onClick={setToday} style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}>오늘</button>
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

            const dayShippingList = activeHighlights.shipping.filter(h => h.dateStr === cell.dateStr);
            const dayExpiryList = activeHighlights.expiry.filter(h => h.dateStr === cell.dateStr);

            const isShippingHighlight = dayShippingList.length > 0;
            const isExpiryHighlight = dayExpiryList.length > 0;

            // Retrieve pre-calculated cell events slots in O(1) time
            const cellEvents = (cellEventsMap && cellEventsMap[cell.dateStr]) || Array(planSlots.maxSlotCount).fill(null);

            // Filter outflows related to the selected plan and sub-product on this day
            const dayOutflows = selectedInvRecord?.history
              ? selectedInvRecord.history.filter(h => {
                  const hDate = (h.date || '').split(' ')[0];
                  if (hDate !== cell.dateStr) return false;
                  if (selectedSubProductId !== 'ALL' && h.productId && h.productId !== selectedSubProductId) return false;
                  return true;
                })
              : [];

            return (
              <div 
                key={idx} 
                className={`calendar-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isShippingHighlight ? 'highlight-shipping' : ''} ${isExpiryHighlight ? 'highlight-expiry' : ''} ${calendarNotes.some(n => n.dateStr === cell.dateStr) ? 'has-note' : ''}`}
                onClick={() => handleDayClick(cell.dateStr)}
                onDoubleClick={() => handleDayDoubleClick(cell.dateStr)}
                style={{ cursor: 'pointer' }}
              >
                <div className="day-number-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                  {(() => {
                    const cellNote = calendarNotes.find(n => n.dateStr === cell.dateStr);
                    return cellNote ? (
                      <span 
                        className="day-note-badge" 
                        title={`제목: ${cellNote.title}\n내용: ${cellNote.content}`}
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 600, 
                          color: 'var(--color-primary)', 
                          background: 'rgba(14, 165, 233, 0.1)', 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          maxWidth: '70%', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}
                      >
                        📌 {cellNote.title}
                      </span>
                    ) : null;
                  })()}
                  <div className="day-number" style={{ marginLeft: 'auto' }}>{cell.date.getDate()}</div>
                </div>
                
                <div className="calendar-events-container">
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
                        title={`${plan.name} (${prodName})\n1일차: 발효 | 2일차: 유청분리 | 3일차: 병입`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan);
                          setSelectedSubProductId('ALL');
                          setSelectedDate(null);
                          setSelectedDateNote(null);
                        }}
                      >
                        {dayLabel}
                      </div>
                    );
                  })}

                  {/* Selected Plan Highlights per item */}
                  {dayShippingList.map((h, i) => (
                    <div key={`ship-${i}`} className="day-highlight-tag shipping" title={`${h.prodName} 남은 출고 가능 수량: ${h.currentStock}개`}>
                      🚚 {selectedPlanDetails.items.length > 1 ? `[품목${h.itemIndex}] ` : ''}최종출고 ({h.currentStock.toLocaleString()}개)
                    </div>
                  ))}
                  {dayExpiryList.map((h, i) => (
                    <div key={`exp-${i}`} className="day-highlight-tag expiry">
                      ⚠️ {selectedPlanDetails.items.length > 1 ? `[품목${h.itemIndex}] ` : ''}소비기한
                    </div>
                  ))}

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


      {/* Right: Detail Panel */}
      <div className="dashboard-detail-panel">
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="detail-header">
            <h3>상세 정보</h3>
          </div>
          
          <div id="plan-detail-content" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginTop: '16px' }}>
            {!selectedPlanDetails && !selectedDate ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>달력에서 일정을 클릭하여 상세 정보를 확인하거나, 일반 날짜를 터치하여 새 메모를 등록해 보세요.</p>
              </div>
            ) : selectedPlanDetails ? (
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
                    <span className="label">가동 발효기</span>
                    <span className="value fermenter">{selectedPlanDetails.plan.fermenterType === 'small' ? '소형 발효기' : '대형 발효기'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">원재료 총 투입량</span>
                    <span className="value highlight" style={{ color: 'var(--color-success)' }}>{selectedPlanDetails.plan.totalVolumeL.toFixed(2)} L</span>
                  </div>
                  <div className="info-row">
                    <span className="label">1일차 [발효 시작]</span>
                    <span className="value">{selectedPlanDetails.plan.startDate}</span>
                  </div>
                  
                  {selectedPlanDetails.items.length > 1 && (
                    <div style={{ margin: '10px 0 6px 0', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                        🎯 캘린더 달력 기한/재고 하이라이트 선택:
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={`btn-secondary ${selectedSubProductId === 'ALL' ? 'active' : ''}`}
                          onClick={() => setSelectedSubProductId('ALL')}
                          style={{ padding: '3px 9px', fontSize: '0.75rem', borderRadius: '12px', background: selectedSubProductId === 'ALL' ? 'var(--color-primary)' : '', color: selectedSubProductId === 'ALL' ? '#fff' : '' }}
                        >
                          🌐 전체 품목 보기
                        </button>
                        {selectedPlanDetails.items.map((it, idx) => (
                          <button
                            key={it.productId}
                            type="button"
                            className={`btn-secondary ${selectedSubProductId === it.productId ? 'active' : ''}`}
                            onClick={() => setSelectedSubProductId(it.productId)}
                            style={{ padding: '3px 9px', fontSize: '0.75rem', borderRadius: '12px', background: selectedSubProductId === it.productId ? (idx === 0 ? 'var(--color-primary)' : '#a855f7') : '', color: selectedSubProductId === it.productId ? '#fff' : '' }}
                          >
                            품목 {idx + 1}: {it.prodName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Card for Each Item */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                    {selectedPlanDetails.items.map((it, idx) => (
                      <div 
                        key={idx}
                        style={{
                          background: idx === 0 ? 'rgba(2, 132, 199, 0.04)' : 'rgba(168, 85, 247, 0.04)',
                          border: `1px solid ${idx === 0 ? 'rgba(2, 132, 199, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                          borderRadius: '10px',
                          padding: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            background: idx === 0 ? 'var(--color-primary)' : '#a855f7', 
                            color: '#fff', 
                            padding: '2px 8px', 
                            borderRadius: '10px' 
                          }}>
                            품목 {idx + 1}
                          </span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{it.prodName}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({it.weight}g, 수율 {it.yieldRate}%)</span>
                        </div>

                        <div className="info-grid" style={{ gap: '6px' }}>
                          <div className="info-row" style={{ padding: '2px 0' }}>
                            <span className="label" style={{ fontSize: '0.78rem' }}>병입 일자</span>
                            <span className="value" style={{ fontSize: '0.82rem', fontWeight: 600 }}>{it.bottlingDate}</span>
                          </div>
                          <div className="info-row" style={{ padding: '4px 6px', border: '1px dashed var(--color-warning)', borderRadius: '6px' }}>
                            <span className="label" style={{ color: 'var(--color-warning)', fontSize: '0.75rem' }}>🚚 최종 출고기한</span>
                            <span className="value" style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.82rem' }}>{it.shippingLimit}</span>
                          </div>
                          <div className="info-row" style={{ padding: '4px 6px', border: '1px dashed var(--color-danger)', borderRadius: '6px' }}>
                            <span className="label" style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>⚠️ 최종 소비기한</span>
                            <span className="value" style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.82rem' }}>{it.expiryDate}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '6px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>주문예상</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{it.expectedOrderQty || 0}</div>
                          </div>
                          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>마케팅</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{it.marketingQty || 0}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>여유분</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{it.bufferQty || 0}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>목표 수량: <strong>{it.plannedQty.toLocaleString()}개</strong></span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: it.currentStock < 100 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                            현재 재고: {it.currentStock.toLocaleString()}개
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedPlanDetails.plan.memo && (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        생산 메모
                      </div>
                      <div style={{ lineHeight: '1.4' }}>{selectedPlanDetails.plan.memo}</div>
                    </div>
                  )}
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
                  {isAdminLoggedIn && (
                    <>
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
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="info-grid">
                  <div className="info-row" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>구분</span>
                    <strong style={{ color: 'var(--color-primary)' }}>📅 일반 날짜 메모</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">메모 일자</span>
                    <span className="value" style={{ fontWeight: 600 }}>{selectedDate}</span>
                  </div>
                  {selectedDateNote ? (
                    <>
                      <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                        <span className="label">메모 제목</span>
                        <span className="value" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedDateNote.title}</span>
                      </div>
                      <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px', marginTop: '8px', borderBottom: 'none' }}>
                        <span className="label">메모 상세 내용</span>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', width: '100%', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                          {selectedDateNote.content || '(입력된 상세 내용이 없습니다)'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state" style={{ minHeight: '100px', padding: '20px 10px' }}>
                      <p style={{ fontSize: '0.85rem' }}>이 날짜에 등록된 메모가 없습니다.</p>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '16px' }}>
                  {selectedDateNote ? (
                    <button 
                      className="btn-secondary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => onOpenNoteModal(selectedDate, selectedDateNote)}
                    >
                      📝 {isAdminLoggedIn ? '메모 수정 / 삭제' : '메모 상세보기'}
                    </button>
                  ) : (
                    isAdminLoggedIn && (
                      <button 
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => onOpenNoteModal(selectedDate, selectedDateNote)}
                      >
                        📝 새 메모 등록하기
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
          
          {isAdminLoggedIn && (
            <div style={{ marginTop: '20px' }}>
              <button className="btn-primary" onClick={() => onOpenRegisterModal(selectedPlan ? null : selectedDate)} style={{ width: '100%', justifyContent: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                새 생산계획 등록하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
