import { supabase } from '../supabaseClient';
import { recordPushFailure } from './pushTracker';

// 작업자 기록 컬럼: 값이 있을 때만 보낸다 (과거 기록의 NULL 유지)
const attributionColumns = (record) => {
  const cols = {};
  if (record.createdBy) cols.created_by = record.createdBy;
  if (record.updatedBy) cols.updated_by = record.updatedBy;
  return cols;
};

// DB 권한(RLS·보호 트리거)에 막힌 저장인지
const isPermissionError = (err) =>
  !!err && (err.code === '42501' || /row-level security|권한이 필요합니다/i.test(err.message || ''));

let lastPermissionAlertAt = 0;

const reportPushError = (label, err) => {
  recordPushFailure();
  console.error(label, err);
  // 권한 때문에 저장이 거절되면 알려 준다. 화면은 다음 동기화(10초 이내) 때 서버 상태로 돌아간다.
  if (isPermissionError(err) && typeof window !== 'undefined' && Date.now() - lastPermissionAlertAt > 10000) {
    lastPermissionAlertAt = Date.now();
    const reason = /권한이 필요합니다/.test(err.message || '') ? `
(${err.message})` : '';
    window.alert(`권한이 없어 저장되지 않았습니다.${reason}
잠시 후 화면이 서버 상태로 돌아갑니다.`);
  }
};

// 테이블이 아직 없을 때(마이그레이션 전)의 오류인지
const isMissingTableError = (error) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|Could not find the table/i.test(error.message || ''));

/**
 * @param {{ canReadRecipes?: boolean }} options
 *   canReadRecipes: 배합 데이터(비율·레시피 메모·부자재 구성)를 받을 권한이 있는지.
 *   없으면 제품의 배합 필드를 비우고 recipeHidden 으로 표시한다.
 */
