import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import { loadInitialLocalStorageData, saveStorageItems } from './services/storageService';
import * as remote from './services/supabaseService';
import { tracked } from './services/pushTracker';
import { useAuth } from './AuthContext';
import { canReadRecipeData } from './utils/permissions';
import { mergeShippingCharts } from './utils/syncMerge';
import { applyOutbox, mergeQueues } from './utils/outboxQueue';
import { enqueueSave, flushOutbox, getOutbox, getOutboxCount, subscribeOutbox } from './services/outbox';

const { fetchAllRemoteData } = remote;

// 업무 데이터 저장·삭제는 저장 대기열(outbox)을 거친다: 실패하면 남겨 두었다가 다시 보낸다.
const pushProductToSupabase = (p) => enqueueSave('product', 'upsert', p.id, p);
const deleteProductFromSupabase = (id) => enqueueSave('product', 'delete', id);
const pushPlanToSupabase = (p) => enqueueSave('plan', 'upsert', p.id, p);
const deletePlanFromSupabase = (id) => enqueueSave('plan', 'delete', id);
const pushInventoryToSupabase = (r) => enqueueSave('inventory', 'upsert', r.planId, r);
const pushCalendarNoteToSupabase = (n) => enqueueSave('calendarNote', 'upsert', n.dateStr, n);
const deleteCalendarNoteFromSupabase = (dateStr) => enqueueSave('calendarNote', 'delete', dateStr);
const pushReportToSupabase = (r) => enqueueSave('report', 'upsert', r.id, r);
const deleteReportFromSupabase = (id) => enqueueSave('report', 'delete', id);
const pushShippingChartToSupabase = (c) => enqueueSave('shippingChart', 'upsert', c.date, c);
const deleteShippingChartFromSupabase = (date) => enqueueSave('shippingChart', 'delete', date);
const pushMaterialCostToSupabase = (m) => enqueueSave('materialCost', 'upsert', m.id, m);
const deleteMaterialCostFromSupabase = (id) => enqueueSave('materialCost', 'delete', id);
// 배너(관리자 전용)는 updatedAt 비교로 스스로 다시 올리므로 대기열 없이 추적만 한다.
const pushBannerSettingsToSupabase = tracked(remote.pushBannerSettingsToSupabase);

const WyshContext = createContext();

