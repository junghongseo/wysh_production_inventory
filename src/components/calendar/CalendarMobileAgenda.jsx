import React from 'react';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const formatDayHeading = (dateStr, todayStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
  return dateStr === todayStr ? `오늘 · ${label}` : label;
};

// 모바일 생산 일정: 달력 아래에 날짜별 일정 목록을 보여 준다.
// 일정을 누르면 상세가 하단 시트로 열리고, 메모는 바로 열람·등록할 수 있다.
const CalendarMobileAgenda = ({
  days,
  todayStr,
  selectedPlanId,
  canManagePlans,
  canEditNotes,
  onSelectPlan,
  onOpenNote,
  onRegister
}) => {
  const firstDate = days[0]?.dateStr;

  return (
    <section className="glass-card mobile-agenda" aria-label="날짜별 일정">
      <div className="mobile-agenda-head">
        <h3>{firstDate === todayStr ? '오늘부터 7일' : '선택한 날부터 7일'}</h3>
        {canManagePlans && (
          <button type="button" className="btn-primary mobile-agenda-register" onClick={onRegister}>
            + 생산계획 등록
          </button>
        )}
      </div>

      {days.map(({ dateStr, events, note }) => (
        <div key={dateStr} className={`mobile-agenda-day ${dateStr === todayStr ? 'is-today' : ''}`}>
          <div className="mobile-agenda-date">
            <span>{formatDayHeading(dateStr, todayStr)}</span>
            {!note && canEditNotes && (
              <button type="button" className="mobile-agenda-add-note" onClick={() => onOpenNote(dateStr, null)}>
                + 메모
              </button>
            )}
          </div>

          {events.length === 0 && !note && (
            <div className="mobile-agenda-empty">일정 없음</div>
          )}

          {events.map(evt => (
            <button
              key={evt.plan.id}
              type="button"
              className={`mobile-agenda-event ${selectedPlanId === evt.plan.id ? 'selected' : ''}`}
              onClick={() => onSelectPlan(evt.plan)}
            >
              <span className={`calendar-event event-color-${evt.color} ${evt.dayClass} mobile-agenda-swatch`} aria-hidden="true" />
              <span className="mobile-agenda-event-text">
                <strong>{evt.dayLabel}</strong>
                <span>{evt.plan.name}{evt.prodName && !evt.dayLabel.includes(evt.prodName) ? ` · ${evt.prodName}` : ''}</span>
              </span>
              <span className="mobile-agenda-chevron" aria-hidden="true">›</span>
            </button>
          ))}

          {note && (
            <button type="button" className="mobile-agenda-note" onClick={() => onOpenNote(dateStr, note)}>
              <strong>📌 {note.title}</strong>
              {note.content && <span>{note.content}</span>}
            </button>
          )}
        </div>
      ))}
    </section>
  );
};

export default CalendarMobileAgenda;
