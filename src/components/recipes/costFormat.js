export const formatWon = (v) => {
  if (v === null || v === undefined || !isFinite(v)) return '-';
  return Math.abs(v) < 100
    ? v.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : Math.round(v).toLocaleString('ko-KR');
};

export const formatGram = (v) => {
  if (v === null || v === undefined || !isFinite(v)) return '-';
  return v.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
};

export const formatPercent = (v) => {
  if (v === null || v === undefined || !isFinite(v)) return '-';
  return v.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};
