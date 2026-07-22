const STORAGE_KEYS = {
  PRODUCTS: 'wysh_products',
  PLANS: 'wysh_plans',
  INVENTORY: 'wysh_inventory',
  CALENDAR_NOTES: 'wysh_calendar_notes',
  REPORTS: 'wysh_reports'
};

export const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1',
    name: '위시그릭 019',
    category: 'plain',
    isFlavor: false,
    baseProductId: null,
    weight: 150,
    yield: 28,
    color: 'blue',
    shippingLimitDays: 7,
    expiryDays: 22,
    ingredients: [
      { name: '원유', ratio: 95 },
      { name: '유산균', ratio: 5 }
    ],
    defaultSterilizationTemp: 85,
    defaultSterilizationTime: 30,
    defaultCoolingTemp: 40,
    defaultInoculationTemp: 42,
    defaultHeatingTemp: 43,
    defaultHeaterTemp: 44
  },
  {
    id: 'prod-2',
    name: '위시크림 블랙카카오밀키웨이',
    category: 'flavor',
    isFlavor: true,
    baseProductId: 'prod-1',
    weight: 130,
    yield: 100,
    color: 'purple',
    shippingLimitDays: 7,
    expiryDays: 22,
    ingredients: [
      { name: '위시그릭 019', ratio: 70 },
      { name: '블랙카카오 퓨레', ratio: 28 },
      { name: '초코칩', ratio: 2 }
    ],
    defaultSterilizationTemp: 85,
    defaultSterilizationTime: 30,
    defaultCoolingTemp: 40,
    defaultInoculationTemp: 42,
    defaultHeatingTemp: 43,
    defaultHeaterTemp: 44
  },
  {
    id: 'prod-3',
    name: '위시크림 피스타치오 초코칩',
    category: 'flavor',
    isFlavor: true,
    baseProductId: 'prod-1',
    weight: 130,
    yield: 100,
    color: 'green',
    shippingLimitDays: 7,
    expiryDays: 22,
    ingredients: [
      { name: '위시그릭 019', ratio: 70 },
      { name: '피스타치오 페이스트', ratio: 25 },
      { name: '초코칩', ratio: 5 }
    ],
    defaultSterilizationTemp: 85,
    defaultSterilizationTime: 30,
    defaultCoolingTemp: 40,
    defaultInoculationTemp: 42,
    defaultHeatingTemp: 43,
    defaultHeaterTemp: 44
  }
];

export const DEFAULT_PLANS = [
  {
    id: 'P-20260708-01',
    name: '7월 1주차 플레인 생산',
    productId: 'prod-1',
    startDate: '2026-07-08',
    bottlingDate: '2026-07-10',
    shippingLimit: '2026-07-17',
    expiryDate: '2026-07-29',
    expectedOrderQty: 700,
    marketingQty: 50,
    bufferQty: 50,
    totalQty: 800,
    fermenterType: 'large',
    totalVolumeL: 428.57
  },
  {
    id: 'P-20260713-01',
    name: '7월 2주차 블랙카카오 생산',
    productId: 'prod-2',
    startDate: '2026-07-13',
    bottlingDate: '2026-07-15',
    shippingLimit: '2026-07-22',
    expiryDate: '2026-08-06',
    expectedOrderQty: 2100,
    marketingQty: 110,
    bufferQty: 100,
    totalQty: 2310,
    fermenterType: 'large',
    totalVolumeL: 1001.0
  }
];

export const DEFAULT_INVENTORY = [
  {
    planId: 'P-20260708-01',
    actualQty: 800,
    history: [
      { id: 'h-1', date: '2026-07-10 10:00', qty: 150, purpose: '출고' },
      { id: 'h-2', date: '2026-07-10 14:00', qty: 20, purpose: '마케팅 활용' }
    ]
  },
  {
    planId: 'P-20260713-01',
    actualQty: 2310,
    history: []
  }
];

export const loadInitialLocalStorageData = () => {
  let localProducts = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS));
  let localPlans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS));
  let localInventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY));
  let localCalendarNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.CALENDAR_NOTES));
  let localReports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS));

  if (!localProducts) {
    localProducts = DEFAULT_PRODUCTS;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  }

  // Backward compatibility check for products
  localProducts.forEach(p => {
    if (p.isFlavor === undefined) {
      p.isFlavor = (p.id === 'prod-2' || p.id === 'prod-3' || (p.name && (p.name.includes('블랙카카오') || p.name.includes('피스타치오') || p.name.includes('블루베리') || p.name.includes('딸기'))));
    }
    if (p.category === undefined) {
      p.category = p.isFlavor ? 'flavor' : 'plain';
    }
    if (p.baseProductId === undefined) {
      p.baseProductId = p.isFlavor ? 'prod-1' : null;
    }
    if (p.yield === undefined) {
      if (p.id === 'prod-1') p.yield = 28;
      else if (p.isFlavor) p.yield = 100;
      else p.yield = 28;
    }
    if (p.color === undefined) {
      if (p.id === 'prod-1') p.color = 'blue';
      else if (p.id === 'prod-2') p.color = 'purple';
      else if (p.id === 'prod-3') p.color = 'green';
      else p.color = 'blue';
    }
    if (p.shippingLimitDays === undefined) p.shippingLimitDays = 7;
    if (p.expiryDays === undefined) p.expiryDays = 22;
    if (p.defaultSterilizationTemp === undefined) p.defaultSterilizationTemp = 85;
    if (p.defaultSterilizationTime === undefined) p.defaultSterilizationTime = 30;
    if (p.defaultCoolingTemp === undefined) p.defaultCoolingTemp = 40;
    if (p.defaultInoculationTemp === undefined) p.defaultInoculationTemp = 42;
    if (p.defaultHeatingTemp === undefined) p.defaultHeatingTemp = 43;
    if (p.defaultHeaterTemp === undefined) p.defaultHeaterTemp = 44;
  });

  if (!localPlans) {
    localPlans = DEFAULT_PLANS;
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(DEFAULT_PLANS));
  }
  if (!localInventory) {
    localInventory = DEFAULT_INVENTORY;
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
  }
  if (!localCalendarNotes) {
    localCalendarNotes = [];
    localStorage.setItem(STORAGE_KEYS.CALENDAR_NOTES, JSON.stringify([]));
  }
  if (!localReports) {
    localReports = [];
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]));
  }

  return {
    products: localProducts,
    plans: localPlans,
    inventory: localInventory,
    calendarNotes: localCalendarNotes,
    reports: localReports
  };
};

export const saveStorageItems = (key, data) => {
  localStorage.setItem(STORAGE_KEYS[key] || key, JSON.stringify(data));
};
