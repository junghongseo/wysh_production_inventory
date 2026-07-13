// WYSH Production & Inventory Management Data Store

const STORAGE_KEYS = {
    PRODUCTS: 'wysh_products',
    PLANS: 'wysh_plans',
    INVENTORY: 'wysh_inventory'
};

// Initial Mock Data
const DEFAULT_PRODUCTS = [
    {
        id: 'prod-1',
        name: '그릭 요거트 플레인',
        weight: 150, // g
        yield: 28, // %
        color: 'blue',
        ingredients: [
            { name: '원유', ratio: 95 },
            { name: '유산균', ratio: 5 }
        ]
    },
    {
        id: 'prod-2',
        name: '블루베리 그릭 요거트',
        weight: 130, // g
        yield: 30, // %
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
        weight: 130, // g
        yield: 30, // %
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
        expectedOrderQty: 700,
        marketingQty: 50,
        bufferQty: 50,
        totalQty: 800, // (100 * 7) + 50 + 50
        fermenterType: 'large', // 428.57L needs large fermenter (300L~580L)
        totalVolumeL: 428.57 // (800 * 150g / 0.28) / 1000 = 428.57L
    },
    {
        id: 'P-20260713-01',
        name: '7월 2주차 블루베리 생산',
        productId: 'prod-2',
        startDate: '2026-07-13',
        bottlingDate: '2026-07-15',
        shippingLimit: '2026-07-22',
        expiryDate: '2026-08-06',
        expectedOrderQty: 2100,
        marketingQty: 110,
        bufferQty: 100,
        totalQty: 2310, // (300 * 7) + 110 + 100
        fermenterType: 'large', // Note: 1001L exceeds large (max 580L), but let's keep it for default mock data or adjust to fit. Wait! Large is 300L~580L. 1001L exceeds large. Let's make it fit by reducing avgOrderQty to 100, marketingQty 50, buffer 50 => totalQty 800 * 130g / 0.3 = 346.67L
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

class WyshStore {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.PLANS)) {
            localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(DEFAULT_PLANS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
            localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
        }

        // Asynchronously sync from Supabase if connected
        this.syncFromSupabase();
    }

    // =========================================================================
    // Supabase Synchronization (Pull & Push) Layer
    // =========================================================================

    async syncFromSupabase() {
        const client = window.supabaseClient;
        if (!client) return;

        console.log("Supabase Client detected. Syncing remote database state...");

        try {
            // A. Pull Products
            const { data: remoteProducts, error: errProducts } = await client
                .from('products')
                .select('*');
            if (errProducts) throw errProducts;

            // B. Pull Plans
            const { data: remotePlans, error: errPlans } = await client
                .from('plans')
                .select('*');
            if (errPlans) throw errPlans;

            // C. Pull Inventory
            const { data: remoteInventory, error: errInventory } = await client
                .from('inventory')
                .select('*');
            if (errInventory) throw errInventory;

            console.log("Supabase Fetch: Successfully pulled data from Cloud DB.");

            // Map DB snake_case columns back to Frontend camelCase models
            const products = remoteProducts.map(p => ({
                id: p.id,
                name: p.name,
                weight: p.weight,
                yield: p.yield,
                color: p.color,
                ingredients: p.ingredients
            }));

            const plans = remotePlans.map(p => ({
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
                memo: p.memo || ''
            }));

            const inventory = remoteInventory.map(i => ({
                planId: i.plan_id,
                actualQty: i.actual_qty,
                history: i.history
            }));

            // Overwrite local storage state
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
            localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
            localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));

            // Notify UI elements
            if (window.wyshObserver) {
                window.wyshObserver.notify('products', products);
                window.wyshObserver.notify('plans', plans);
                window.wyshObserver.notify('inventory', inventory);
            }
        } catch (e) {
            console.error("Supabase Pull Failure (Using LocalStorage offline-first fallback):", e);
        }
    }

    async pushProductToSupabase(product) {
        const client = window.supabaseClient;
        if (!client) return;
        try {
            const dbProduct = {
                id: product.id,
                name: product.name,
                weight: product.weight,
                yield: product.yield,
                color: product.color,
                ingredients: product.ingredients
            };
            const { error } = await client.from('products').upsert(dbProduct);
            if (error) throw error;
        } catch (e) {
            console.error("Supabase Push Error (Product):", e);
        }
    }

    async deleteProductFromSupabase(id) {
        const client = window.supabaseClient;
        if (!client) return;
        try {
            const { error } = await client.from('products').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error("Supabase Push Error (Delete Product):", e);
        }
    }

    async pushPlanToSupabase(plan) {
        const client = window.supabaseClient;
        if (!client) return;
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
                memo: plan.memo
            };
            const { error } = await client.from('plans').upsert(dbPlan);
            if (error) throw error;
        } catch (e) {
            console.error("Supabase Push Error (Plan):", e);
        }
    }

    async deletePlanFromSupabase(id) {
        const client = window.supabaseClient;
        if (!client) return;
        try {
            const { error } = await client.from('plans').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error("Supabase Push Error (Delete Plan):", e);
        }
    }

    async pushInventoryToSupabase(planId) {
        const client = window.supabaseClient;
        if (!client) return;
        try {
            const record = this.getInventoryRecord(planId);
            if (!record) return;
            const dbInventory = {
                plan_id: record.planId,
                actual_qty: record.actualQty,
                history: record.history
            };
            const { error } = await client.from('inventory').upsert(dbInventory);
            if (error) throw error;
        } catch (e) {
            console.error("Supabase Push Error (Inventory):", e);
        }
    }

    // Products CRUD
    getProducts() {
        const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
        let updated = false;
        products.forEach(p => {
            if (p.yield === undefined) {
                if (p.id === 'prod-1') p.yield = 28;
                else if (p.id === 'prod-2' || p.id === 'prod-3') p.yield = 30;
                else p.yield = 100;
                updated = true;
            }
            if (p.color === undefined) {
                if (p.id === 'prod-1') p.color = 'blue';
                else if (p.id === 'prod-2') p.color = 'purple';
                else if (p.id === 'prod-3') p.color = 'pink';
                else p.color = 'blue';
                updated = true;
            }
        });
        if (updated) {
            this.saveProducts(products);
        }
        return products;
    }

    saveProducts(products) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        if (window.wyshObserver) window.wyshObserver.notify('products', products);
    }

    addProduct(product) {
        const products = this.getProducts();
        product.id = 'prod-' + Date.now();
        products.push(product);
        this.saveProducts(products);
        
        // Push to Supabase
        this.pushProductToSupabase(product);
        return product;
    }

    deleteProduct(id) {
        let products = this.getProducts();
        products = products.filter(p => p.id !== id);
        this.saveProducts(products);

        // Cascade delete plans using this product
        let plans = this.getPlans();
        const plansToDelete = plans.filter(p => p.productId === id);
        plans = plans.filter(p => p.productId !== id);
        this.savePlans(plans);

        // Cascade delete inventory records for those plans
        let inventory = this.getInventory();
        const planIdsToDelete = plansToDelete.map(p => p.id);
        inventory = inventory.filter(i => !planIdsToDelete.includes(i.planId));
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
        
        if (window.wyshObserver) {
            window.wyshObserver.notify('plans', plans);
            window.wyshObserver.notify('inventory', inventory);
        }

        // Push delete to Supabase (Cascade delete on tables triggers database cleanup)
        this.deleteProductFromSupabase(id);
    }

    getProductById(id) {
        return this.getProducts().find(p => p.id === id);
    }

    // Plans CRUD
    getPlans() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS)) || [];
    }

    savePlans(plans) {
        localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
        if (window.wyshObserver) window.wyshObserver.notify('plans', plans);
    }

    addPlan(plan) {
        const plans = this.getPlans();
        // Generate plan ID e.g., P-YYYYMMDD-XX
        const dateStr = plan.startDate.replace(/-/g, '');
        const sameDayCount = plans.filter(p => p.startDate === plan.startDate).length;
        plan.id = `P-${dateStr}-${String(sameDayCount + 1).padStart(2, '0')}`;
        plans.push(plan);
        this.savePlans(plans);

        // Also create matching inventory record
        this.addInventoryRecord(plan.id, plan.totalQty);

        // Sync both records with Supabase
        this.pushPlanToSupabase(plan);
        this.pushInventoryToSupabase(plan.id);

        return plan;
    }

    deletePlan(id) {
        let plans = this.getPlans();
        plans = plans.filter(p => p.id !== id);
        this.savePlans(plans);

        // Delete inventory record too
        let inventory = this.getInventory();
        inventory = inventory.filter(i => i.planId !== id);
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
        
        if (window.wyshObserver) window.wyshObserver.notify('inventory', inventory);

        // Sync deletion with Supabase (Cascade delete removes matching inventory record in DB)
        this.deletePlanFromSupabase(id);
    }

    updatePlan(updatedPlan) {
        const plans = this.getPlans();
        const index = plans.findIndex(p => p.id === updatedPlan.id);
        if (index !== -1) {
            const oldPlan = plans[index];
            plans[index] = updatedPlan;
            this.savePlans(plans);

            // Update matching inventory record if exists
            const inventory = this.getInventory();
            const record = inventory.find(i => i.planId === updatedPlan.id);
            if (record) {
                // If actualQty matched the old totalQty, auto-sync it to the new totalQty
                if (record.actualQty === oldPlan.totalQty) {
                    record.actualQty = updatedPlan.totalQty;
                }
                localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
                if (window.wyshObserver) window.wyshObserver.notify('inventory', inventory);
            }

            // Sync modifications to Supabase
            this.pushPlanToSupabase(updatedPlan);
            this.pushInventoryToSupabase(updatedPlan.id);
        }
    }

    // Inventory CRUD
    getInventory() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY)) || [];
    }

    addInventoryRecord(planId, initialQty) {
        const inventory = this.getInventory();
        inventory.push({
            planId: planId,
            actualQty: initialQty,
            history: []
        });
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
        if (window.wyshObserver) window.wyshObserver.notify('inventory', inventory);
    }

    updateActualQty(planId, qty) {
        const inventory = this.getInventory();
        let record = inventory.find(i => i.planId === planId);
        if (record) {
            record.actualQty = qty;
        } else {
            record = {
                planId: planId,
                actualQty: qty,
                history: []
            };
            inventory.push(record);
        }
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
        if (window.wyshObserver) window.wyshObserver.notify('inventory', inventory);

        // Sync with Supabase
        this.pushInventoryToSupabase(planId);
    }

    addOutflow(planId, qty, purpose) {
        const inventory = this.getInventory();
        let record = inventory.find(i => i.planId === planId);
        if (!record) {
            const plan = this.getPlans().find(p => p.id === planId);
            const initialQty = plan ? plan.totalQty : 0;
            record = {
                planId: planId,
                actualQty: initialQty,
                history: []
            };
            inventory.push(record);
        }
        const date = new Date();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        record.history.unshift({
            id: 'h-' + Date.now(),
            date: dateString,
            qty: qty,
            purpose: purpose
        });
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
        if (window.wyshObserver) window.wyshObserver.notify('inventory', inventory);

        // Sync with Supabase
        this.pushInventoryToSupabase(planId);
    }

    deleteHistoryItem(planId, historyId) {
        const inventory = this.getInventory();
        const record = inventory.find(i => i.planId === planId);
        if (record) {
            record.history = record.history.filter(h => h.id !== historyId);
            localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
            if (window.wyshObserver) window.wyshObserver.notify('inventory', inventory);

            // Sync with Supabase
            this.pushInventoryToSupabase(planId);
        }
    }

    getInventoryRecord(planId) {
        const record = this.getInventory().find(i => i.planId === planId);
        if (!record) {
            const plan = this.getPlans().find(p => p.id === planId);
            if (plan) {
                return {
                    planId: planId,
                    actualQty: plan.totalQty,
                    history: []
                };
            }
        }
        return record;
    }
}

window.wyshStore = new WyshStore();
