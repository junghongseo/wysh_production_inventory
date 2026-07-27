import React from 'react';

const WyshTopTickerBar = () => {
  return (
    <div className="wysh-top-ticker-wrapper">
      <div className="wysh-top-announcement">
        <span>평일 오전 10시 이전 주문 시 당일 발송 🚚</span>
      </div>
      <div className="wysh-ticker-marquee">
        <div className="wysh-ticker-content">
          <span>WYSH PRODUCTION & INVENTORY MANAGEMENT SYSTEM</span>
          <span className="ticker-dot">•</span>
          <span>카카오톡 채널 추가 시 배송비 무료 쿠폰 증정 [CLICK]</span>
          <span className="ticker-dot">•</span>
          <span>실시간 차수별 재고 및 출고 관리 가동 중 [SYSTEM ONLINE]</span>
          <span className="ticker-dot">•</span>
          <span>WYSH PRODUCTION & INVENTORY MANAGEMENT SYSTEM</span>
          <span className="ticker-dot">•</span>
          <span>카카오톡 채널 추가 시 배송비 무료 쿠폰 증정 [CLICK]</span>
        </div>
      </div>
    </div>
  );
};

export default WyshTopTickerBar;
