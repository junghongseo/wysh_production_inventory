import React from 'react';

const ProductListSidebar = ({ 
  products, 
  selectedProduct, 
  onSelectProduct, 
  onOpenProductModal 
}) => {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>제품 목록</h3>
        <button 
          className="btn-primary" 
          onClick={onOpenProductModal}
          style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          신규 제품
        </button>
      </div>

      <div className="product-selector-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
        {products.map(prod => {
          const isSelected = selectedProduct?.id === prod.id;
          const isFlavor = prod.isFlavor;

          return (
            <div
              key={prod.id}
              onClick={() => onSelectProduct(prod)}
              className={`product-item-card ${isSelected ? 'selected' : ''}`}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.08)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    backgroundColor: isFlavor ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: isFlavor ? 'var(--color-accent)' : 'var(--color-primary)'
                  }}>
                    {isFlavor ? '플레이버' : '플레인'}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{prod.name}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  용량 {prod.weight}g | 수율 {prod.yield}%
                </div>
              </div>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: prod.color === 'purple' ? '#a855f7' : prod.color === 'green' ? '#10b981' : '#0ea5e9'
              }}></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductListSidebar;
