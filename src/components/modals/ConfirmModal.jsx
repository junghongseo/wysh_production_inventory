import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ width: '380px', textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '16px', color: 'var(--color-danger)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
          {title || '정말 삭제하시겠습니까?'}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px', textAlign: 'center' }}>
          {message || '이 작업은 취소할 수 없습니다.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '10px', fontWeight: '600', justifyContent: 'center' }}>
            취소
          </button>
          <button type="button" className="btn-success" onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: '#ffffff', fontWeight: '600', justifyContent: 'center' }}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
