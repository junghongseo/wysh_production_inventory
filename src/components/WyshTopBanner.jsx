import React from 'react';
import { useWysh } from '../WyshContext';

const WyshTopBanner = () => {
  const { bannerSettings } = useWysh();

  if (!bannerSettings) return null;

  const {
    topBannerText,
    tickerBannerText,
    topBannerEnabled = true,
    tickerBannerEnabled = true
  } = bannerSettings;

  if (!topBannerEnabled && !tickerBannerEnabled) {
    return null;
  }

  return (
    <div className="wysh-top-banner-container">
      {/* Top Announcement Bar */}
      {topBannerEnabled && topBannerText && (
        <div className="wysh-top-announcement-bar">
          <span>{topBannerText}</span>
        </div>
      )}

      {/* Marquee Ticker Bar */}
      {tickerBannerEnabled && tickerBannerText && (
        <div className="wysh-marquee-ticker-bar">
          <div className="wysh-marquee-track">
            <span>{tickerBannerText}</span>
            <span className="ticker-separator">•</span>
            <span>{tickerBannerText}</span>
            <span className="ticker-separator">•</span>
            <span>{tickerBannerText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WyshTopBanner;
