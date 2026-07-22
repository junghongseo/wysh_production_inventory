import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';

const WyshContext = createContext();

const STORAGE_KEYS = {
  PRODUCTS: 'wysh_products',
  PLANS: 'wysh_plans',
  INVENTORY: 'wysh_inventory',
  CALENDAR_NOTES: 'wysh_calendar_notes',
  REPORTS: 'wysh_reports'
};

const DEFAULT_PRODUCTS = [
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

const DEFAULT_PLANS = [
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

const DEFAULT_INVENTORY = [
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

export const WyshProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [calendarNotes, setCalendarNotes] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Initialize data from LocalStorage
  useEffect(() => {
    let localProducts = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS));
    let localPlans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS));
    let localInventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY));
    let localCalendarNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.CALENDAR_NOTES));
    let localReports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS));

    if (!localProducts) {
      localProducts = DEFAULT_PRODUCTS;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    }
    // Backward compatibility check for colors, yield, and flavor base product fields
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
      if (p.shippingLimitDays === undefined) {
        p.shippingLimitDays = 7;
      }
      if (p.expiryDays === undefined) {
        p.expiryDays = 22;
      }
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

    setProducts(localProducts);
    setPlans(localPlans);
    setInventory(localInventory);
    setCalendarNotes(localCalendarNotes);
    setReports(localReports);
    setLoading(false);

    // Sync from Supabase if connected
    syncFromSupabase();
  }, []);

  const syncFromSupabase = useCallback(async () => {
    if (!supabase) {
      setIsDbConnected(false);
      setDbError("Supabase client not initialized (missing environment variables)");
      return;
    }
    try {
      console.log("Supabase Client detected. Syncing remote database state...");

      const { data: remoteProducts, error: errProducts } = await supabase
        .from('products')
        .select('*');
      if (errProducts) throw errProducts;

      const { data: remotePlans, error: errPlans } = await supabase
        .from('plans')
        .select('*');
      if (errPlans) throw errPlans;

      const { data: remoteInventory, error: errInventory } = await supabase
        .from('inventory')
        .select('*');
      if (errInventory) throw errInventory;

      // Safe pull for calendar_notes to avoid crash if table not initialized
      let mappedCalendarNotes = [];
      try {
        const { data: remoteNotes, error: errNotes } = await supabase
          .from('calendar_notes')
          .select('*');
        if (errNotes) {
          console.warn("Supabase Fetch Warn: calendar_notes query failed, maybe table is not created yet.", errNotes);
        } else if (remoteNotes) {
          mappedCalendarNotes = remoteNotes.map(n => ({
            dateStr: n.date_str,
            title: n.title,
            content: n.content
          }));
        }
      } catch (errNotesFetch) {
        console.warn("Supabase Fetch Warning (calendar_notes):", errNotesFetch);
      }

      // Safe pull for reports
      let mappedReports = [];
      try {
        const { data: remoteReports, error: errReports } = await supabase
          .from('reports')
          .select('*');
        if (errReports) {
          console.warn("Supabase Fetch Warn: reports query failed, maybe table is not created yet.", errReports);
        } else if (remoteReports) {
          mappedReports = remoteReports.map(r => ({
            id: r.id,
            planId: r.plan_id,
            type: r.type,
            workerName: r.worker_name,
            checkedItems: r.checked_items,
            details: r.details,
            createdAt: r.created_at
          }));
        }
      } catch (errReportsFetch) {
        console.warn("Supabase Fetch Warning (reports):", errReportsFetch);
      }

      console.log("Supabase Fetch: Successfully pulled data from Cloud DB.");

      const mappedProducts = remoteProducts.map(p => {
        const isFlavorVal = p.is_flavor !== undefined && p.is_flavor !== null 
          ? p.is_flavor 
          : (p.id === 'prod-2' || p.id === 'prod-3' || (p.name && (p.name.includes('블랙카카오') || p.name.includes('피스타치오') || p.name.includes('블루베리') || p.name.includes('딸기'))));
        const categoryVal = p.category || (isFlavorVal ? 'flavor' : 'plain');
        const baseProdIdVal = p.base_product_id !== undefined ? p.base_product_id : (isFlavorVal ? 'prod-1' : null);

        return {
          id: p.id,
          name: p.name,
          weight: p.weight,
          yield: p.yield,
          color: p.color,
          ingredients: p.ingredients,
          category: categoryVal,
          isFlavor: isFlavorVal,
          baseProductId: baseProdIdVal,
          shippingLimitDays: p.shipping_limit_days !== undefined && p.shipping_limit_days !== null ? p.shipping_limit_days : 7,
          expiryDays: p.expiry_days !== undefined && p.expiry_days !== null ? p.expiry_days : 22,
          defaultSterilizationTemp: p.default_sterilization_temp !== undefined && p.default_sterilization_temp !== null ? p.default_sterilization_temp : 85,
          defaultSterilizationTime: p.default_sterilization_time !== undefined && p.default_sterilization_time !== null ? p.default_sterilization_time : 30,
          defaultCoolingTemp: p.default_cooling_temp !== undefined && p.default_cooling_temp !== null ? p.default_cooling_temp : 40,
          defaultInoculationTemp: p.default_inoculation_temp !== undefined && p.default_inoculation_temp !== null ? p.default_inoculation_temp : 42,
          defaultHeatingTemp: p.default_heating_temp !== undefined && p.default_heating_temp !== null ? p.default_heating_temp : 43,
          defaultHeaterTemp: p.default_heater_temp !== undefined && p.default_heater_temp !== null ? p.default_heater_temp : 44
        };
      });

      const mappedPlans = remotePlans.map(p => {
        const defaultItems = [
          {
            productId: p.product_id,
            expectedOrderQty: p.expected_order_qty,
            marketingQty: p.marketing_qty,
            bufferQty: p.buffer_qty,
            totalQty: p.total_qty
          }
        ];
        return {
          id: p.id,
          name: p.name,
          productId: p.product_id,
          startDate: p.start_date,
          bottlingDate: p.bottling_date,
          shippingLimit: p.shipping_limit,
          expiryDate: p.expiry_date,
          expectedOrderQty: p.expected_order_qty,
          marketingQty: p.marketing_qty,
          bufferQty: p.buffer_qty,
          totalQty: p.total_qty,
          fermenterType: p.fermenter_type,
          totalVolumeL: parseFloat(p.total_volume_l),
          memo: p.memo || '',
          items: p.items && Array.isArray(p.items) && p.items.length > 0 ? p.items : defaultItems
        };
      });

      const mappedInventory = remoteInventory.map(i => ({
        planId: i.plan_id,
        actualQty: i.actual_qty,
        itemActualQtys: i.item_actual_qtys || {},
        history: i.history
      }));

      // Overwrite local storage and react state
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(mappedProducts));
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(mappedPlans));
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(mappedInventory));
      localStorage.setItem(STORAGE_KEYS.CALENDAR_NOTES, JSON.stringify(mappedCalendarNotes));
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(mappedReports));

      setProducts(mappedProducts);
      setPlans(mappedPlans);
      setInventory(mappedInventory);
      setCalendarNotes(mappedCalendarNotes);
      setReports(mappedReports);
      setIsDbConnected(true);
      setDbError(null);
    } catch (e) {
      console.error("Supabase Pull Failure (Using LocalStorage offline-first fallback):", e);
      setIsDbConnected(false);
      setDbError(e.message || String(e));
    }
  }, []);

  const pushProductToSupabase = useCallback(async (product) => {
    if (!supabase) return;
    try {
      const dbProduct = {
        id: product.id,
        name: product.name,
        weight: product.weight,
        yield: product.yield,
        color: product.color,
        ingredients: product.ingredients,
        category: product.category,
        is_flavor: product.isFlavor,
        base_product_id: product.baseProductId,
        shipping_limit_days: product.shippingLimitDays,
        expiry_days: product.expiryDays,
        default_sterilization_temp: product.defaultSterilizationTemp,
        default_sterilization_time: product.defaultSterilizationTime,
        default_cooling_temp: product.defaultCoolingTemp,
        default_inoculation_temp: product.defaultInoculationTemp,
        default_heating_temp: product.defaultHeatingTemp,
        default_heater_temp: product.defaultHeaterTemp
      };
      const { error } = await supabase.from('products').upsert(dbProduct);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Product):", e);
    }
  }, []);

  const deleteProductFromSupabase = useCallback(async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Delete Product):", e);
    }
  }, []);

  const pushPlanToSupabase = useCallback(async (plan) => {
    if (!supabase) return;
    try {
      const dbPlan = {
        id: plan.id,
        name: plan.name,
        product_id: plan.productId,
        start_date: plan.startDate,
        bottling_date: plan.bottlingDate,
        shipping_limit: plan.shippingLimit,
        expiry_date: plan.expiryDate,
        expected_order_qty: plan.expectedOrderQty,
        marketing_qty: plan.marketingQty,
        buffer_qty: plan.bufferQty,
        total_qty: plan.totalQty,
        fermenter_type: plan.fermenterType,
        total_volume_l: plan.totalVolumeL,
        memo: plan.memo,
        items: plan.items
      };
      const { error } = await supabase.from('plans').upsert(dbPlan);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Plan):", e);
    }
  }, []);

  const deletePlanFromSupabase = useCallback(async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Delete Plan):", e);
    }
  }, []);

  const pushInventoryToSupabase = useCallback(async (record) => {
    if (!supabase || !record) return;
    try {
      const dbInventory = {
        plan_id: record.planId,
        actual_qty: record.actualQty,
        history: record.history
      };
      const { error } = await supabase.from('inventory').upsert(dbInventory);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Inventory):", e);
    }
  }, []);

  // 1. Products Actions
  const addProduct = useCallback((productData) => {
    const newProduct = {
      ...productData,
      id: 'prod-' + Date.now()
    };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    pushProductToSupabase(newProduct);
    return newProduct;
  }, [products, pushProductToSupabase]);

  const updateProduct = useCallback((updatedProd) => {
    const updatedProducts = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    pushProductToSupabase(updatedProd);
  }, [products, pushProductToSupabase]);

  const deleteProduct = useCallback((id) => {
    const updatedProducts = products.filter(p => p.id !== id);
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

    // Cascade delete plans using this product
    const plansToDelete = plans.filter(p => p.productId === id);
    const updatedPlans = plans.filter(p => p.productId !== id);
    setPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(updatedPlans));

    // Cascade delete inventory records for those plans
    const planIdsToDelete = plansToDelete.map(p => p.id);
    const updatedInventory = inventory.filter(i => !planIdsToDelete.includes(i.planId));
    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));

    // Supabase Sync (Cloud cascade references handle plan & inventory deletions if configured,
    // but we execute the delete query to be explicit)
    deleteProductFromSupabase(id);
  }, [products, plans, inventory, deleteProductFromSupabase]);

  const getProductById = useCallback((id) => {
    return products.find(p => p.id === id);
  }, [products]);

  // 2. Plans Actions
  const addPlan = useCallback((planData) => {
    const dateStr = planData.startDate.replace(/-/g, '');
    const sameDayCount = plans.filter(p => p.startDate === planData.startDate).length;
    const newPlan = {
      ...planData,
      id: `P-${dateStr}-${String(sameDayCount + 1).padStart(2, '0')}`
    };

    const updatedPlans = [...plans, newPlan];
    setPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(updatedPlans));

    // Also create matching inventory record
    const newInv = {
      planId: newPlan.id,
      actualQty: newPlan.totalQty,
      history: []
    };
    const updatedInventory = [...inventory, newInv];
    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));

    pushPlanToSupabase(newPlan);
    pushInventoryToSupabase(newInv);

    return newPlan;
  }, [plans, inventory, pushPlanToSupabase, pushInventoryToSupabase]);

  const updatePlan = useCallback((updatedPlan) => {
    const index = plans.findIndex(p => p.id === updatedPlan.id);
    if (index === -1) return;

    const oldPlan = plans[index];
    const updatedPlans = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
    setPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(updatedPlans));

    // Sync inventory record
    let updatedInv = null;
    const updatedInventory = inventory.map(i => {
      if (i.planId === updatedPlan.id) {
        let actualQty = i.actualQty;
        // If actualQty matched the old totalQty, auto-sync it to the new totalQty
        if (i.actualQty === oldPlan.totalQty) {
          actualQty = updatedPlan.totalQty;
        }
        updatedInv = { ...i, actualQty };
        return updatedInv;
      }
      return i;
    });
    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));

    pushPlanToSupabase(updatedPlan);
    if (updatedInv) {
      pushInventoryToSupabase(updatedInv);
    }
  }, [plans, inventory, pushPlanToSupabase, pushInventoryToSupabase]);

  const deletePlan = useCallback((id) => {
    const updatedPlans = plans.filter(p => p.id !== id);
    setPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(updatedPlans));

    const updatedInventory = inventory.filter(i => i.planId !== id);
    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));

    deletePlanFromSupabase(id);
  }, [plans, inventory, deletePlanFromSupabase]);

  // 3. Inventory Actions
  const updateActualQty = useCallback((planId, qty, productId = null) => {
    let updatedRecord = null;
    const updatedInventory = inventory.map(i => {
      if (i.planId === planId) {
        let itemActualQtys = { ...(i.itemActualQtys || {}) };
        if (productId) {
          itemActualQtys[productId] = qty;
        }
        const newTotalActualQty = Object.keys(itemActualQtys).length > 0 
          ? Object.values(itemActualQtys).reduce((a, b) => a + b, 0)
          : qty;

        updatedRecord = {
          ...i,
          actualQty: newTotalActualQty,
          itemActualQtys
        };
        return updatedRecord;
      }
      return i;
    });

    if (!updatedRecord) {
      const itemActualQtys = productId ? { [productId]: qty } : {};
      updatedRecord = { planId, actualQty: qty, itemActualQtys, history: [] };
      updatedInventory.push(updatedRecord);
    }

    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));
    pushInventoryToSupabase(updatedRecord);
  }, [inventory, pushInventoryToSupabase]);

  const addOutflow = useCallback((planId, qty, purpose, customDateString, memo, productId = null) => {
    let updatedRecord = null;
    let dateString = customDateString;
    
    if (!dateString) {
      const date = new Date();
      dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    const newHistory = {
      id: 'h-' + Date.now(),
      productId: productId || null,
      date: dateString,
      qty: qty,
      purpose: purpose,
      memo: memo || ''
    };

    const updatedInventory = inventory.map(i => {
      if (i.planId === planId) {
        updatedRecord = {
          ...i,
          history: [newHistory, ...i.history]
        };
        return updatedRecord;
      }
      return i;
    });

    if (!updatedRecord) {
      const plan = plans.find(p => p.id === planId);
      const initialQty = plan ? plan.totalQty : 0;
      updatedRecord = {
        planId,
        actualQty: initialQty,
        history: [newHistory]
      };
      updatedInventory.push(updatedRecord);
    }

    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));
    pushInventoryToSupabase(updatedRecord);
  }, [inventory, plans, pushInventoryToSupabase]);

  const deleteHistoryItem = useCallback((planId, historyId) => {
    let updatedRecord = null;
    const updatedInventory = inventory.map(i => {
      if (i.planId === planId) {
        updatedRecord = {
          ...i,
          history: i.history.filter(h => h.id !== historyId)
        };
        return updatedRecord;
      }
      return i;
    });

    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));
    if (updatedRecord) {
      pushInventoryToSupabase(updatedRecord);
    }
  }, [inventory, pushInventoryToSupabase]);

  const updateOutflowMemo = useCallback((planId, historyId, newMemo) => {
    let updatedRecord = null;
    const updatedInventory = inventory.map(i => {
      if (i.planId === planId) {
        updatedRecord = {
          ...i,
          history: i.history.map(h => h.id === historyId ? { ...h, memo: newMemo } : h)
        };
        return updatedRecord;
      }
      return i;
    });

    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));
    if (updatedRecord) {
      pushInventoryToSupabase(updatedRecord);
    }
  }, [inventory, pushInventoryToSupabase]);

  const updateOutflow = useCallback((planId, historyId, qty, purpose, dateString, memo) => {
    let updatedRecord = null;
    const updatedInventory = inventory.map(i => {
      if (i.planId === planId) {
        updatedRecord = {
          ...i,
          history: i.history.map(h => 
            h.id === historyId 
              ? { ...h, qty, purpose, date: dateString, memo: memo || '' } 
              : h
          )
        };
        return updatedRecord;
      }
      return i;
    });

    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));
    if (updatedRecord) {
      pushInventoryToSupabase(updatedRecord);
    }
  }, [inventory, pushInventoryToSupabase]);

  const getInventoryRecord = useCallback((planId) => {
    const record = inventory.find(i => i.planId === planId);
    if (!record) {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        return {
          planId: planId,
          actualQty: plan.totalQty,
          history: []
        };
      }
    }
    return record;
  }, [inventory, plans]);

  const pushCalendarNoteToSupabase = useCallback(async (note) => {
    if (!supabase) return;
    try {
      const dbNote = {
        date_str: note.dateStr,
        title: note.title,
        content: note.content
      };
      const { error } = await supabase.from('calendar_notes').upsert(dbNote);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (CalendarNote):", e);
    }
  }, []);

  const deleteCalendarNoteFromSupabase = useCallback(async (dateStr) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('calendar_notes').delete().eq('date_str', dateStr);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Delete CalendarNote):", e);
    }
  }, []);

  const saveCalendarNote = useCallback((dateStr, title, content) => {
    const updatedNotes = [...calendarNotes];
    const existingIdx = updatedNotes.findIndex(n => n.dateStr === dateStr);
    const newNote = { dateStr, title, content };

    if (existingIdx > -1) {
      updatedNotes[existingIdx] = newNote;
    } else {
      updatedNotes.push(newNote);
    }

    setCalendarNotes(updatedNotes);
    localStorage.setItem(STORAGE_KEYS.CALENDAR_NOTES, JSON.stringify(updatedNotes));
    pushCalendarNoteToSupabase(newNote);
  }, [calendarNotes, pushCalendarNoteToSupabase]);

  const deleteCalendarNote = useCallback((dateStr) => {
    const updatedNotes = calendarNotes.filter(n => n.dateStr !== dateStr);
    setCalendarNotes(updatedNotes);
    localStorage.setItem(STORAGE_KEYS.CALENDAR_NOTES, JSON.stringify(updatedNotes));
    deleteCalendarNoteFromSupabase(dateStr);
  }, [calendarNotes, deleteCalendarNoteFromSupabase]);

  const pushReportToSupabase = useCallback(async (report) => {
    if (!supabase) return;
    try {
      const dbReport = {
        id: report.id,
        plan_id: report.planId,
        type: report.type,
        worker_name: report.workerName,
        checked_items: report.checkedItems,
        details: report.details,
        created_at: report.createdAt
      };
      const { error } = await supabase.from('reports').upsert(dbReport);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Report):", e);
    }
  }, []);

  const deleteReportFromSupabase = useCallback(async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Delete Report):", e);
    }
  }, []);

  const addReport = useCallback((reportData) => {
    const newReport = {
      ...reportData,
      id: 'rep-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updatedReports));
    pushReportToSupabase(newReport);
    return newReport;
  }, [reports, pushReportToSupabase]);

  const updateReport = useCallback((updatedRep) => {
    const updatedReports = reports.map(r => r.id === updatedRep.id ? updatedRep : r);
    setReports(updatedReports);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updatedReports));
    pushReportToSupabase(updatedRep);
  }, [reports, pushReportToSupabase]);

  const deleteReport = useCallback((id) => {
    const updatedReports = reports.filter(r => r.id !== id);
    setReports(updatedReports);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updatedReports));
    deleteReportFromSupabase(id);
  }, [reports, deleteReportFromSupabase]);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('wysh_admin_logged_in') === 'true';
  });

  const loginAdmin = useCallback((id, password) => {
    const adminId = (import.meta.env.VITE_ADMIN_ID || 'wysh').trim();
    const adminPassword = (import.meta.env.VITE_ADMIN_PASSWORD || 'wysh0926!').trim();

    console.log("--- Admin Login Debug ---");
    console.log("Input ID:", `"${id}"`, "Length:", id.length);
    console.log("Env ID:", `"${adminId}"`, "Length:", adminId.length);
    console.log("Input PW:", `"${password}"`, "Length:", password.length);
    console.log("Env PW:", `"${adminPassword}"`, "Length:", adminPassword.length);
    console.log("ID Match:", id.trim() === adminId);
    console.log("PW Match:", password.trim() === adminPassword);
    console.log("-------------------------");

    if (id.trim() === adminId && password.trim() === adminPassword) {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem('wysh_admin_logged_in', 'true');
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('wysh_admin_logged_in');
  }, []);

  const contextValue = useMemo(() => ({
    products,
    plans,
    inventory,
    calendarNotes,
    reports,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    addPlan,
    updatePlan,
    deletePlan,
    updateActualQty,
    addOutflow,
    updateOutflow,
    deleteHistoryItem,
    updateOutflowMemo,
    getInventoryRecord,
    saveCalendarNote,
    deleteCalendarNote,
    syncFromSupabase,
    addReport,
    updateReport,
    deleteReport,
    isAdminLoggedIn,
    loginAdmin,
    logoutAdmin,
    isDbConnected,
    dbError
  }), [
    products,
    plans,
    inventory,
    calendarNotes,
    reports,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    addPlan,
    updatePlan,
    deletePlan,
    updateActualQty,
    addOutflow,
    updateOutflow,
    deleteHistoryItem,
    updateOutflowMemo,
    getInventoryRecord,
    saveCalendarNote,
    deleteCalendarNote,
    syncFromSupabase,
    addReport,
    updateReport,
    deleteReport,
    isAdminLoggedIn,
    loginAdmin,
    logoutAdmin,
    isDbConnected,
    dbError
  ]);

  return (
    <WyshContext.Provider value={contextValue}>
      {children}
    </WyshContext.Provider>
  );
};

export const useWysh = () => {
  return useContext(WyshContext);
};
