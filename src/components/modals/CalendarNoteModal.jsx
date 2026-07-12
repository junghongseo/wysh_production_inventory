import React, { useState, useEffect, useRef } from 'react';

const CalendarNoteModal = ({ isOpen, onClose, dateStr, existingNote, onSave, onDelete }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const titleInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (existingNote) {
        setTitle(existingNote.title || '');
        setContent(existingNote.content || '');
      } else {
        setTitle('');
        setContent('');
      }
      
      // Auto focus on title input after opening animation
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 80);
    }
  }, [isOpen, existingNote]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('메모 제목을 입력해주세요.');
      return;
    }
    onSave(dateStr, title.trim(), content.trim());
    onClose();
  };

  const handleDeleteClick = () => {
    if (window.confirm('이 날짜의 메모를 정말로 삭제하시겠습니까?')) {
      onDelete(dateStr);
      onClose();
    }
  };

  return (
    <div className="modal-overlay open" id="calendar-note-modal">
      <div className="modal-content" style={{ width: '420px' }}>
        <div className="modal-header">
          <h3>📅 {existingNote ? '일정 메모 수정' : '일정 메모 등록'}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="detail-row" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>메모 일자</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>{dateStr}</strong>
            </div>
            
            <div className="form-group">
              <label htmlFor="note-title">메모 제목</label>
              <input 
                type="text" 
                className="form-control" 
                id="note-title" 
                ref={titleInputRef}
                placeholder="예: 원료유 입고 예정, 기계 점검" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={(e) => e.target.select()}
                required 
              />
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="note-content">상세 내용 (선택사항)</label>
              <textarea 
                className="form-control" 
                id="note-content" 
                rows="4"
                placeholder="상세한 메모 내용을 입력하세요" 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', fontSize: '0.9rem', padding: '10px' }}
              />
            </div>
          </div>
          <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, height: '38px', justifyContent: 'center' }}>
              취소
            </button>
            {existingNote && (
              <button 
                type="button" 
                className="btn-success" 
                onClick={handleDeleteClick} 
                style={{ 
                  flex: 1, 
                  height: '38px', 
                  justifyContent: 'center', 
                  backgroundColor: 'var(--color-danger)', 
                  borderColor: 'var(--color-danger)', 
                  color: '#ffffff' 
                }}
              >
                삭제
              </button>
            )}
            <button type="submit" className="btn-primary" style={{ flex: 1, height: '38px', justifyContent: 'center' }}>
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarNoteModal;
