import { supabase } from '../supabaseClient';

export const fetchAllRemoteData = async () => {
  if (!supabase) {
    throw new Error("Supabase client not initialized (missing environment variables)");
  }

  console.log("Supabase Client detected. Syncing remote database state...");

  const { data: remoteProducts, error: errProducts } = await supabase.from('products').select('*');
  if (errProducts) throw errProducts;

  const { data: remotePlans, error: errPlans } = await supabase.from('plans').select('*');
  if (errPlans) throw errPlans;

  const { data: remoteInventory, error: errInventory } = await supabase.from('inventory').select('*');
  if (errInventory) throw errInventory;

  let mappedCalendarNotes = [];
  try {
    const { data: remoteNotes, error: errNotes } = await supabase.from('calendar_notes').select('*');
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

  let mappedReports = [];
  try {
    const { data: remoteReports, error: errReports } = await supabase.from('reports').select('*');
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
    const isSubIngredientVal = p.category === 'sub_ingredient' || p.is_sub_ingredient === true
      || (p.name && (p.name.includes('페이스트') || p.name.includes('부재료') || p.name.includes('라즈베리(수율')));

    const isFlavorVal = !isSubIngredientVal && (p.is_flavor !== undefined && p.is_flavor !== null 
      ? p.is_flavor 
      : (p.id === 'prod-2' || p.id === 'prod-3' || (p.name && (p.name.includes('블랙카카오') || p.name.includes('피스타치오') || p.name.includes('블루베리') || p.name.includes('딸기')))));
    const categoryVal = p.category || (isSubIngredientVal ? 'sub_ingredient' : (isFlavorVal ? 'flavor' : 'plain'));
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
      isSubIngredient: isSubIngredientVal,
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
      items
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
    mappedReports
  };
};

export const pushProductToSupabase = async (product) => {
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
};

export const deleteProductFromSupabase = async (id) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error("Supabase Push Error (Delete Product):", e);
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
      items: plan.items || []
    };
    const { error } = await supabase.from('plans').upsert(dbPlan);
    if (error) throw error;
  } catch (e) {
    console.error("Supabase Push Error (Plan):", e);
  }
};

export const deletePlanFromSupabase = async (id) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error("Supabase Push Error (Delete Plan):", e);
  }
};

export const pushInventoryToSupabase = async (record) => {
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

export const pushCalendarNoteToSupabase = async (note) => {
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
};

export const deleteCalendarNoteFromSupabase = async (dateStr) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('calendar_notes').delete().eq('date_str', dateStr);
    if (error) throw error;
  } catch (e) {
    console.error("Supabase Push Error (Delete CalendarNote):", e);
  }
};

export const pushReportToSupabase = async (report) => {
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
};

export const deleteReportFromSupabase = async (id) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error("Supabase Push Error (Delete Report):", e);
  }
};

// AI Manager Edge Function Calling & Event Functions
export const sendAIManagerMessage = async (userMessage, type = 'chat', sessionId = null, sessionTitle = null) => {
  if (!supabase) {
    throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");
  }
  
  try {
    // Supabase Edge Function 'ai-manager' 호출
    const { data, error } = await supabase.functions.invoke('ai-manager', {
      body: { userMessage, type, sessionId, sessionTitle }
    });

    if (error) {
      console.warn("Edge Function 호출 실패 (Direct Client Insertion Fallback):", error);
      throw error;
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