export const fetchAllRemoteData = async ({ canReadRecipes = false } = {}) => {
  if (!supabase) {
    throw new Error("Supabase client not initialized (missing environment variables)");
  }

  console.log("Supabase Client detected. Syncing remote database state...");

  const { data: remoteProducts, error: errProducts } = await supabase.from('products').select('*');
  if (errProducts) throw errProducts;

  // 배합 데이터는 product_recipes 에서 읽는다 (권한 없는 사람에게는 RLS 가 빈 결과를 준다).
  // 테이블이 아직 없으면(2-A 마이그레이션 전) products 의 기존 컬럼을 쓴다.
  let recipesById = null;
  if (canReadRecipes) {
    const { data: remoteRecipes, error: errRecipes } = await supabase.from('product_recipes').select('*');
    if (errRecipes) {
      if (!isMissingTableError(errRecipes)) throw errRecipes;
    } else {
      recipesById = new Map((remoteRecipes || []).map(r => [r.product_id, r]));
    }
  }

  const { data: remotePlans, error: errPlans } = await supabase.from('plans').select('*');
  if (errPlans) throw errPlans;

  const { data: remoteInventory, error: errInventory } = await supabase.from('inventory').select('*');
  if (errInventory) throw errInventory;

  // 보조 테이블 조회가 실패하면 null 을 돌려준다 → WyshContext 가 로컬 값을 그대로 유지한다
  // (빈 배열로 덮어쓰면 잠깐 끊겼을 때 목록이 통째로 사라진다)
  let mappedCalendarNotes = null;
  let remoteBannerSettings = null;
  try {
    const { data: remoteNotes, error: errNotes } = await supabase.from('calendar_notes').select('*');
    if (errNotes) {
      console.warn("Supabase Fetch Warn: calendar_notes query failed, maybe table is not created yet.", errNotes);
    } else if (remoteNotes) {
      const bannerNote = remoteNotes.find(n => n.date_str === '__banner_settings__');
      if (bannerNote && bannerNote.content) {
        try {
          remoteBannerSettings = JSON.parse(bannerNote.content);
        } catch (e) {
          console.warn("Failed to parse remote banner settings:", e);
        }
      }
      mappedCalendarNotes = remoteNotes
        .filter(n => n.date_str !== '__banner_settings__')
        .map(n => ({
          dateStr: n.date_str,
          title: n.title,
          content: n.content,
          createdBy: n.created_by || null,
          updatedBy: n.updated_by || null
        }));
    }
  } catch (errNotesFetch) {
    console.warn("Supabase Fetch Warning (calendar_notes):", errNotesFetch);
  }

  // 배너 설정은 app_settings 가 기준. 테이블이 없거나 값이 없으면 위의 calendar_notes 값을 쓴다.
  try {
    const { data: bannerRow, error: errBanner } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'banner')
      .maybeSingle();
    if (errBanner) {
      if (!isMissingTableError(errBanner)) console.warn("Supabase Fetch Warn: app_settings query failed.", errBanner);
    } else if (bannerRow?.value) {
      remoteBannerSettings = bannerRow.value;
    }
  } catch (errBannerFetch) {
    console.warn("Supabase Fetch Warning (app_settings):", errBannerFetch);
  }

  let mappedReports = null;
  try {
    const { data: remoteReports, error: errReports } = await supabase.from('reports').select('*');
    if (errReports) {
      console.warn("Supabase Fetch Warn: reports query failed, maybe table is not created yet.", errReports);
    } else if (remoteReports) {
      mappedReports = remoteReports.map(r => {
        const isConfirmed = r.confirmed !== undefined && r.confirmed !== null 
          ? !!r.confirmed 
          : (r.details && r.details.confirmed !== undefined ? !!r.details.confirmed : false);
        const confirmedAt = r.confirmed_at || r.details?.confirmedAt || null;

        return {
          id: r.id,
          planId: r.plan_id,
          type: r.type,
          workerName: r.worker_name,
          confirmed: isConfirmed,
          confirmedAt: confirmedAt,
          checkedItems: r.checked_items,
          details: r.details,
          createdAt: r.created_at,
          createdBy: r.created_by || null,
          updatedBy: r.updated_by || null
        };
      });
    }
  } catch (errReportsFetch) {
    console.warn("Supabase Fetch Warning (reports):", errReportsFetch);
  }

  let mappedShippingCharts = null;
  try {
    const { data: remoteCharts, error: errCharts } = await supabase.from('shipping_charts').select('*');
    if (errCharts) {
      console.warn("Supabase Fetch Warn: shipping_charts query failed, table might not exist yet.", errCharts);
    } else if (remoteCharts) {
      mappedShippingCharts = remoteCharts.map(c => ({
        date: c.date,
        title: c.title,
        totalCount: c.total_count,
        productTotals: c.product_totals || [],
        results: c.results || [],
        qtyBreakdown: c.qty_breakdown || { count1: 0, count2: 0, count3Plus: 0, percent1: '0.0%', percent2: '0.0%', percent3Plus: '0.0%' },
        remarks: c.remarks || '',
        updatedAt: c.updated_at
      }));
    }
  } catch (errChartsFetch) {
    console.warn("Supabase Fetch Warning (shipping_charts):", errChartsFetch);
  }

  let mappedMaterialCosts = null;
  try {
    const { data: remoteMaterials, error: errMaterials } = await supabase.from('material_costs').select('*');
    if (errMaterials) {
      console.warn("Supabase Fetch Warn: material_costs query failed, table might not exist yet.", errMaterials);
    } else if (remoteMaterials) {
      mappedMaterialCosts = remoteMaterials.map(m => ({
        id: m.id,
        category: m.category || 'raw',
        name: m.name,
        manufacturer: m.manufacturer || '',
        supplier: m.supplier || '',
        packageQty: parseFloat(m.package_qty) || 0,
        unit: m.unit || 'g',
        priceVatInclusive: parseFloat(m.price_vat_inclusive) || 0,
        taxType: m.tax_type || 'taxable',
        memo: m.memo || '',
        updatedAt: m.updated_at
      }));
    }
  } catch (errMaterialsFetch) {
    console.warn("Supabase Fetch Warning (material_costs):", errMaterialsFetch);
  }

  console.log("Supabase Fetch: Successfully pulled data from Cloud DB.");

  const mappedProducts = remoteProducts.map(p => {
    const isSubIngredientVal = p.category === 'sub_ingredient' || p.is_sub_ingredient === true
      || (p.name && (p.name.includes('페이스트') || p.name.includes('부재료') || p.name.includes('라즈베리(수율')));

    const isFlavorVal = !isSubIngredientVal && (p.is_flavor !== undefined && p.is_flavor !== null 
      ? p.is_flavor 
      : (p.id === 'prod-2' || p.id === 'prod-3' || (p.name && (p.name.includes('블랙카카오') || p.name.includes('피스타치오') || p.name.includes('블루베리') || p.name.includes('딸기')))));
    const categoryVal = p.category || (isSubIngredientVal ? 'sub_ingredient' : (isFlavorVal ? 'flavor' : 'plain'));
    const baseProdIdVal = p.base_product_id !== undefined ? p.base_product_id : null;

    // 배합 필드: 권한 없음 → 비움, product_recipes 있음 → 그 값(없으면 products 기존 값), 테이블 없음 → products 기존 값
    let recipe;
    if (!canReadRecipes) {
      recipe = { ingredients: [], recipeMemo: '', packaging: null, recipeHidden: true };
    } else {
      const r = recipesById ? recipesById.get(p.id) : null;
      const ingredients = r?.ingredients ?? p.ingredients;
      const packaging = r?.packaging ?? p.packaging;
      recipe = {
        ingredients: Array.isArray(ingredients) ? ingredients : [],
        recipeMemo: r?.recipe_memo || p.recipe_memo || p.recipeMemo || p.memo || '',
        // packaging 이 없거나 미설정이면 null → 로컬 값 유지 (WyshContext 병합)
        packaging: Array.isArray(packaging) ? packaging : null,
        recipeHidden: false
      };
    }

    return {
      id: p.id,
      name: p.name,
      weight: p.weight,
      yield: p.yield,
      color: p.color,
      ingredients: recipe.ingredients,
      category: categoryVal,
      isFlavor: isFlavorVal,
      isSubIngredient: isSubIngredientVal,
      baseProductId: baseProdIdVal,
      recipeMemo: recipe.recipeMemo,
      recipeHidden: recipe.recipeHidden,
      salePrice: p.sale_price !== undefined && p.sale_price !== null ? parseFloat(p.sale_price) : null,
      packaging: recipe.packaging,
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
        totalQty: p.total_qty,
        bottlingDate: p.bottling_date,
        shippingLimit: p.shipping_limit,
        expiryDate: p.expiry_date
      }
    ];
    const rawItems = p.items && Array.isArray(p.items) && p.items.length > 0 ? p.items : defaultItems;
    const items = rawItems.map(it => ({
      ...it,
      bottlingDate: it.bottlingDate || p.bottling_date,
      shippingLimit: it.shippingLimit || p.shipping_limit,
      expiryDate: it.expiryDate || p.expiry_date
    }));

    const primaryItem = items[0] || {};

    return {
      id: p.id,
      name: p.name,
      planType: p.plan_type || 'yogurt',
      subProductId: p.sub_product_id || null,
      targetYogurtProductId: p.target_yogurt_product_id || null,
      targetYogurtQty: p.target_yogurt_qty || 0,
      productId: p.product_id,
      startDate: p.start_date,
      bottlingDate: primaryItem.bottlingDate || p.bottling_date,
      shippingLimit: primaryItem.shippingLimit || p.shipping_limit,
      expiryDate: primaryItem.expiryDate || p.expiry_date,
      expectedOrderQty: p.expected_order_qty,
      marketingQty: p.marketing_qty,
      bufferQty: p.buffer_qty,
      totalQty: p.total_qty,
      fermenterType: p.fermenter_type,
      totalVolumeL: parseFloat(p.total_volume_l) || 0,
      memo: p.memo || '',
      items,
      createdBy: p.created_by || null,
      updatedBy: p.updated_by || null
    };
  });

  const mappedInventory = remoteInventory.map(i => ({
    planId: i.plan_id,
    actualQty: i.actual_qty,
    itemActualQtys: i.item_actual_qtys || {},
    history: i.history
  }));

  return {
    mappedProducts,
    mappedPlans,
    mappedInventory,
    mappedCalendarNotes,
    mappedReports,
    mappedShippingCharts,
    mappedMaterialCosts,
    remoteBannerSettings
  };
};

