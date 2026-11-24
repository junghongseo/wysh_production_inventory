import React from 'react';

// Layout responsive grid and toggle switch CSS for ReportsView
const REPORT_VIEW_CSS = `
          @media (min-width: 1024px) {
            .report-grid-container {
              grid-template-columns: 1fr 1.3fr !important;
            }
          }
          
          .wysh-switch {
            position: relative;
            display: inline-block;
            width: 52px;
            height: 28px;
            flex-shrink: 0;
          }
          .wysh-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .wysh-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #cbd5e1;
            transition: .3s;
            border-radius: 28px;
          }
          .wysh-slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          }
          .wysh-switch input:checked + .wysh-slider {
            background-color: var(--color-warning, #f59e0b);
          }
          .wysh-switch input:checked + .wysh-slider:before {
            transform: translateX(24px);
          }

          .chip-button {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition-smooth);
          }
          .chip-button.active {
            background: var(--color-primary);
            color: #fff;
            border-color: var(--color-primary);
          }
        `;

const ReportViewStyles = () => <style dangerouslySetInnerHTML={{ __html: REPORT_VIEW_CSS }} />;

export default ReportViewStyles;
