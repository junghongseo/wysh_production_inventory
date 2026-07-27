import React from 'react';

const WyshThemeSwitcher = ({ theme, setTheme }) => {
  const isBw = theme === 'wysh-bw';

  const toggleTheme = () => {
    setTheme(isBw ? 'default' : 'wysh-bw');
  };

  return (
    <div className="compact-theme-switch-wrapper">
      <button 
        className={`theme-toggle-switch ${isBw ? 'is-bw' : 'is-default'}`}
        onClick={toggleTheme}
        title={isBw ? "클래식 라이트 테마로 전환" : "위시 B&W 테마로 전환"}
        aria-label="테마 스타일 전환"
      >
        <span className="switch-track">
          <span className="switch-thumb">
            {isBw ? '🖤' : '☀️'}
          </span>
        </span>
        <span className="switch-text">
          {isBw ? 'WYSH B&W' : 'Classic Light'}
        </span>
      </button>
    </div>
  );
};

export default WyshThemeSwitcher;
