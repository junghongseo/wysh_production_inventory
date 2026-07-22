import React from 'react';

const CalendarHeaderControls = ({ 
  currentDate, 
  onPrevMonth, 
  onNextMonth, 
  onSetToday, 
  onOpenRegisterModal, 
  isAdminLoggedIn 
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  return (
    <div className="calendar-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          {year}년 {month}월 생산 일정
        </h2>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            className="btn-secondary" 
            onClick={onPrevMonth}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            ◀ 이전달
          </button>
          <button 
            className="btn-secondary" 
            onClick={onSetToday}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            오늘
          </button>
          <button 
            className="btn-secondary" 
            onClick={onNextMonth}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            다음달 ▶
          </button>
        </div>
      </div>

      {isAdminLoggedIn && (
        <button 
          className="btn-primary" 
          onClick={() => onOpenRegisterModal()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          생산 계획 등록
        </button>
      )}
    </div>
  );
};

export default CalendarHeaderControls;