// 배너 설정 저장: app_settings(관리자만 쓰기)에 저장한다.
// 2-B 전까지는 예전 앱이 읽는 calendar_notes 특수 행에도 함께 쓴다(실패해도 무시).
export const pushBannerSettingsToSupabase = async (bannerSettings) => {
  if (!supabase || !bannerSettings) return;
  // 배너는 app_settings 에만 저장한다 (예전 calendar_notes '__banner_settings__' 행은 2-B 에서 삭제)
  try {
    const { error } = await supabase.from('app_settings').upsert({
      key: 'banner',
      value: bannerSettings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    if (error) reportPushError("Failed to push banner settings to Supabase:", error);
  } catch (err) {
    reportPushError("Error pushing banner settings to Supabase:", err);
  }
};

export const pushShippingChartToSupabase = async (chart) => {
  if (!supabase || !chart) return;
  try {
    const dbChart = {
      date: chart.date,
      title: chart.title,
      total_count: chart.totalCount,
      product_totals: chart.productTotals,
      results: chart.results,
      qty_breakdown: chart.qtyBreakdown,
      remarks: chart.remarks || '',
      updated_at: chart.updatedAt || new Date().toISOString()
    };
    const { error } = await supabase.from('shipping_charts').upsert(dbChart);
    if (error) reportPushError("Supabase Push Error (ShippingChart):", error);
  } catch (e) {
    reportPushError("Supabase Push Error (ShippingChart):", e);
  }
};

export const deleteShippingChartFromSupabase = async (date) => {
  if (!supabase || !date) return;
  try {
    const { error } = await supabase.from('shipping_charts').delete().eq('date', date);
    if (error) reportPushError("Supabase Push Error (Delete ShippingChart):", error);
  } catch (e) {
    reportPushError("Supabase Push Error (Delete ShippingChart):", e);
  }
};

export const pushProductToSupabase = async (product) => {
  if (!supabase) return;
  try {
    // 배합 데이터를 받지 못한(권한 없는) 기기에서는 배합 필드를 보내지 않아 원격 값을 지우지 않는다.
    // DB 트리거가 products 의 배합 필드를 product_recipes 로 복사한다.
    const recipeColumns = product.recipeHidden ? {} : {
      ingredients: product.ingredients,
      recipe_memo: product.recipeMemo || product.memo || '',
      // 부자재 구성을 모르는(설정 전) 로컬 제품은 키를 빼서 원격 값을 null로 덮어쓰지 않음
      ...(Array.isArray(product.packaging) ? { packaging: product.packaging } : {})
    };
    const dbProduct = {
      id: product.id,
      name: product.name,
      weight: product.weight,
      yield: product.yield,
      color: product.color,
      category: product.category,
      is_flavor: product.isFlavor,
      base_product_id: product.baseProductId,
      sale_price: product.salePrice ?? null,
      ...recipeColumns,
      shipping_limit_days: product.shippingLimitDays,
      expiry_days: product.expiryDays,
      default_sterilization_temp: product.defaultSterilizationTemp,
      default_sterilization_time: product.defaultSterilizationTime,
      default_cooling_temp: product.defaultCoolingTemp,
      default_inoculation_temp: product.defaultInoculationTemp,
      default_heating_temp: product.defaultHeatingTemp,
      default_heater_temp: product.defaultHeaterTemp
    };
    // 마이그레이션이 아직 적용되지 않은 선택 컬럼은 빼고 다시 시도 (값은 로컬에 유지됨)
    const OPTIONAL_COLUMNS = ['recipe_memo', 'sale_price', 'packaging'];
    let payload = { ...dbProduct };
    let { error } = await supabase.from('products').upsert(payload);
    for (let attempt = 0; error && attempt < OPTIONAL_COLUMNS.length; attempt++) {
      const msg = error.message || '';
      const missingCols = OPTIONAL_COLUMNS.filter(c => c in payload && msg.includes(c));
      if (missingCols.length === 0 && error.code !== 'PGRST204') break;
      const toDrop = missingCols.length > 0 ? missingCols : OPTIONAL_COLUMNS.filter(c => c in payload);
      if (toDrop.length === 0) break;
      toDrop.forEach(c => { delete payload[c]; });
      ({ error } = await supabase.from('products').upsert(payload));
    }
    if (error) reportPushError("Supabase Push Error (Product):", error);
  } catch (e) {
    reportPushError("Supabase Push Error (Product):", e);
  }
};

export const deleteProductFromSupabase = async (id) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    reportPushError("Supabase Push Error (Delete Product):", e);
  }
};