export const WyshProvider = ({ children }) => {
  // 작업자 기록용: 현재 로그인한 계정 id (콜백 의존성을 늘리지 않도록 ref 로 읽는다)
  const { user, profile } = useAuth();
  const actorRef = useRef(null);
  actorRef.current = user?.id || null;
  // 배합 데이터 수신 권한 (동기화 콜백에서 ref 로 읽는다)
  const canReadRecipesRef = useRef(false);
  canReadRecipesRef.current = canReadRecipeData(profile);
  const isAdminRef = useRef(false);
  isAdminRef.current = !!(profile?.is_admin && profile?.is_active);

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
  const [pendingSaveCount, setPendingSaveCount] = useState(getOutboxCount);
  useEffect(() => subscribeOutbox(setPendingSaveCount), []);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_recipes' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
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
      // 대기 중인 저장을 먼저 보내 본다. 조회 시작 시점의 대기열도 기억해 두었다가 결과 위에 덮는다.
      await flushOutbox();
      const outboxAtStart = getOutbox();
      const {
        mappedProducts,
        mappedPlans,
        mappedInventory,
        mappedCalendarNotes,
        mappedReports,
        mappedShippingCharts,
        mappedMaterialCosts,
        remoteBannerSettings
      } = await fetchAllRemoteData({ canReadRecipes: canReadRecipesRef.current });

      if (remoteBannerSettings) {
        setBannerSettings(prev => {
          if (!prev || !prev.updatedAt || (remoteBannerSettings.updatedAt && remoteBannerSettings.updatedAt >= prev.updatedAt)) {
            try {
              localStorage.setItem('wysh_banner_settings', JSON.stringify(remoteBannerSettings));
            } catch (e) {
              console.error('Failed to sync remote banner settings to localStorage:', e);
            }
            return remoteBannerSettings;
          } else if (isAdminRef.current && prev && prev.updatedAt && remoteBannerSettings.updatedAt && prev.updatedAt > remoteBannerSettings.updatedAt) {
            // 배너는 관리자만 저장할 수 있다
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
      localStorage.removeItem('wysh_deleted_material_costs');

      // 보조 테이블 조회가 실패하면(null) 로컬 값을 유지한다
      const finalNotes = mappedCalendarNotes ?? (localInitial.calendarNotes || []);
      const finalReports = mappedReports ?? (localInitial.reports || []);
      const finalPlans = mappedPlans || [];
      const finalMaterials = mappedMaterialCosts ?? (localInitial.materialCosts || []);
      const finalInventory = mappedInventory || [];

      // Maintain products compatibility and preserve local recipeMemo if remote DB column does not exist yet
      const currentLocalProducts = localInitial.products || [];
      const mergedProductsMap = new Map();
      mappedProducts.forEach(p => {
        const localP = currentLocalProducts.find(lp => lp.id === p.id);
        const localMemo = localP ? (localP.recipeMemo || localP.memo || '') : '';
        // 배합 데이터 권한이 없으면 로컬에 남아 있던 예전 값으로 되살리지 않는다
        const mergedProduct = p.recipeHidden ? {
          ...p,
          salePrice: p.salePrice ?? (localP ? localP.salePrice ?? null : null)
        } : {
          ...p,
          recipeMemo: p.recipeMemo || localMemo,
          // sale_price 컬럼이 아직 없으면 원격 값이 null → 로컬 판매가 유지
          salePrice: p.salePrice ?? (localP ? localP.salePrice ?? null : null),
          // packaging 컬럼이 아직 없으면 원격 값이 null → 로컬 부자재 구성 유지
          packaging: p.packaging ?? (localP ? localP.packaging ?? null : null)
        };
        mergedProductsMap.set(p.id, mergedProduct);
      });

      const finalProducts = Array.from(mergedProductsMap.values());

      // 출고표 병합: 원격에 없는 로컬 출고표는 삭제된 것으로 보고 버린다 (조회 실패 시에는 로컬 유지)
      const { charts: finalCharts, toPush: chartsToPush } = mergeShippingCharts(localInitial.shippingCharts, mappedShippingCharts);
      chartsToPush.forEach(c => pushShippingChartToSupabase(c));

      // 아직 서버에 반영되지 않은 저장·삭제를 서버 값 위에 덮는다 (보내기 전에 화면에서 사라지지 않도록)
      const merged = applyOutbox({
        products: finalProducts,
        plans: finalPlans,
        inventory: finalInventory,
        calendarNotes: finalNotes,
        reports: finalReports,
        shippingCharts: finalCharts,
        materialCosts: finalMaterials
      }, mergeQueues(outboxAtStart, getOutbox()));

      // Save Authoritative Remote State to LocalStorage and React State
      saveStorageItems('PRODUCTS', merged.products);
      saveStorageItems('PLANS', merged.plans);
      saveStorageItems('INVENTORY', merged.inventory);
      saveStorageItems('CALENDAR_NOTES', merged.calendarNotes);
      saveStorageItems('REPORTS', merged.reports);
      saveStorageItems('SHIPPING_CHARTS', merged.shippingCharts);
      saveStorageItems('MATERIAL_COSTS', merged.materialCosts);

      setProducts(merged.products);
      setPlans(merged.plans);
      setInventory(merged.inventory);
      setCalendarNotes(merged.calendarNotes);
      setReports(merged.reports);
      setShippingCharts(merged.shippingCharts);
      setMaterialCosts(merged.materialCosts);

      setIsDbConnected(true);
      setDbError(null);
    } catch (e) {
      console.error("Failed to sync from Supabase:", e);
      setIsDbConnected(false);
      setDbError(e.message || "Failed to sync with database");
    }
  }, []);

  // 배합 데이터 권한이 바뀌면(관리자가 권한 변경) 바로 다시 받아 화면에 반영한다
  const canReadRecipesNow = canReadRecipeData(profile);
  const recipeAccessInitRef = useRef(true);
  useEffect(() => {
    if (recipeAccessInitRef.current) {
      recipeAccessInitRef.current = false;
      return;
    }
    syncFromSupabase();
  }, [canReadRecipesNow, syncFromSupabase]);

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
      id: newId,
      createdBy: actorRef.current,
      updatedBy: actorRef.current
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

  const updatePlan = useCallback((planChanges) => {
    const updatedPlan = { ...planChanges, updatedBy: actorRef.current };
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
      verified: verified !== undefined ? verified : true,
      createdBy: actorRef.current
    };
    if (newHistory.verified) {
      newHistory.verifiedBy = actorRef.current;
    }

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
            history: i.history.map(h => h.id === historyId ? { ...h, memo: newMemo, updatedBy: actorRef.current } : h)
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
    const actor = actorRef.current;
    setInventory(prev => {
      let updatedRecord = null;
      const updatedInventory = prev.map(i => {
        if (i.planId === planId) {
          updatedRecord = {
            ...i,
            history: i.history.map(h => {
              if (h.id !== historyId) return h;
              const nextVerified = verified !== undefined ? verified : (h.verified !== undefined ? h.verified : true);
              return {
                ...h,
                qty,
                purpose,
                date: dateString,
                memo: memo || '',
                signer: signer !== undefined ? signer : (h.signer || ''),
                verified: nextVerified,
                updatedBy: actor,
                verifiedBy: nextVerified && !h.verified ? actor : (h.verifiedBy || null)
              };
            })
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
            history: i.history.map(h => h.id === historyId ? { ...h, verified: true, verifiedBy: actorRef.current } : h)
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
    const existing = calendarNotes.find(n => n.dateStr === dateStr);
    const newNote = {
      dateStr,
      title,
      content,
      // 새 메모면 작성자 기록, 기존 메모면 원래 작성자는 DB 값을 그대로 둔다
      createdBy: existing ? (existing.createdBy || null) : actorRef.current,
      updatedBy: actorRef.current
    };
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
  }, [calendarNotes]);

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
      createdAt: new Date().toISOString(),
      createdBy: actorRef.current,
      updatedBy: actorRef.current
    };
    setReports(prev => {
      const updatedReports = [newReport, ...prev];
      saveStorageItems('REPORTS', updatedReports);
      return updatedReports;
    });
    pushReportToSupabase(newReport);
    return newReport;
  }, []);

  const updateReport = useCallback((reportChanges) => {
    const updatedRep = { ...reportChanges, updatedBy: actorRef.current };
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
    isDbConnected,
    dbError,
    pendingSaveCount
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
    isDbConnected,
    dbError,
    pendingSaveCount
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
