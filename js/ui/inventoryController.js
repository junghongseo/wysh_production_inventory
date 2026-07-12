// InventoryController: UI Controller for Inventory Tables, Modals, and Outflow History
class InventoryController {
    init() {
        this.initEventListeners();
    }

    initEventListeners() {
        const modifyForm = document.getElementById('modify-qty-form');
        if (modifyForm) {
            modifyForm.onsubmit = (e) => this.handleModifyQtySubmit(e);
        }

        const outflowForm = document.getElementById('outflow-form');
        if (outflowForm) {
            outflowForm.onsubmit = (e) => this.handleOutflowSubmit(e);
        }

        // Close modify modal btns
        const closeBtn1 = document.getElementById('close-modify-modal-btn');
        const closeBtn2 = document.getElementById('cancel-modify-modal-btn');
        const modifyModal = document.getElementById('modify-qty-modal');
        
        const closeMod = () => {
            if (modifyModal) modifyModal.classList.remove('open');
        };
        if (closeBtn1) closeBtn1.onclick = closeMod;
        if (closeBtn2) closeBtn2.onclick = closeMod;
    }

    renderInventoryTable() {
        const store = window.wyshStore;
        const plans = store.getPlans();
        const products = store.getProducts();
        const inventory = store.getInventory();
        const tbody = document.getElementById('inventory-table-body');
        
        if (!tbody) return;
        tbody.innerHTML = '';

        // 최종 출고일(shippingLimit)이 오늘 날짜 기준 지나지 않은 계획만 필터링
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const todayStr = new Date(today.getTime() - offset).toISOString().split('T')[0];
        
        const activePlans = plans.filter(plan => plan.shippingLimit >= todayStr);

        if (activePlans.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state" style="text-align: center; padding: 30px;">
                        출고 대기 중인 생산 차수가 없습니다. (최종출고일 이전 계획만 표시)
                    </td>
                </tr>
            `;
            return;
        }

        activePlans.forEach(plan => {
            const prod = products.find(p => p.id === plan.productId);
            const prodName = prod ? prod.name : '알수없음';
            
            // Find matching inventory record
            const invRecord = inventory.find(i => i.planId === plan.id) || { actualQty: plan.totalQty, history: [] };
            
            // Compute current inventory: actualQty - sum(outflows)
            const totalOutflows = invRecord.history.reduce((sum, item) => sum + item.qty, 0);
            const currentStock = invRecord.actualQty - totalOutflows;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-family: var(--font-outfit); font-weight: 600; color: var(--color-primary);">${plan.id}</td>
                <td style="font-weight: 500;">${plan.name}</td>
                <td>${prodName}</td>
                <td style="text-align: right; font-family: var(--font-outfit);">${plan.totalQty.toLocaleString()}</td>
                <td style="text-align: right; font-family: var(--font-outfit); font-weight: 600; color: var(--color-success);">${invRecord.actualQty.toLocaleString()}</td>
                <td style="text-align: right; font-family: var(--font-outfit); font-weight: 700; color: ${currentStock < 100 ? 'var(--color-danger)' : 'var(--color-primary)'};">
                    ${currentStock.toLocaleString()}
                </td>
                <td style="text-align: center;">
                    <button class="btn-secondary modify-qty-btn" style="padding: 4px 8px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        실제 생산량 수정
                    </button>
                </td>
            `;
            const modifyBtn = row.querySelector('.modify-qty-btn');
            if (modifyBtn) {
                modifyBtn.onclick = () => this.openModifyQtyModal(plan.id);
            }
            tbody.appendChild(row);
        });
    }

    populateOutflowPlanDropdown() {
        const dropdown = document.getElementById('outflow-plan-select');
        if (!dropdown) return;

        const plans = window.wyshStore.getPlans();
        const products = window.wyshStore.getProducts();

        dropdown.innerHTML = '<option value="" disabled selected>출고할 생산 차수를 선택하세요</option>';
        
        // 최종 출고일(shippingLimit)이 오늘 날짜 기준 지나지 않은 계획만 필터링
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const todayStr = new Date(today.getTime() - offset).toISOString().split('T')[0];

        const activePlans = plans.filter(plan => plan.shippingLimit >= todayStr);

        activePlans.forEach(plan => {
            const prod = products.find(p => p.id === plan.productId);
            const prodName = prod ? prod.name : '알수없음';
            
            const opt = document.createElement('option');
            opt.value = plan.id;
            opt.innerText = `[${plan.id}] ${plan.name} (${prodName})`;
            dropdown.appendChild(opt);
        });
    }

    renderOutflowHistory() {
        const store = window.wyshStore;
        const inventory = store.getInventory();
        const plans = store.getPlans();
        const container = document.getElementById('inventory-history-timeline');
        
        if (!container) return;
        container.innerHTML = '';

        // Collect all history items along with metadata
        let allItems = [];
        inventory.forEach(inv => {
            const plan = plans.find(p => p.id === inv.planId);
            const planName = plan ? plan.name : '삭제된 계획';
            
            inv.history.forEach(hist => {
                allItems.push({
                    planId: inv.planId,
                    planName: planName,
                    ...hist
                });
            });
        });

        // Sort by date/timestamp descending
        allItems.sort((a, b) => b.date.localeCompare(a.date));

        if (allItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <p>출고 내역이 없습니다. 양식을 작성하여 반영해 보세요.</p>
                </div>
            `;
            return;
        }

        allItems.forEach(item => {
            const itemElem = document.createElement('div');
            itemElem.className = 'timeline-item';
            itemElem.innerHTML = `
                <div class="timeline-item-meta">
                    <span class="date">${item.date}</span>
                    <span class="purpose">
                        <strong style="color: var(--color-primary);">${item.planId}</strong> 
                        (${item.purpose}) - ${item.planName}
                    </span>
                </div>
                <div class="timeline-item-values">
                    <span class="qty">-${item.qty}개</span>
                    <button class="btn-delete-tiny" title="출고 취소">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
            const deleteBtn = itemElem.querySelector('.btn-delete-tiny');
            if (deleteBtn) {
                deleteBtn.onclick = () => this.deleteHistoryItem(item.planId, item.id);
            }
            container.appendChild(itemElem);
        });
    }

    openModifyQtyModal(planId) {
        const store = window.wyshStore;
        const plan = store.getPlans().find(p => p.id === planId);
        if (!plan) return;

        const record = store.getInventoryRecord(planId) || { actualQty: plan.totalQty };

        document.getElementById('modify-plan-id').value = planId;
        document.getElementById('modify-plan-name-label').innerText = plan.name;
        document.getElementById('modify-plan-qty-label').innerText = `${plan.totalQty.toLocaleString()} 개`;
        document.getElementById('modify-actual-qty').value = record.actualQty;

        const modifyModal = document.getElementById('modify-qty-modal');
        if (modifyModal) modifyModal.classList.add('open');
    }

    handleModifyQtySubmit(e) {
        e.preventDefault();
        const planId = document.getElementById('modify-plan-id').value;
        const actualQty = parseInt(document.getElementById('modify-actual-qty').value) || 0;

        window.wyshStore.updateActualQty(planId, actualQty);
        
        const modifyModal = document.getElementById('modify-qty-modal');
        if (modifyModal) modifyModal.classList.remove('open');
    }

    handleOutflowSubmit(e) {
        e.preventDefault();
        const planId = document.getElementById('outflow-plan-select').value;
        const qty = parseInt(document.getElementById('outflow-qty').value) || 0;
        const purpose = document.getElementById('outflow-purpose').value;

        const store = window.wyshStore;
        
        // Check current inventory limit before allowing outflow
        const record = store.getInventoryRecord(planId);
        if (record) {
            const totalOutflows = record.history.reduce((sum, item) => sum + item.qty, 0);
            const currentStock = record.actualQty - totalOutflows;

            if (qty > currentStock) {
                alert(`출고 실패: 현재 재고 수량(${currentStock}개)을 초과하는 수량은 출고할 수 없습니다.`);
                return;
            }
        }

        store.addOutflow(planId, qty, purpose);

        // Reset fields
        document.getElementById('outflow-qty').value = '';
        document.getElementById('outflow-purpose').value = '';
    }

    deleteHistoryItem(planId, historyId) {
        window.showConfirmModal(
            '출고 취소',
            '이 출고 내역을 취소(삭제)하시겠습니까? 재고에 수량이 환원됩니다.',
            () => {
                window.wyshStore.deleteHistoryItem(planId, historyId);
            }
        );
    }
}

window.inventoryController = new InventoryController();