export const pushPlanToSupabase = async (plan) => {
  if (!supabase) return;
  try {
    const dbPlan = {
      id: plan.id,
      name: plan.name,
      plan_type: plan.planType || 'yogurt',
      sub_product_id: plan.subProductId || null,
      target_yogurt_product_id: plan.targetYogurtProductId || null,
      target_yogurt_qty: plan.targetYogurtQty || 0,
      product_id: plan.productId || null,
      start_date: plan.startDate,
      bottling_date: plan.bottlingDate || null,
      shipping_limit: plan.shippingLimit || null,
      expiry_date: plan.expiryDate || null,
      expected_order_qty: plan.expectedOrderQty || 0,
      marketing_qty: plan.marketingQty || 0,
      buffer_qty: plan.bufferQty || 0,
      total_qty: plan.totalQty || 0,
      fermenter_type: plan.fermenterType || null,
      total_volume_l: plan.totalVolumeL || 0,
      memo: plan.memo || '',
      items: plan.items || [],
      ...attributionColumns(plan)
    };
    const { error } = await supabase.from('plans').upsert(dbPlan);
    if (error) throw error;
  } catch (e) {
    reportPushError("Supabase Push Error (Plan):", e);
  }
};

export const deletePlanFromSupabase = async (id) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    reportPushError("Supabase Push Error (Delete Plan):", e);
  }
};

