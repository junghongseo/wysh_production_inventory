import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import MaterialCostModal from '../modals/MaterialCostModal';

const MaterialCostListSection = ({ 
  materialCosts = [], 
  onAddMaterial, 
  onUpdateMaterial, 
  onDeleteMaterial 
}) => {
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'raw' | 'packaging'
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Helper function to calculate VAT-exclusive unit cost
  const calculateUnitCosts = (item) => {
    const price = parseFloat(item.priceVatInclusive) || 0;
    const qty = parseFloat(item.packageQty) || 0;

    if (price <= 0 || qty <= 0) {
      return { priceExcludingVat: 0, unitCostExcludingVat: 0, unitText: '' };
    }

    const priceExcludingVat = item.taxType === 'taxable' ? price / 1.1 : price;

    if (item.category === 'raw') {
      let factorInGrams = 1;
      if (item.unit === 'kg' || item.unit === 'L') {
        factorInGrams = 1000;
      }
      const totalGrams = qty * factorInGrams;
      if (totalGrams <= 0) return { priceExcludingVat, unitCostExcludingVat: 0, unitText: '원 / 10g' };
      const costPer10g = (priceExcludingVat / totalGrams) * 10;
      return {
        priceExcludingVat,
        unitCostExcludingVat: costPer10g,
        unitText: '원 / 10g'
      };
    } else {
      const costPerPiece = priceExcludingVat / qty;
      return {
        priceExcludingVat,
        unitCostExcludingVat: costPerPiece,
        unitText: '원 / 개'
      };
    }
  };

  // Filtered and searched materials
  const filteredMaterials = useMemo(() => {
    return materialCosts.filter(m => {
      // Category filter
      if (filterCategory === 'raw' && m.category !== 'raw') return false;
      if (filterCategory === 'packaging' && m.category !== 'packaging') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = m.name && m.name.toLowerCase().includes(query);
        const manuMatch = m.manufacturer && m.manufacturer.toLowerCase().includes(query);
        const suppMatch = m.supplier && m.supplier.toLowerCase().includes(query);
        const memoMatch = m.memo && m.memo.toLowerCase().includes(query);
        if (!nameMatch && !manuMatch && !suppMatch && !memoMatch) return false;
      }
      return true;
    });
  }, [materialCosts, filterCategory, searchQuery]);

  // Statistics
  const rawCount = useMemo(() => materialCosts.filter(m => m.category === 'raw').length, [materialCosts]);
  const packagingCount = useMemo(() => materialCosts.filter(m => m.category === 'packaging').length, [materialCosts]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredMaterials.length === 0) {
      alert('내보낼 원/부자재 단가 데이터가 없습니다.');
      return;
    }

    const excelData = filteredMaterials.map(m => {
      const calc = calculateUnitCosts(m);
      return {
        '분류': m.category === 'raw' ? '원재료' : '부자재',
        '제품명': m.name,
        '제조사': m.manufacturer || '-',
        '구매처': m.supplier || '-',
        '단위 포장량': `${m.packageQty} ${m.unit}`,
        '구매가격(VAT포함)': m.priceVatInclusive,
        '과세 구분': m.taxType === 'taxable' ? '과세' : '면세',
        '공급가액(VAT제외)': Math.round(calc.priceExcludingVat),
        'VAT제외 단가': Number(calc.unitCostExcludingVat.toFixed(2)),
        '단가 기준': calc.unitText,
        '비고': m.memo || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '원부자재 단가표');
    
    const fileName = `WYSH_원부자재_단가표_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleOpenAddModal = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingMaterial(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`[${item.name}] 항목을 단가 리스트에서 삭제하시겠습니까?`)) {
      onDeleteMaterial(item.id);
    }
  };

  const handleSaveModal = (savedData) => {
    if (editingMaterial) {
      onUpdateMaterial({ ...editingMaterial, ...savedData });
    } else {
      onAddMaterial(savedData);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header Card & Actions */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📦</span>
              <span>관리자 전용 원/부자재 단가 관리</span>
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              원재료는 10g당 단가(VAT제외), 부자재(용기/포장재)는 개당 단가(VAT제외)를 자동 수식 계산합니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleExportExcel}
              style={{
                height: '40px',
                padding: '0 16px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📥</span>
              <span>엑셀 내보내기</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenAddModal}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                border: 'none',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>+</span>
              <span>신규 원/부자재 등록</span>
            </button>
          </div>
        </div>

        {/* Stats summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>총 등록 항목</span>
            <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--font-outfit)', color: 'var(--text-primary)' }}>{materialCosts.length}개</strong>
          </div>
          <div style={{ padding: '12px 16px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-primary)' }}>🥛 원재료 (10g당 계산)</span>
            <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--font-outfit)', color: 'var(--color-primary)' }}>{rawCount}개</strong>
          </div>
          <div style={{ padding: '12px 16px', background: 'rgba(147, 51, 234, 0.08)', borderRadius: '10px', border: '1px solid rgba(192, 132, 252, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#9333ea' }}>📦 부자재 (개당 계산)</span>
            <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--font-outfit)', color: '#9333ea' }}>{packagingCount}개</strong>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`chip-button ${filterCategory === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCategory('all')}
            >
              전체 보기 ({materialCosts.length})
            </button>
            <button
              type="button"
              className={`chip-button ${filterCategory === 'raw' ? 'active' : ''}`}
              onClick={() => setFilterCategory('raw')}
            >
              🥛 원재료만 ({rawCount})
            </button>
            <button
              type="button"
              className={`chip-button ${filterCategory === 'packaging' ? 'active' : ''}`}
              onClick={() => setFilterCategory('packaging')}
            >
              📦 부자재만 ({packagingCount})
            </button>
          </div>

          <div style={{ width: '100%', maxWidth: '280px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="🔍 제품명, 제조사, 구매처 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: '38px', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Material Cost Table */}
      <div className="glass-card" style={{ padding: '16px', borderRadius: '16px', overflowX: 'auto' }}>
        {filteredMaterials.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📦</span>
            <span>등록된 원/부자재 단가 데이터가 없거나 검색 결과가 없습니다.</span>
          </div>
        ) : (
          <table className="wysh-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 10px' }}>분류</th>
                <th style={{ padding: '12px 10px' }}>제품명</th>
                <th style={{ padding: '12px 10px' }}>제조사</th>
                <th style={{ padding: '12px 10px' }}>구매처</th>
                <th style={{ padding: '12px 10px' }}>단위 포장량</th>
                <th style={{ padding: '12px 10px' }}>구매가격 (VAT포함)</th>
                <th style={{ padding: '12px 10px' }}>과세구분</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>계산 단가 (VAT제외)</th>
                <th style={{ padding: '12px 10px' }}>비고</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((item) => {
                const calc = calculateUnitCosts(item);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    
                    {/* Category Badge */}
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        background: item.category === 'raw' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(147, 51, 234, 0.12)',
                        color: item.category === 'raw' ? 'var(--color-primary)' : '#9333ea',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {item.category === 'raw' ? '🥛 원재료' : '📦 부자재'}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.name}
                    </td>

                    {/* Manufacturer */}
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                      {item.manufacturer || '-'}
                    </td>

                    {/* Supplier */}
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                      {item.supplier || '-'}
                    </td>

                    {/* Package Qty & Unit */}
                    <td style={{ padding: '12px 10px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>
                      {item.packageQty.toLocaleString()} {item.unit}
                    </td>

                    {/* Price VAT Inclusive */}
                    <td style={{ padding: '12px 10px', fontFamily: 'var(--font-outfit)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.priceVatInclusive.toLocaleString()} 원
                    </td>

                    {/* Tax Type */}
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        background: item.taxType === 'taxable' ? 'var(--bg-tertiary)' : 'rgba(16, 185, 129, 0.12)',
                        color: item.taxType === 'taxable' ? 'var(--text-secondary)' : '#10b981'
                      }}>
                        {item.taxType === 'taxable' ? '과세' : '면세'}
                      </span>
                    </td>

                    {/* Calculated Unit Cost (VAT Exclusive) */}
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)' }}>
                        {calc.unitCostExcludingVat.toFixed(2)} <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>원</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {calc.unitText} (공급가: {Math.round(calc.priceExcludingVat).toLocaleString()}원)
                      </div>
                    </td>

                    {/* Memo */}
                    <td style={{ padding: '12px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.memo || ''}>
                      {item.memo || '-'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleOpenEditModal(item)}
                          style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDelete(item)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            cursor: 'pointer'
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <MaterialCostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        editingMaterial={editingMaterial}
      />

    </div>
  );
};

export default MaterialCostListSection;
