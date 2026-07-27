import React, { useState, useEffect } from 'react';
import { useWysh } from '../../WyshContext';

const AppSettingsModal = ({ isOpen, onClose }) => {
  const { bannerSettings, updateBannerSettings, resetBannerSettings } = useWysh();

  const [topBannerText, setTopBannerText] = useState('');
  const [tickerBannerText, setTickerBannerText] = useState('');
  const [topBannerEnabled, setTopBannerEnabled] = useState(true);
  const [tickerBannerEnabled, setTickerBannerEnabled] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    if (bannerSettings) {
      setTopBannerText(bannerSettings.topBannerText || '');
      setTickerBannerText(bannerSettings.tickerBannerText || '');
      setTopBannerEnabled(bannerSettings.topBannerEnabled ?? true);
      setTickerBannerEnabled(bannerSettings.tickerBannerEnabled ?? true);
    }
  }, [bannerSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    updateBannerSettings({
      topBannerText,
      tickerBannerText,
      topBannerEnabled,
      tickerBannerEnabled
    });
    setSaveSuccessMsg('✅ 배너 설정이 성공적으로 저장되었습니다!');
    setTimeout(() => {
      setSaveSuccessMsg('');
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (window.confirm('배너 문구 및 설정을 기본값으로 복원하시겠습니까?')) {
      resetBannerSettings();
      setSaveSuccessMsg('🔄 배너 설정이 기본값으로 복원되었습니다.');
      setTimeout(() => setSaveSuccessMsg(''), 1500);
    }
  };

  return (
    <div 
      className="modal-overlay open" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11000,
        padding: '16px'
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', width: '100%', margin: 'auto' }}>
        <div className="modal-header">
          <h2>⚙️ 앱 배너 설정 (관리자 전용)</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {saveSuccessMsg && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
              {saveSuccessMsg}
            </div>
          )}

          {/* Section 1: Top Announcement Banner Toggle & Input */}
          <div style={{ background: 'var(--bg-tertiary, #f8fafc)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>📢 1. 최상단 고정 띠 배너</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>화면 맨 위 1열 고정 띠 배너를 개별 ON/OFF 합니다.</div>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                <input 
                  type="checkbox" 
                  checked={topBannerEnabled} 
                  onChange={(e) => setTopBannerEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: topBannerEnabled ? '#000000' : '#ccc',
                  transition: '.3s',
                  borderRadius: '26px'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px', width: '20px',
                    left: topBannerEnabled ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '.3s',
                    borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>
            <input
              type="text"
              value={topBannerText}
              onChange={(e) => setTopBannerText(e.target.value)}
              placeholder="예: 평일 오전 10시 이전 주문 시 당일 발송 🚚"
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: topBannerEnabled ? '#ffffff' : '#f1f5f9' }}
              disabled={!topBannerEnabled}
            />
          </div>

          {/* Section 2: Marquee Ticker Banner Toggle & Input */}
          <div style={{ background: 'var(--bg-tertiary, #f8fafc)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>🎰 2. 전광판 롤링 마키(Ticker) 배너</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>배너 바로 아래 흐르는 전광판 배너를 개별 ON/OFF 합니다.</div>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                <input 
                  type="checkbox" 
                  checked={tickerBannerEnabled} 
                  onChange={(e) => setTickerBannerEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: tickerBannerEnabled ? '#000000' : '#ccc',
                  transition: '.3s',
                  borderRadius: '26px'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px', width: '20px',
                    left: tickerBannerEnabled ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '.3s',
                    borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>
            <textarea
              rows="3"
              value={tickerBannerText}
              onChange={(e) => setTickerBannerText(e.target.value)}
              placeholder="예: 카카오톡 채널 추가 시 배송비 무료 쿠폰 증정 [CLICK]"
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.88rem', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'vertical', backgroundColor: tickerBannerEnabled ? '#ffffff' : '#f1f5f9' }}
              disabled={!tickerBannerEnabled}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', pt: '12px', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              💾 저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppSettingsModal;