export const pushInventoryToSupabase = async (record) => {
  if (!supabase || !record) return;
  try {
    const dbInventory = {
      plan_id: record.planId,
      actual_qty: record.actualQty,
      item_actual_qtys: record.itemActualQtys || {},
      history: record.history
    };
    const { error } = await supabase.from('inventory').upsert(dbInventory);
    if (error) throw error;
  } catch (e) {
    reportPushError("Supabase Push Error (Inventory):", e);
  }
};

export const pushCalendarNoteToSupabase = async (note) => {
  if (!supabase) return;
  try {
    const dbNote = {
      date_str: note.dateStr,
      title: note.title,
      content: note.content,
      ...attributionColumns(note)
    };
    const { error } = await supabase.from('calendar_notes').upsert(dbNote);
    if (error) throw error;
  } catch (e) {
    reportPushError("Supabase Push Error (CalendarNote):", e);
  }
};

export const deleteCalendarNoteFromSupabase = async (dateStr) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('calendar_notes').delete().eq('date_str', dateStr);
    if (error) throw error;
  } catch (e) {
    reportPushError("Supabase Push Error (Delete CalendarNote):", e);
  }
};

export const pushReportToSupabase = async (report) => {
  if (!supabase) return;
  try {
    const reportDetails = {
      ...(report.details || {}),
      confirmed: !!report.confirmed,
      confirmedAt: report.confirmedAt || null
    };

    const dbReport = {
      id: report.id,
      plan_id: report.planId,
      type: report.type,
      worker_name: report.workerName,
      confirmed: !!report.confirmed,
      confirmed_at: report.confirmedAt || null,
      checked_items: report.checkedItems,
      details: reportDetails,
      created_at: report.createdAt,
      ...attributionColumns(report)
    };
    
    const { error } = await supabase.from('reports').upsert(dbReport);
    if (error) {
      // If confirmed column doesn't exist on remote table schema, fallback without top-level confirmed columns
      delete dbReport.confirmed;
      delete dbReport.confirmed_at;
      const { error: fallbackErr } = await supabase.from('reports').upsert(dbReport);
      if (fallbackErr) throw fallbackErr;
    }
  } catch (e) {
    reportPushError("Supabase Push Error (Report):", e);
  }
};

export const deleteReportFromSupabase = async (id) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    reportPushError("Supabase Push Error (Delete Report):", e);
  }
};

