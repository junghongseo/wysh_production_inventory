import React, { useState, useEffect } from 'react';

const MemoModal = ({ isOpen, onClose, planId, historyId, initialMemo, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [memoText, setMemoText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMemoText(initialMemo || '');
      setIsEditing(false);
    }
  }, [isOpen, initialMemo]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(planId, historyId, memoText.trim());
    setIsEditing(false);
    onClose();
  };

  return (
    <div className="modal-overlay open" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ width: '420px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            출고 메모 관리
          </h3>
          <button className="btn-icon" onClick={onClose} aria-label="닫기" style={{ margin: '-8px -8px 0 0' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '0 0 20px 0' }}>
          <div style={{ marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            차수 ID: <strong style={{ color: 'var(--color-primary)' }}>{planId}</strong>
          </div>
          
          {isEditing ? (
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="memo-textarea" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>메모 수정</label>
              <textarea
                id="memo-textarea"
                className="form-control"
                style={{ width: '100%', height: '120px', resize: 'none', padding: '10px', fontSize: '0.9rem', lineHeight: '1.5', fontFamily: 'var(--font-sans)' }}
                placeholder="출고와 관련된 세부 메모를 입력하세요 (예: 거래처 요청 사항, 배송 특이사항 등)"
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                onFocus={(e) => e.target.select()}
                autoFocus
              />
            </div>
          ) : (
            <div>
              <div style={{ 
                background: 'var(--bg-card-hover)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '16px', 
                minHeight: '100px', 
                fontSize: '0.92rem', 
                lineHeight: '1.6', 
                whiteSpace: 'pre-wrap',
                color: memoText ? 'var(--text-primary)' : 'var(--text-muted)',
                fontStyle: memoText ? 'normal' : 'italic'
              }}>
                {memoText || '등록된 메모가 없습니다.'}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '16px 0 0 0', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {isEditing ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)} style={{ width: '110px', justifyContent: 'center' }}>
                취소
              </button>
              <button type="button" className="btn-success" onClick={handleSave} style={{ width: '110px', justifyContent: 'center' }}>
                저장
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={onClose} style={{ width: '110px', justifyContent: 'center' }}>
                닫기
              </button>
              <button type="button" className="btn-primary" onClick={() => setIsEditing(true)} style={{ width: '110px', justifyContent: 'center' }}>
                수정
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoModal;
