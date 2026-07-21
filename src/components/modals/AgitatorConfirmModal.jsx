import React, { useState, useEffect } from 'react';

const AgitatorConfirmModal = ({ isOpen, onConfirm, onClose }) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetText = '네 꺼져 있습니다.';
  const isMatch = inputValue.trim() === targetText;

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm();
    }
  };

  return (
    <div className="modal-overlay open" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ width: '420px', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '16px' }}>
        {/* Warning Icon Container */}
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--color-warning, #f59e0b)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>

        {/* Message */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)', textAlign: 'center', lineHeight: '1.4' }}>
          교반기가 켜져 있으면 요거트가 발효되지 않습니다.
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px', textAlign: 'center' }}>
          교반기가 OFF 상태인 것을 확인하셨나요?
        </p>

        {/* Input area */}
        <div style={{ width: '100%', marginBottom: '24px' }}>
          <label htmlFor="agitator-confirm-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'left' }}>
            아래에 똑같이 입력해주세요:
          </label>
          <input
            type="text"
            id="agitator-confirm-input"
            className="form-control"
            placeholder={targetText}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoComplete="off"
            style={{
              width: '100%',
              height: '42px',
              textAlign: 'center',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          />
          {inputValue && !isMatch && (
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-danger, #ef4444)', marginTop: '6px', textAlign: 'center' }}>
              글씨가 일치하지 않습니다.
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose} 
            style={{ flex: 1, padding: '10px', fontWeight: '600', justifyContent: 'center', height: '42px', borderRadius: '8px' }}
          >
            취소
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleConfirm}
            disabled={!isMatch}
            style={{ 
              flex: 1, 
              padding: '10px', 
              fontWeight: '700', 
              justifyContent: 'center', 
              height: '42px', 
              borderRadius: '8px',
              background: isMatch ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' : 'var(--bg-tertiary)',
              border: 'none',
              color: isMatch ? '#ffffff' : 'var(--text-muted)',
              cursor: isMatch ? 'pointer' : 'not-allowed',
              opacity: isMatch ? 1 : 0.6
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgitatorConfirmModal;