// AI Manager Edge Function Calling & Event Functions
export const sendAIManagerMessage = async (userMessage, type = 'chat', sessionId = null, sessionTitle = null, thinkingLevel = 'medium') => {
  if (!supabase) {
    throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");
  }
  
  try {
    const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY || undefined;
    // Supabase Edge Function 'ai-manager' 호출
    const { data, error } = await supabase.functions.invoke('ai-manager', {
      body: { userMessage, type, sessionId, sessionTitle, thinkingLevel, clientApiKey }
    });

    if (error) {
      let detailedMessage = error.message || "Edge Function 호출에 실패했습니다.";
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errBody = await error.context.json();
          if (errBody?.error) {
            detailedMessage = errBody.error;
          }
        } catch (_) {
          // ignore body parse failure
        }
      }
      console.warn("Edge Function 호출 실패:", detailedMessage);
      throw new Error(detailedMessage);
    }

    return data.reply;
  } catch (err) {
    console.error("AI Manager Service Error:", err);
    throw err;
  }
};

export const pushChatMessageToSupabase = async (role, content, sessionId, sessionTitle = null) => {
  if (!supabase) return;
  try {
    const id = (role === 'user' ? 'msg-u-' : 'msg-a-') + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const { error } = await supabase.from('chat_history').insert([
      {
        id,
        role,
        content,
        session_id: sessionId || ('sess-' + Date.now()),
        session_title: sessionTitle || (content.substring(0, 30) + '...')
      }
    ]);
    if (error) console.warn("Push chat message error:", error);
  } catch (e) {
    console.warn("Push chat message exception:", e);
  }
};

export const fetchChatSessionsFromSupabase = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('id, role, content, created_at, session_id, session_title')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Group rows by session_id
    const sessionsMap = new Map();
    data.forEach(row => {
      const sessId = row.session_id || 'default_legacy_session';
      if (!sessionsMap.has(sessId)) {
        sessionsMap.set(sessId, {
          sessionId: sessId,
          sessionTitle: row.session_title || (row.content ? row.content.substring(0, 30) : '대화 기록'),
          createdAt: row.created_at,
          lastMessage: row.content,
          messagesCount: 1
        });
      } else {
        const existing = sessionsMap.get(sessId);
        existing.messagesCount += 1;
      }
    });

    return Array.from(sessionsMap.values());
  } catch (e) {
    console.warn("Chat sessions fetch warn:", e);
    return [];
  }
};

export const fetchChatMessagesBySession = async (sessionId) => {
  if (!supabase) return [];
  try {
    let query = supabase.from('chat_history').select('*').order('created_at', { ascending: true });
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn("Chat messages by session fetch warn:", e);
    return [];
  }
};

export const fetchChatHistoryFromSupabase = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('chat_history').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn("Chat history fetch warn:", e);
    return [];
  }
};

export const fetchEventsFromSupabase = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn("Events fetch warn:", e);
    return [];
  }
};

export const pushMaterialCostToSupabase = async (materialCost) => {
  if (!supabase) return;
  try {
    const dbMaterial = {
      id: materialCost.id,
      category: materialCost.category,
      name: materialCost.name,
      manufacturer: materialCost.manufacturer || '',
      supplier: materialCost.supplier || '',
      package_qty: materialCost.packageQty,
      unit: materialCost.unit,
      price_vat_inclusive: materialCost.priceVatInclusive,
      tax_type: materialCost.taxType,
      memo: materialCost.memo || '',
      updated_at: materialCost.updatedAt || new Date().toISOString()
    };
    const { error } = await supabase.from('material_costs').upsert(dbMaterial);
    if (error) {
      reportPushError("Supabase push material_costs warning:", error);
    }
  } catch (e) {
    reportPushError("Supabase Push Error (Material Cost):", e);
  }
};

export const deleteMaterialCostFromSupabase = async (id) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('material_costs').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    reportPushError("Supabase Push Error (Delete Material Cost):", e);
  }
};

export const pushEventToSupabase = async (eventData) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('events').upsert({
      id: eventData.id || 'evt-' + Date.now(),
      title: eventData.title,
      event_date: eventData.eventDate,
      product_id: eventData.productId || null,
      target_qty: eventData.targetQty || 0,
      memo: eventData.memo || ''
    });
    if (error) throw error;
  } catch (e) {
    console.error("Event Push Error:", e);
  }
};

