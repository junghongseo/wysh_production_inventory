// Custom Reusable Confirmation Modal Helper
window.showConfirmModal = function(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    
    if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn) {
        // Fallback to native confirm if elements are missing
        if (confirm(message)) {
            onConfirm();
        }
        return;
    }
    
    titleEl.innerText = title;
    messageEl.innerText = message;
    
    // Open modal
    modal.classList.add('open');
    
    // Bind buttons
    okBtn.onclick = () => {
        modal.classList.remove('open');
        onConfirm();
    };
    
    cancelBtn.onclick = () => {
        modal.classList.remove('open');
    };
};

let activeTab = 'calendar-view';
let calendarInstance = null;

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI controllers
    window.planController.init();
    window.inventoryController.init();
    window.recipeController.init();

    // Initialize Calendar component
    calendarInstance = new WyshCalendar('calendar-widget-container', (plan) => {
        window.planController.handlePlanSelection(plan);
    });
    window.calendarInstance = calendarInstance;
    calendarInstance.render();

    // Set up Observer Subscriptions for Reactive UI Updates
    if (window.wyshObserver) {
        window.wyshObserver.subscribe('products', () => {
            window.recipeController.renderProductList();
            window.planController.populateProductDropdowns();
            window.inventoryController.populateOutflowPlanDropdown();
            updateStats();
        });

        window.wyshObserver.subscribe('plans', () => {
            if (calendarInstance) calendarInstance.render();
            window.inventoryController.renderInventoryTable();
            window.inventoryController.populateOutflowPlanDropdown();
            updateStats();
            
            // Refresh detail sidebar if selection is still active
            if (window.planController.selectedPlan) {
                const refreshedPlan = window.wyshStore.getPlans().find(p => p.id === window.planController.selectedPlan.id);
                if (refreshedPlan) {
                    window.planController.handlePlanSelection(refreshedPlan);
                }
            }
        });

        window.wyshObserver.subscribe('inventory', () => {
            window.inventoryController.renderInventoryTable();
            window.inventoryController.renderOutflowHistory();
            updateStats();
        });
    }

    // Load initial tables, histories, lists and update dashboard stats
    window.inventoryController.renderInventoryTable();
    window.inventoryController.populateOutflowPlanDropdown();
    window.inventoryController.renderOutflowHistory();
    window.recipeController.renderProductList();
    updateStats();
});

// Navigation Tabs switching
function switchTab(tabId) {
    activeTab = tabId;
    
    // Toggle active class on views
    document.querySelectorAll('.tab-content').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');

    // Toggle active class on navigation buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (tabId === 'calendar-view') {
        document.getElementById('tab-calendar').classList.add('active');
        if (calendarInstance) calendarInstance.render();
    } else if (tabId === 'inventory-view') {
        document.getElementById('tab-inventory').classList.add('active');
        window.inventoryController.renderInventoryTable();
        window.inventoryController.populateOutflowPlanDropdown();
        window.inventoryController.renderOutflowHistory();
    } else if (tabId === 'recipes-view') {
        document.getElementById('tab-recipes').classList.add('active');
        window.recipeController.renderProductList();
        window.recipeController.renderRecipeEditor();
    }

    updateStats();
}

// Global Stats Sync
function updateStats() {
    const store = window.wyshStore;
    const products = store.getProducts();
    const plans = store.getPlans();
    const inventory = store.getInventory();

    // Product count
    document.getElementById('stat-products-count').innerText = `${products.length}개`;

    // Pending Plans (Start date is in future, or starts today and hasn't finished production cycle)
    const today = new Date().toISOString().split('T')[0];
    const pendingCount = plans.filter(p => p.startDate >= today).length;
    document.getElementById('stat-pending-plans').innerText = `${pendingCount}건`;

    // Total Current Stock (Sum of all actualQty - outflows)
    let totalStock = 0;
    inventory.forEach(inv => {
        const outflowSum = inv.history.reduce((sum, item) => sum + item.qty, 0);
        totalStock += (inv.actualQty - outflowSum);
    });
    document.getElementById('stat-total-stock').innerText = `${totalStock.toLocaleString()}개`;
}
