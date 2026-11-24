import React, { useState, useMemo } from 'react';
import { useWysh } from '../WyshContext';
import { getLocalTodayStr } from '../utils/shippingChartUtils';
import OrderUploadSection from './orders/OrderUploadSection';
import DailyChartViewerSection from './orders/DailyChartViewerSection';
import ShipmentAnalyticsSection from './orders/ShipmentAnalyticsSection';

const OrderView = () => {
  const { shippingCharts, saveShippingChart, deleteShippingChart } = useWysh();

  // Local-time safe today string
  const todayStr = useMemo(() => getLocalTodayStr(), []);

  // Section 2 (Daily Viewer) selected date — also set by Section 1 after reflecting a chart
  const [selectedViewDate, setSelectedViewDate] = useState(todayStr);

  return (
    <div className="inventory-layout" style={{ width: '100%', maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 상단 2열 레이아웃: 좌측 (영역 1: 업로드 및 정리) / 우측 (영역 2: 일별 출고표 조회 및 인쇄) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          alignItems: 'start'
        }}
      >
        <OrderUploadSection
          todayStr={todayStr}
          shippingCharts={shippingCharts}
          saveShippingChart={saveShippingChart}
          onReflected={setSelectedViewDate}
        />

        <DailyChartViewerSection
          shippingCharts={shippingCharts}
          saveShippingChart={saveShippingChart}
          deleteShippingChart={deleteShippingChart}
          selectedViewDate={selectedViewDate}
          setSelectedViewDate={setSelectedViewDate}
        />
      </div>

      {/* 하단 1열 전폭 레이아웃 (영역 3: 출고 동향 & 수량별 비중 분석 차트) */}
      <ShipmentAnalyticsSection shippingCharts={shippingCharts} />

    </div>
  );
};

export default OrderView;
