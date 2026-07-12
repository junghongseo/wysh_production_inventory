import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const WyshContext = createContext();

const STORAGE_KEYS = {
  PRODUCTS: 'wysh_products',
  PLANS: 'wysh_plans',
  INVENTORY: 'wysh_inventory'
};

const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1',
    name: '그릭 요거트 플레인',
    weight: 150,
    yield: 28,
    color: 'blue',
    ingredients: [
      { name: '원유', ratio: 95 },
      { name: '유산균', ratio: 5 }
    ]
  },
  {
    id: 'prod-2',
    name: '블루베리 그릭 요거트',
    weight: 130,
    yield: 30,
    color: 'purple',
    ingredients: [
      { name: '원유', ratio: 80 },
      { name: '블루베리 퓨레', ratio: 18 },
      { name: '유산균', ratio: 2 }
    ]
  },
  {
    id: 'prod-3',
    name: '딸기 그릭 요거트',
    weight: 130,
    yield: 30,
    color: 'pink',
    ingredients: [
      { name: '원유', ratio: 80 },
      { name: '딸기 잼', ratio: 18 },
      { name: '유산균', ratio: 2 }
    ]
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
    avgOrderQty: 100,
    marketingQty: 50,
    bufferQty: 50,
    totalQty: 800,
    fermenterType: 'large',
    totalVolumeL: 428.57
  },
  {
    id: 'P-20260713-01',
    name: '7월 2주차 블루베리 생산',
    productId: 'prod-2',
    startDate: '2026-07-13',
    bottlingDate: '2026-07-15',
    shippingLimit: '2026-07-22',
    expiryDate: '2026-08-06',
    avgOrderQty: 300,
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
  const [loading, setLoading] = useState(true);

  // Initialize data from LocalStorage
  useEffect(() => {
    let localProducts = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS));
    let localPlans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS));
    let localInventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY));

    if (!localProducts) {
      localProducts = DEFAULT_PRODUCTS;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    }
    // Backward compatibility check for colors and yield
    localProducts.forEach(p => {
      if (p.yield === undefined) {
        if (p.id === 'prod-1') p.yield = 28;
        else if (p.id === 'prod-2' || p.id === 'prod-3') p.yield = 30;
        else p.yield = 100;
      }
      if (p.color === undefined) {
        if (p.id === 'prod-1') p.color = 'blue';
        else if (p.id === 'prod-2') p.color = 'purple';
        else if (p.id === 'prod-3') p.color = 'pink';
        else p.color = 'blue';
      }
    });

    if (!localPlans) {
      localPlans = DEFAULT_PLANS;
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(DEFAULT_PLANS));
    }
    if (!localInventory) {
      localInventory = DEFAULT_INVENTORY;
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
    }

    setProducts(localProducts);
    setPlans(localPlans);
    setInventory(localInventory);
    setLoading(false);

    // Sync from Supabase if connected
    syncFromSupabase();
  }, []);

  const syncFromSupabase = async () => {
    if (!supabase) return;
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

      console.log("Supabase Fetch: Successfully pulled data from Cloud DB.");

      const mappedProducts = remoteProducts.map(p => ({
        id: p.id,
        name: p.name,
        weight: p.weight,
        yield: p.yield,
        color: p.color,
        ingredients: p.ingredients
      }));

      const mappedPlans = remotePlans.map(p => ({
        id: p.id,
        name: p.name,
        productId: p.product_id,
        startDate: p.start_date,
        bottlingDate: p.bottling_date,
        shippingLimit: p.shipping_limit,
        expiryDate: p.expiry_date,
        avgOrderQty: p.avg_order_qty,
        marketingQty: p.marketing_qty,
        bufferQty: p.buffer_qty,
        totalQty: p.total_qty,
        fermenterType: p.fermenter_type,
        totalVolumeL: parseFloat(p.total_volume_l)
      }));

      const mappedInventory = remoteInventory.map(i => ({
        planId: i.plan_id,
        actualQty: i.actual_qty,
        history: i.history
      }));

      // Overwrite local storage and react state
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(mappedProducts));
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(mappedPlans));
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(mappedInventory));

      setProducts(mappedProducts);
      setPlans(mappedPlans);
      setInventory(mappedInventory);
    } catch (e) {
      console.error("Supabase Pull Failure (Using LocalStorage offline-first fallback):", e);
    }
  };

  const pushProductToSupabase = async (product) => {
    if (!supabase) return;
    try {
      const dbProduct = {
        id: product.id,
        name: product.name,
        weight: product.weight,
        yield: product.yield,
        color: product.color,
        ingredients: product.ingredients
      };
      const { error } = await supabase.from('products').upsert(dbProduct);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Product):", e);
    }
  };

  const deleteProductFromSupabase = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Delete Product):", e);
    }
  };

  const pushPlanToSupabase = async (plan) => {
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
        avg_order_qty: plan.avgOrderQty,
        marketing_qty: plan.marketingQty,
        buffer_qty: plan.bufferQty,
        total_qty: plan.totalQty,
        fermenter_type: plan.fermenterType,
        total_volume_l: plan.totalVolumeL
      };
      const { error } = await supabase.from('plans').upsert(dbPlan);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Plan):", e);
    }
  };

  const deletePlanFromSupabase = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Supabase Push Error (Delete Plan):", e);
    }
  };

  const pushInventoryToSupabase = async (record) => {
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
  };

  // 1. Products Actions
  const addProduct = (productData) => {
    const newProduct = {
      ...productData,
      id: 'prod-' + Date.now()
    };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    pushProductToSupabase(newProduct);
    return newProduct;
  };

  const updateProduct = (updatedProd) => {
    const updatedProducts = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    pushProductToSupabase(updatedProd);
  };

  const deleteProduct = (id) => {
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
  };

  const getProductById = (id) => {
    return products.find(p => p.id === id);
  };

  // 2. Plans Actions
  const addPlan = (planData) => {
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
  };

  const updatePlan = (updatedPlan) => {
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
  };

  const deletePlan = (id) => {
    const updatedPlans = plans.filter(p => p.id !== id);
    setPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(updatedPlans));

    const updatedInventory = inventory.filter(i => i.planId !== id);
    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));

    deletePlanFromSupabase(id);
  };

  // 3. Inventory Actions
  const updateActualQty = (planId, qty) => {
    let updatedRecord = null;
    const updatedInventory = inventory.map(i => {
      if (i.planId === planId) {
        updatedRecord = { ...i, actualQty: qty };
        return updatedRecord;
      }
      return i;
    });

    if (!updatedRecord) {
      updatedRecord = { planId, actualQty: qty, history: [] };
      updatedInventory.push(updatedRecord);
    }

    setInventory(updatedInventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));
    pushInventoryToSupabase(updatedRecord);
  };

  const addOutflow = (planId, qty, purpose) => {
    let updatedRecord = null;
    const date = new Date();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const newHistory = {
      id: 'h-' + Date.now(),
      date: dateString,
      qty: qty,
      purpose: purpose
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
  };

  const deleteHistoryItem = (planId, historyId) => {
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
  };

  const getInventoryRecord = (planId) => {
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
  };

  return (
    <WyshContext.Provider value={{
      products,
      plans,
      inventory,
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
      deleteHistoryItem,
      getInventoryRecord,
      syncFromSupabase
    }}>
      {children}
    </WyshContext.Provider>
  );
};

export const useWysh = () => {
  return useContext(WyshContext);
};
