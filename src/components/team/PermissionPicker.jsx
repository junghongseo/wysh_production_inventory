import React from 'react';
import { MENU_PERMISSIONS, FEATURE_PERMISSIONS } from '../../utils/permissions';

// 메뉴 권한 아래에 기능 권한을 들여 써서 보여준다. 상위 메뉴가 꺼져 있으면 기능 권한은 비활성.
const PermissionPicker = ({ value = [], onChange, isAdmin = false, idPrefix = 'perm' }) => {
  const has = (key) => value.includes(key);
  const toggle = (key) => {
    onChange(has(key) ? value.filter(k => k !== key) : [...value, key]);
  };

  if (isAdmin) {
    return (
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
        관리자는 모든 메뉴와 기능을 사용할 수 있습니다.
      </p>
    );
  }

  const row = (perm, indent, disabled) => (
    <label
      key={perm.key}
      htmlFor={`${idPrefix}-${perm.key}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '4px 0',
        paddingLeft: indent ? '24px' : 0,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      <input
        id={`${idPrefix}-${perm.key}`}
        type="checkbox"
        checked={has(perm.key)}
        disabled={disabled}
        onChange={() => toggle(perm.key)}
        style={{ marginTop: '3px' }}
      />
      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
        <strong style={{ fontWeight: indent ? 500 : 700 }}>{perm.label}</strong>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '6px' }}>{perm.description}</span>
      </span>
    </label>
  );

  return (
    <div>
      {MENU_PERMISSIONS.map(menu => (
        <div key={menu.key}>
          {row(menu, false, false)}
          {FEATURE_PERMISSIONS.filter(f => f.parent === menu.key).map(f => row(f, true, !has(menu.key)))}
        </div>
      ))}
      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '6px', paddingTop: '6px' }}>
        {FEATURE_PERMISSIONS.filter(f => !f.parent).map(f => row(f, false, false))}
      </div>
    </div>
  );
};

export default PermissionPicker;
