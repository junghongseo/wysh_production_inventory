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
  deleteReportFromSupabase
} from './services/supabaseService';

const WyshContext = createContext();

export const WyshProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [calendarNotes, setCalendarNotes] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Initialize data from LocalStorage and start Realtime sync
  useEffect(() => {
    const initialData = loadInitialLocalStorageData();
    setProducts(initialData.products);
    setPlans(initialData.plans);
    setInventory(initialData.inventory);
    setCalendarNotes(initialData.calendarNotes);
    setReports(initialData.reports);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
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
        mappedReports
      } = await fetchAllRemoteData();

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

      // Sort reports chronologically
      finalReports.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      // Save Authoritative Remote State to LocalStorage and React State
      saveStorageItems('PRODUCTS', finalProducts);
      saveStorageItems('PLANS', finalPlans);
      saveStorageItems('INVENTORY', finalInventory);
      saveStorageItems('CALENDAR_NOTES', finalNotes);
      saveStorageItems('REPORTS', finalReports);

      setProducts(finalProducts);
      setPlans(finalPlans);
      setInventory(finalInventory);
      setCalendarNotes(finalNotes);
      setReports(finalReports);

      setIsDbConnected(true);
      setDbError(null);
    } catch (e) {
      console.error("Failed to sync from Supabase:", e);
      setIsDbConnected(false);
      setDbError(e.message || "Failed to sync with database");
    }
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
