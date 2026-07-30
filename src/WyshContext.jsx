import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { loadInitialLocalStorageData, saveStorageItems, DEFAULT_PRODUCTS } from './services/storageService';
import {
  fetchAllRemoteData,
  pushProductToSupabase,
  deleteProductFromSupabase,
  pushPlanToSupabase,
  deletePlanFromSupabase,
  pushInventoryToSupabase,
  pushCalendarNoteToSupabase,
  deleteCalendarNoteFromSupabase,
  pushReportToSupabase,
  deleteReportFromSupabase,
  pushShippingChartToSupabase,
  deleteShippingChartFromSupabase,
  pushMaterialCostToSupabase,
  deleteMaterialCostFromSupabase,
  pushBannerSettingsToSupabase
} from './services/supabaseService';

const WyshContext = createContext();

export const WyshProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [calendarNotes, setCalendarNotes] = useState([]);
  const [reports, setReports] = useState([]);
  const [shippingCharts, setShippingCharts] = useState([]);
  const [materialCosts, setMaterialCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbError, setDbError] = useState(null);

  const DEFAULT_BANNER_SETTINGS = {
    topBannerText: '평일 오전 10시 이전 주문 시 당일 발송 🚚',
    tickerBannerText: 'WYSH PRODUCTION & INVENTORY SYSTEM • 카카오톡 채널 추가 시 배송비 무료 쿠폰 증정 [CLICK] • 실시간 차수별 재고 및 출고 관리 가동 중 [SYSTEM ONLINE]',
    topBannerEnabled: true,
    tickerBannerEnabled: true
  };

  const [bannerSettings, setBannerSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('wysh_banner_settings');
      return saved ? JSON.parse(saved) : DEFAULT_BANNER_SETTINGS;
    } catch {
      return DEFAULT_BANNER_SETTINGS;
    }
  });

  const updateBannerSettings = (newSettings) => {
    const updated = {
      ...bannerSettings,
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
    setBannerSettings(updated);
    try {
      localStorage.setItem('wysh_banner_settings', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save banner settings to localStorage:', e);
    }
    pushBannerSettingsToSupabase(updated);
  };

  const resetBannerSettings = () => {
    const resetObj = {
      ...DEFAULT_BANNER_SETTINGS,
      updatedAt: new Date().toISOString()
    };
    setBannerSettings(resetObj);
    try {
      localStorage.setItem('wysh_banner_settings', JSON.stringify(resetObj));
    } catch (e) {
      console.error('Failed to reset banner settings in localStorage:', e);
    }
    pushBannerSettingsToSupabase(resetObj);
  };

  // Initialize data from LocalStorage and start Realtime sync
  useEffect(() => {
    const initialData = loadInitialLocalStorageData();
    setProducts(initialData.products);
    setPlans(initialData.plans);
    setInventory(initialData.inventory);
    setCalendarNotes(initialData.calendarNotes);
    setReports(initialData.reports);
    setShippingCharts(initialData.shippingCharts || []);
    setMaterialCosts(initialData.materialCosts || []);
    setLoading(false);

    // Initial sync
    syncFromSupabase();

    if (!supabase) return;

    // Realtime channel subscription for multi-device instant sync (PC <-> Mobile)
    const channel = supabase.channel('wysh_realtime_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_notes' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipping_charts' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'material_costs' }, () => {
        syncFromSupabase();
      })
      .subscribe();

    // 10-second background polling fallback
    const intervalId = setInterval(() => {
      syncFromSupabase();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, []);

  const syncFromSupabase = useCallback(async () => {
    if (!supabase) {
      setIsDbConnected(false);
      setDbError("Supabase client not initialized (missing environment variables)");
      return;
    }
    try {
      const {
        mappedProducts,
        mappedPlans,
        mappedInventory,
        mappedCalendarNotes,
        mappedReports,
        mappedShippingCharts,
        mappedMaterialCosts,
        remoteBannerSettings
      } = await fetchAllRemoteData();

      if (remoteBannerSettings) {
        setBannerSettings(prev => {
          if (!prev || !prev.updatedAt || (remoteBannerSettings.updatedAt && remoteBannerSettings.updatedAt >= prev.updatedAt)) {
            try {
              localStorage.setItem('wysh_banner_settings', JSON.stringify(remoteBannerSettings));
            } catch (e) {
              console.error('Failed to sync remote banner settings to localStorage:', e);
            }
            return remoteBannerSettings;
          } else if (prev && prev.updatedAt && remoteBannerSettings.updatedAt && prev.updatedAt > remoteBannerSettings.updatedAt) {
            pushBannerSettingsToSupabase(prev);
          }
          return prev;
        });
      }

      const localInitial = loadInitialLocalStorageData();

      // Clear local tombstone filters to prevent unintended auto-deletions
      localStorage.removeItem('wysh_deleted_notes');
      localStorage.removeItem('wysh_deleted_reports');
      localStorage.removeItem('wysh_deleted_plans');

      const finalNotes = mappedCalendarNotes || [];
      const finalReports = mappedReports || [];
      const finalPlans = mappedPlans || [];
      
      // Maintain products compatibility (only sync hardcoded defaults if missing)
      const mergedProductsMap = new Map();
      mappedProducts.forEach(p => mergedProductsMap.set(p.id, p));

      (DEFAULT_PRODUCTS || []).forEach(lp => {
        const existsById = mergedProductsMap.has(lp.id);
        const existsByName = Array.from(mergedProductsMap.values()).some(p => p.name === lp.name);
        if (!existsById && !existsByName) {
          mergedProductsMap.set(lp.id, lp);
          pushProductToSupabase(lp);
        }
      });
      const finalProducts = Array.from(mergedProductsMap.values());
      const finalInventory = mappedInventory || [];

      // Robust merge for shipping charts to prevent auto-deletion during background polling
      const localCharts = localInitial.shippingCharts || [];
      const chartMap = new Map();

      // Put local charts first
      localCharts.forEach(c => {
        if (c && c.date) chartMap.set(c.date, c);
      });

      // Merge remote charts (prefer remote if newer or equal)
      (mappedShippingCharts || []).forEach(rc => {
        if (!rc || !rc.date) return;
        const lc = chartMap.get(rc.date);
        if (!lc || !lc.updatedAt || (rc.updatedAt && rc.updatedAt >= lc.updatedAt)) {
          chartMap.set(rc.date, rc);
        } else if (lc && lc.updatedAt && rc.updatedAt && lc.updatedAt > rc.updatedAt) {
          // If local chart is newer than remote, sync local chart back to remote
          pushShippingChartToSupabase(lc);
        }
      });

      const finalCharts = Array.from(chartMap.values());
      finalCharts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // Robust merge for material costs: Prefer remote Supabase data as Source of Truth
      const localMaterials = localInitial.materialCosts || [];
      let finalMaterials = [];

      if (mappedMaterialCosts && mappedMaterialCosts.length > 0) {
        const materialMap = new Map();
        mappedMaterialCosts.forEach(rm => {
          if (rm && rm.id) materialMap.set(rm.id, rm);
        });

        // Sync local custom materials that might be newer or not yet pushed
        localMaterials.forEach(lm => {
          if (!lm || !lm.id) return;
          const rm = materialMap.get(lm.id);
          if (rm) {
            if (lm.updatedAt && rm.updatedAt && lm.updatedAt > rm.updatedAt) {
              materialMap.set(lm.id, lm);
              pushMaterialCostToSupabase(lm);
            }
          } else {
            // If local item is not default dummy data, push it to remote
            const isDefaultDummy = ['mat-1', 'mat-2', 'mat-3', 'mat-4'].includes(lm.id);
            if (!isDefaultDummy) {
              materialMap.set(lm.id, lm);
              pushMaterialCostToSupabase(lm);
            }
          }
        });
        finalMaterials = Array.from(materialMap.values());
      } else if (localMaterials.length > 0) {
        // If Supabase table is empty, push current local materials to Supabase
        finalMaterials = localMaterials;
        localMaterials.forEach(m => pushMaterialCostToSupabase(m));
      }

      // Save Authoritative Remote State to LocalStorage and React State
      saveStorageItems('PRODUCTS', finalProducts);
      saveStorageItems('PLANS', finalPlans);
      saveStorageItems('INVENTORY', finalInventory);
      saveStorageItems('CALENDAR_NOTES', finalNotes);
      saveStorageItems('REPORTS', finalReports);
      saveStorageItems('SHIPPING_CHARTS', finalCharts);
      saveStorageItems('MATERIAL_COSTS', finalMaterials);

      setProducts(finalProducts);
      setPlans(finalPlans);
      setInventory(finalInventory);
      setCalendarNotes(finalNotes);
      setReports(finalReports);
      setShippingCharts(finalCharts);
      setMaterialCosts(finalMaterials);

      setIsDbConnected(true);
      setDbError(null);
    } catch (e) {
      console.error("Failed to sync from Supabase:", e);
      setIsDbConnected(false);
      setDbError(e.message || "Failed to sync with database");
    }
  }, []);

  // Shipping Charts Actions
  const saveShippingChart = useCallback((chartData) => {
    const updatedChart = {
      ...chartData,
      updatedAt: new Date().toISOString()
    };

    setShippingCharts(prev => {
      const existingIdx = prev.findIndex(c => c.date === updatedChart.date);
      let updated;
      if (existingIdx !== -1) {
        updated = [...prev];
        updated[existingIdx] = updatedChart;
      } else {
        updated = [updatedChart, ...prev];
      }
      updated.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      saveStorageItems('SHIPPING_CHARTS', updated);
      return updated;
    });

    pushShippingChartToSupabase(updatedChart);
    return updatedChart;
  }, []);

  const deleteShippingChart = useCallback((date) => {
    setShippingCharts(prev => {
      const updated = prev.filter(c => c.date !== date);
      saveStorageItems('SHIPPING_CHARTS', updated);
      return updated;
    });
    deleteShippingChartFromSupabase(date);
  }, []);

  // 1. Products Actions
  const addProduct = useCallback((productData) => {
    const newProduct = {
      ...productData,
      id: 'prod-' + Date.now()
    };
    setProducts(prev => {
      const updatedProducts = [...prev, newProduct];
      saveStorageItems('PRODUCTS', updatedProducts);
      return updatedProducts;
    });
    pushProductToSupabase(newProduct);
    return newProduct;
  }, []);

  const updateProduct = useCallback((updatedProd) => {
    setProducts(prev => {
      const updatedProducts = prev.map(p => {
        if (p.id === updatedProd.id) {
          return updatedProd;
        }
        // Automatically sync base ingredient name for linked flavor products if base plain product name changed
        if (!updatedProd.isFlavor && p.isFlavor && p.baseProductId === updatedProd.id) {
          const updatedIngredients = p.ingredients ? [...p.ingredients] : [];
          if (updatedIngredients.length > 0) {
            updatedIngredients[0] = { ...updatedIngredients[0], name: updatedProd.name };
          }
          const flavorUpdated = { ...p, ingredients: updatedIngredients };
          pushProductToSupabase(flavorUpdated);
          return flavorUpdated;
        }
        return p;
      });
      saveStorageItems('PRODUCTS', updatedProducts);
      return updatedProducts;
    });
    pushProductToSupabase(updatedProd);
  }, []);

  const deleteProduct = useCallback((id) => {
    setProducts(prev => {
      const updatedProducts = prev.filter(p => p.id !== id);
      saveStorageItems('PRODUCTS', updatedProducts);
      return updatedProducts;
    });

    setPlans(prevPlans => {
      const plansToDelete = prevPlans.filter(p => p.productId === id);
      const updatedPlans = prevPlans.filter(p => p.productId !== id);
      saveStorageItems('PLANS', updatedPlans);

      const planIdsToDelete = plansToDelete.map(p => p.id);
      setInventory(prevInv => {
        const updatedInventory = prevInv.filter(i => !planIdsToDelete.includes(i.planId));
        saveStorageItems('INVENTORY', updatedInventory);
        return updatedInventory;
      });

      return updatedPlans;
    });

    deleteProductFromSupabase(id);
  }, []);

  const getProductById = useCallback((id) => {
    return products.find(p => p.id === id);
  }, [products]);

  // 2. Plans Actions
  const addPlan = useCallback((planData) => {
    const isSubIngredient = planData.planType === 'sub_ingredient';
    const dateStr = planData.startDate ? planData.startDate.replace(/-/g, '') : '20260101';
    const prefix = isSubIngredient ? 'P-SUB' : 'P';
    const idPrefix = `${prefix}-${dateStr}-`;

    let maxSeq = 0;
    plans.forEach(p => {
      if (p.id && p.id.startsWith(idPrefix)) {
        const seqStr = p.id.substring(idPrefix.length);
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });

    let seq = maxSeq + 1;
    let newId = `${idPrefix}${String(seq).padStart(2, '0')}`;
    while (plans.some(p => p.id === newId)) {
      seq++;
      newId = `${idPrefix}${String(seq).padStart(2, '0')}`;
    }

    const newPlan = {
      ...planData,
      planType: planData.planType || 'yogurt',
      id: newId
    };

    setPlans(prev => {
      const updatedPlans = [...prev, newPlan];
      saveStorageItems('PLANS', updatedPlans);
      return updatedPlans;
    });

    if (!isSubIngredient) {
      const newInv = {
        planId: newPlan.id,
        actualQty: newPlan.totalQty || 0,
        history: []
      };

      setInventory(prev => {
        const updatedInventory = [...prev, newInv];
        saveStorageItems('INVENTORY', updatedInventory);
        return updatedInventory;
      });
      pushInventoryToSupabase(newInv);
    }

    pushPlanToSupabase(newPlan);

    return newPlan;
  }, [plans]);

  const updatePlan = useCallback((updatedPlan) => {
    setPlans(prevPlans => {
      const index = prevPlans.findIndex(p => p.id === updatedPlan.id);
      if (index === -1) return prevPlans;

      const oldPlan = prevPlans[index];
      const updatedPlans = prevPlans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      saveStorageItems('PLANS', updatedPlans);

      setInventory(prevInv => {
        let updatedInv = null;
        const updatedInventory = prevInv.map(i => {
          if (i.planId === updatedPlan.id) {
            let actualQty = i.actualQty;
            if (i.actualQty === oldPlan.totalQty) {
              actualQty = updatedPlan.totalQty;
            }
            updatedInv = { ...i, actualQty };
            return updatedInv;
          }
          return i;
        });
        saveStorageItems('INVENTORY', updatedInventory);
        if (updatedInv) {
          pushInventoryToSupabase(updatedInv);
        }
        return updatedInventory;
      });

      return updatedPlans;
    });

    pushPlanToSupabase(updatedPlan);
  }, []);

  const deletePlan = useCallback((id) => {
    setPlans(prev => {
      const updatedPlans = prev.filter(p => p.id !== id);
      saveStorageItems('PLANS', updatedPlans);
      return updatedPlans;
    });

    setInventory(prev => {
      const updatedInventory = prev.filter(i => i.planId !== id);
      saveStorageItems('INVENTORY', updatedInventory);
      return updatedInventory;
    });

    deletePlanFromSupabase(id);
  }, []);

  // 3. Inventory Actions
  const updateActualQty = useCallback((planId, qty, productId = null) => {
    setInventory(prev => {
      let updatedRecord = null;
      const updatedInventory = prev.map(i => {
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

      saveStorageItems('INVENTORY', updatedInventory);
      pushInventoryToSupabase(updatedRecord);
      return updatedInventory;
    });
  }, []);

  const addOutflow = useCallback((planId, qty, purpose, customDateString, memo, productId = null, signer = '', verified = true) => {
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
      memo: memo || '',
      signer: signer || '',
      verified: verified !== undefined ? verified : true
    };

    setInventory(prev => {
      let updatedRecord = null;
      const updatedInventory = prev.map(i => {
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

      saveStorageItems('INVENTORY', updatedInventory);
      pushInventoryToSupabase(updatedRecord);
      return updatedInventory;
    });
  }, [plans]);

  const deleteHistoryItem = useCallback((planId, historyId) => {
    setInventory(prev => {
      let updatedRecord = null;
      const updatedInventory = prev.map(i => {
        if (i.planId === planId) {
          updatedRecord = {
            ...i,
            history: i.history.filter(h => h.id !== historyId)
          };
          return updatedRecord;
        }
        return i;
      });

      saveStorageItems('INVENTORY', updatedInventory);
      if (updatedRecord) {
        pushInventoryToSupabase(updatedRecord);
      }
      return updatedInventory;
    });
  }, []);

  const updateOutflowMemo = useCallback((planId, historyId, newMemo) => {
    setInventory(prev => {
      let updatedRecord = null;
      const updatedInventory = prev.map(i => {
        if (i.planId === planId) {
          updatedRecord = {
            ...i,
            history: i.history.map(h => h.id === historyId ? { ...h, memo: newMemo } : h)
          };
          return updatedRecord;
        }
        return i;
      });

      saveStorageItems('INVENTORY', updatedInventory);
      if (updatedRecord) {
        pushInventoryToSupabase(updatedRecord);
      }
      return updatedInventory;
    });
  }, []);

  const updateOutflow = useCallback((planId, historyId, qty, purpose, dateString, memo, signer, verified) => {
    setInventory(prev => {
      let updatedRecord = null;
      const updatedInventory = prev.map(i => {
        if (i.planId === planId) {
          updatedRecord = {
            ...i,
            history: i.history.map(h => 
              h.id === historyId 
                ? { 
                    ...h, 
                    qty, 
                    purpose, 
                    date: dateString, 
                    memo: memo || '',
                    signer: signer !== undefined ? signer : (h.signer || ''),
                    verified: verified !== undefined ? verified : (h.verified !== undefined ? h.verified : true)
                  } 
                : h
            )
          };
          return updatedRecord;
        }
        return i;
      });

      saveStorageItems('INVENTORY', updatedInventory);
      if (updatedRecord) {
        pushInventoryToSupabase(updatedRecord);
      }
      return updatedInventory;
    });
  }, []);

  const verifyOutflow = useCallback((planId, historyId) => {
    setInventory(prev => {
      let updatedRecord = null;
      const updatedInventory = prev.map(i => {
        if (i.planId === planId) {
          updatedRecord = {
            ...i,
            history: i.history.map(h => h.id === historyId ? { ...h, verified: true } : h)
          };
          return updatedRecord;
        }
        return i;
      });

      saveStorageItems('INVENTORY', updatedInventory);
      if (updatedRecord) {
        pushInventoryToSupabase(updatedRecord);
      }
      return updatedInventory;
    });
  }, []);

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

  // 4. Calendar Notes Actions
  const saveCalendarNote = useCallback((dateStr, title, content) => {
    const newNote = { dateStr, title, content };
    setCalendarNotes(prev => {
      const updatedNotes = [...prev];
      const existingIdx = updatedNotes.findIndex(n => n.dateStr === dateStr);
      if (existingIdx > -1) {
        updatedNotes[existingIdx] = newNote;
      } else {
        updatedNotes.push(newNote);
      }
      saveStorageItems('CALENDAR_NOTES', updatedNotes);
      return updatedNotes;
    });
    pushCalendarNoteToSupabase(newNote);
  }, []);

  const deleteCalendarNote = useCallback((dateStr) => {
    setCalendarNotes(prev => {
      const updatedNotes = prev.filter(n => n.dateStr !== dateStr);
      saveStorageItems('CALENDAR_NOTES', updatedNotes);
      return updatedNotes;
    });
    deleteCalendarNoteFromSupabase(dateStr);
  }, []);

  // 5. Reports Actions
  const addReport = useCallback((reportData) => {
    const newReport = {
      ...reportData,
      id: 'rep-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setReports(prev => {
      const updatedReports = [newReport, ...prev];
      saveStorageItems('REPORTS', updatedReports);
      return updatedReports;
    });
    pushReportToSupabase(newReport);
    return newReport;
  }, []);

  const updateReport = useCallback((updatedRep) => {
    setReports(prev => {
      const updatedReports = prev.map(r => r.id === updatedRep.id ? updatedRep : r);
      saveStorageItems('REPORTS', updatedReports);
      return updatedReports;
    });
    pushReportToSupabase(updatedRep);
  }, []);

  const deleteReport = useCallback((id) => {
    setReports(prev => {
      const updatedReports = prev.filter(r => r.id !== id);
      saveStorageItems('REPORTS', updatedReports);
      return updatedReports;
    });
    deleteReportFromSupabase(id);
  }, []);

  // 6. Admin Authentication
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('wysh_admin_logged_in') === 'true';
  });

  const loginAdmin = useCallback((id, password) => {
    const adminId = (import.meta.env.VITE_ADMIN_ID || 'wysh').trim();
    const adminPassword = (import.meta.env.VITE_ADMIN_PASSWORD || 'wysh0926!').trim();

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

  const addMaterialCost = useCallback((newMaterial) => {
    const item = {
      ...newMaterial,
      id: newMaterial.id || `mat-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    setMaterialCosts(prev => {
      const updated = [item, ...prev];
      saveStorageItems('MATERIAL_COSTS', updated);
      return updated;
    });
    pushMaterialCostToSupabase(item);
  }, []);

  const updateMaterialCost = useCallback((updatedMaterial) => {
    const item = {
      ...updatedMaterial,
      updatedAt: new Date().toISOString()
    };
    setMaterialCosts(prev => {
      const updated = prev.map(m => m.id === item.id ? item : m);
      saveStorageItems('MATERIAL_COSTS', updated);
      return updated;
    });
    pushMaterialCostToSupabase(item);
  }, []);

  const deleteMaterialCost = useCallback((id) => {
    setMaterialCosts(prev => {
      const updated = prev.filter(m => m.id !== id);
      saveStorageItems('MATERIAL_COSTS', updated);
      return updated;
    });
    deleteMaterialCostFromSupabase(id);
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
    verifyOutflow,
    deleteHistoryItem,
    updateOutflowMemo,
    getInventoryRecord,
    saveCalendarNote,
    deleteCalendarNote,
    syncFromSupabase,
    addReport,
    updateReport,
    deleteReport,
    shippingCharts,
    saveShippingChart,
    deleteShippingChart,
    materialCosts,
    addMaterialCost,
    updateMaterialCost,
    deleteMaterialCost,
    bannerSettings,
    updateBannerSettings,
    resetBannerSettings,
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
    shippingCharts,
    materialCosts,
    loading,
    bannerSettings,
    updateBannerSettings,
    resetBannerSettings,
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
    verifyOutflow,
    deleteHistoryItem,
    updateOutflowMemo,
    getInventoryRecord,
    saveCalendarNote,
    deleteCalendarNote,
    syncFromSupabase,
    addReport,
    updateReport,
    deleteReport,
    saveShippingChart,
    deleteShippingChart,
    addMaterialCost,
    updateMaterialCost,
    deleteMaterialCost,
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
