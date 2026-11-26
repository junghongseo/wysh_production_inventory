import React from 'react';
import ReportHistoryItem from './ReportHistoryItem';
import { REPORT_TYPE_NAMES } from './reportTypeLabels';

// Left: 리포트 작성 이력 목록
const ReportHistoryList = ({
  activeReportType,
  mobileSubTab,
  filteredReports,
  selectedReportId,
  plans,
  products,
  canConfirmAll,
  onSelect,
  onConfirm,
  onDelete
}) => {
  const getPlanName = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : planId;
  };

  const getProductColor = (planId) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return 'blue';
    const prod = products.find(p => p.id === plan.productId);
    return prod ? prod.color : 'blue';
  };

  const { icon, name } = REPORT_TYPE_NAMES[activeReportType] || REPORT_TYPE_NAMES.fermentation;

  return (
    <div className={`glass-card report-history-card ${mobileSubTab === 'history' ? 'mobile-active' : 'mobile-inactive'}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          {`${icon} ${name} 리포트 작성 이력`}
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 10px', borderRadius: '12px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
          {filteredReports.length} 건
        </span>
      </div>

      <div className="report-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '720px', overflowY: 'auto' }}>
        {filteredReports.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>작성된 {name} 리포트가 없습니다.</p>
          </div>
        ) : (
          filteredReports.map(rep => (
            <ReportHistoryItem
              key={rep.id}
              rep={rep}
              isSelected={selectedReportId === rep.id}
              planName={getPlanName(rep.planId)}
              productColor={getProductColor(rep.planId)}
              canConfirmAll={canConfirmAll}
              onSelect={onSelect}
              onConfirm={onConfirm}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ReportHistoryList;
