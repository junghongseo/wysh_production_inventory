// PlanController: UI Controller for Production Planning and Calendar Sidebars
class PlanController {
    constructor() {
        this.selectedPlan = null;
    }

    init() {
        this.initEventListeners();
        this.populateProductDropdowns();
    }

    // Populate product selection dropdowns in plan registration modal
    populateProductDropdowns() {
        const dropdown = document.getElementById('plan-product');
        if (!dropdown) return;

        const products = window.wyshStore.getProducts();
        dropdown.innerHTML = '<option value="" disabled selected>품목을 선택하세요</option>';
        
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = `${p.name} (${p.weight}g, 수율 ${p.yield || 28}%)`;
            dropdown.appendChild(opt);
        });
    }

    initEventListeners() {
        // Modal 1: Plan Registration
        const registerModal = document.getElementById('plan-registration-modal');
        const openRegisterBtn = document.getElementById('open-register-modal-btn');
        const closeRegisterBtn = document.getElementById('close-plan-modal-btn');
        const cancelRegisterBtn = document.getElementById('cancel-plan-modal-btn');

        if (openRegisterBtn) {
            openRegisterBtn.onclick = () => {
                // Reset form
                document.getElementById('plan-registration-form').reset();
                document.getElementById('plan-edit-id').value = '';
                document.getElementById('plan-modal-title').innerText = '생산 계획 수립';
                document.querySelector('#plan-registration-form button[type="submit"]').innerText = '생산 계획 등록';
                document.getElementById('plan-total-qty').value = '0';
                document.getElementById('plan-total-volume').value = '0.00 L';
                document.getElementById('submit-plan-btn').disabled = true;
                
                // Default start date to today
                const todayStr = new Date().toISOString().split('T')[0];
                document.getElementById('plan-start-date').value = todayStr;
                this.handleStartDateChange(); // Auto-calculates future dates

                const banner = document.getElementById('plan-validation-banner');
                banner.className = 'validation-banner';
                banner.innerText = '';

                registerModal.classList.add('open');
            };
        }

        const closePlanModal = () => {
            registerModal.classList.remove('open');
        };
        if (closeRegisterBtn) closeRegisterBtn.onclick = closePlanModal;
        if (cancelRegisterBtn) cancelRegisterBtn.onclick = closePlanModal;

        // Date triggers inside modal
        const startDateInput = document.getElementById('plan-start-date');
        if (startDateInput) {
            startDateInput.onchange = () => this.handleStartDateChange();
        }

        const bottlingDateInput = document.getElementById('plan-bottling-date');
        if (bottlingDateInput) {
            bottlingDateInput.onchange = () => this.handleBottlingDateChange();
        }

        const planProductInput = document.getElementById('plan-product');
        if (planProductInput) {
            planProductInput.onchange = () => this.calculatePlanQuantities();
        }

        // Qty triggers
        ['plan-avg-order', 'plan-marketing', 'plan-buffer'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.oninput = () => this.calculatePlanQuantities();
            }
        });

        const fermenterSelect = document.getElementById('plan-fermenter');
        if (fermenterSelect) {
            fermenterSelect.onchange = () => this.validateFermenterChoice();
        }

        // Form submit
        const planForm = document.getElementById('plan-registration-form');
        if (planForm) {
            planForm.onsubmit = (e) => this.handlePlanRegistrationSubmit(e);
        }

        // Recipe Drawer Close button
        const closeRecipeDrawerBtn = document.getElementById('close-recipe-drawer-btn');
        if (closeRecipeDrawerBtn) {
            closeRecipeDrawerBtn.onclick = () => {
                document.getElementById('recipe-drawer-overlay').classList.remove('open');
            };
        }

        // Close drawer when clicking overlay background
        const recipeDrawer = document.getElementById('recipe-drawer-overlay');
        if (recipeDrawer) {
            recipeDrawer.onclick = (e) => {
                if (e.target === recipeDrawer) {
                    recipeDrawer.classList.remove('open');
                }
            };
        }
    }

    handleStartDateChange() {
        const startDate = document.getElementById('plan-start-date').value;
        const cal = window.wyshService.calculateDates(startDate);

        document.getElementById('plan-bottling-date').value = cal.bottlingDate;
        document.getElementById('plan-shipping-limit').value = cal.shippingLimit;
        document.getElementById('plan-expiry-date').value = cal.expiryDate;

        this.validateFermenterChoice();
    }

    handleBottlingDateChange() {
        const bottlingDate = document.getElementById('plan-bottling-date').value;
        
        document.getElementById('plan-shipping-limit').value = window.wyshService.dateAddDays(bottlingDate, 7);
        document.getElementById('plan-expiry-date').value = window.wyshService.dateAddDays(bottlingDate, 22);

        this.validateFermenterChoice();
    }

    calculatePlanQuantities() {
        const productId = document.getElementById('plan-product').value;
        const avgOrder = parseInt(document.getElementById('plan-avg-order').value) || 0;
        const marketing = parseInt(document.getElementById('plan-marketing').value) || 0;
        const buffer = parseInt(document.getElementById('plan-buffer').value) || 0;

        const totalQty = window.wyshService.calculateTotalQty(avgOrder, marketing, buffer);
        document.getElementById('plan-total-qty').value = totalQty;

        if (!productId) {
            document.getElementById('plan-total-volume').value = '0.00 L';
            return;
        }

        const product = window.wyshStore.getProductById(productId);
        if (!product) return;

        const totalVolumeL = window.wyshService.calculateTotalVolumeL(totalQty, product.weight, product.yield);
        document.getElementById('plan-total-volume').value = `${totalVolumeL.toFixed(2)} L`;

        this.validateFermenterChoice();
    }

    validateFermenterChoice() {
        const banner = document.getElementById('plan-validation-banner');
        const submitBtn = document.getElementById('submit-plan-btn');
        const chosenFermenter = document.getElementById('plan-fermenter').value;
        const volumeText = document.getElementById('plan-total-volume').value;
        const totalVolume = parseFloat(volumeText) || 0;
        const startDate = document.getElementById('plan-start-date').value;

        if (!banner || !submitBtn) return;

        banner.className = 'validation-banner';
        banner.innerText = '';
        submitBtn.disabled = true;

        // Capacity validation
        const capacityCheck = window.wyshService.validateFermenterCapacity(totalVolume, chosenFermenter);
        if (!capacityCheck.valid) {
            banner.innerText = capacityCheck.message;
            banner.classList.add('show');
            return;
        }

        // Schedule Overlap validation
        const plans = window.wyshStore.getPlans();
        const planEditId = document.getElementById('plan-edit-id').value || null;
        const overlapCheck = window.wyshService.validateFermenterOverlap(chosenFermenter, startDate, planEditId, plans);
        if (!overlapCheck.valid) {
            banner.innerText = overlapCheck.message;
            banner.classList.add('show');
            return;
        }

        // If we passed all checks, show Success and enable submit
        banner.innerText = '✓ 발효기 가동 및 생산 일정이 정상 검증되었습니다.';
        banner.classList.add('show', 'success');
        submitBtn.disabled = false;
    }

    handlePlanRegistrationSubmit(e) {
        e.preventDefault();
        
        const planEditId = document.getElementById('plan-edit-id').value;
        const planName = document.getElementById('plan-name').value;
        const productId = document.getElementById('plan-product').value;
        const startDate = document.getElementById('plan-start-date').value;
        const bottlingDate = document.getElementById('plan-bottling-date').value;
        const shippingLimit = document.getElementById('plan-shipping-limit').value;
        const expiryDate = document.getElementById('plan-expiry-date').value;
        const avgOrder = parseInt(document.getElementById('plan-avg-order').value) || 0;
        const marketing = parseInt(document.getElementById('plan-marketing').value) || 0;
        const buffer = parseInt(document.getElementById('plan-buffer').value) || 0;
        const fermenterType = document.getElementById('plan-fermenter').value;

        const product = window.wyshStore.getProductById(productId);
        const totalQty = window.wyshService.calculateTotalQty(avgOrder, marketing, buffer);
        const totalVolumeL = window.wyshService.calculateTotalVolumeL(totalQty, product.weight, product.yield);

        if (planEditId) {
            const updatedPlan = {
                id: planEditId,
                name: planName,
                productId,
                startDate,
                bottlingDate,
                shippingLimit,
                expiryDate,
                avgOrderQty: avgOrder,
                marketingQty: marketing,
                bufferQty: buffer,
                totalQty,
                fermenterType,
                totalVolumeL
            };
            window.wyshStore.updatePlan(updatedPlan);
            // Re-select edited plan to update detail panel
            this.handlePlanSelection(updatedPlan);
        } else {
            const newPlan = {
                name: planName,
                productId,
                startDate,
                bottlingDate,
                shippingLimit,
                expiryDate,
                avgOrderQty: avgOrder,
                marketingQty: marketing,
                bufferQty: buffer,
                totalQty,
                fermenterType,
                totalVolumeL
            };
            window.wyshStore.addPlan(newPlan);
        }

        // Close modal
        document.getElementById('plan-registration-modal').classList.remove('open');
    }

    handlePlanSelection(plan) {
        this.selectedPlan = plan;
        const container = document.getElementById('plan-detail-content');
        if (!container) return;

        const product = window.wyshStore.getProductById(plan.productId);
        const prodName = product ? product.name : '알 수 없음';
        const singleWeight = product ? product.weight : 0;
        const yieldRate = product ? (product.yield || 28) : 0;

        container.innerHTML = `
            <div class="info-grid">
                <div class="info-row">
                    <span class="label">차수 ID</span>
                    <span class="value highlight" style="color:var(--color-primary);">${plan.id}</span>
                </div>
                <div class="info-row">
                    <span class="label">생산 계획명</span>
                    <span class="value" style="font-weight:600;">${plan.name}</span>
                </div>
                <div class="info-row">
                    <span class="label">생산 품목</span>
                    <span class="value">${prodName} (${singleWeight}g, 수율 ${yieldRate}%)</span>
                </div>
                <div class="info-row">
                    <span class="label">가동 발효기</span>
                    <span class="value fermenter">${plan.fermenterType === 'small' ? '소형 발효기' : '대형 발효기'}</span>
                </div>
                <div class="info-row">
                    <span class="label">원재료 총 투입량</span>
                    <span class="value highlight" style="color:var(--color-success);">${plan.totalVolumeL.toFixed(2)} L</span>
                </div>
                <div class="info-row">
                    <span class="label">1일차 [발효]</span>
                    <span class="value">${plan.startDate}</span>
                </div>
                <div class="info-row">
                    <span class="label">3일차 [병입]</span>
                    <span class="value">${plan.bottlingDate}</span>
                </div>
                
                <div class="info-row" style="border: 1px dashed var(--color-warning);">
                    <span class="label" style="color:var(--color-warning);">🚚 최종 출고기한</span>
                    <span class="value" style="color:var(--color-warning); font-weight:600;">${plan.shippingLimit}</span>
                </div>
                <div class="info-row" style="border: 1px dashed var(--color-danger);">
                    <span class="label" style="color:var(--color-danger);">⚠️ 최종 소비기한</span>
                    <span class="value" style="color:var(--color-danger); font-weight:600;">${plan.expiryDate}</span>
                </div>
                
                <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 8px;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.7rem; color:var(--text-muted);">주문(7일)</div>
                        <div style="font-size: 0.85rem; font-weight:600; font-family:var(--font-outfit);">${plan.avgOrderQty * 7}</div>
                    </div>
                    <div style="text-align: center; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color);">
                        <div style="font-size: 0.7rem; color:var(--text-muted);">마케팅</div>
                        <div style="font-size: 0.85rem; font-weight:600; font-family:var(--font-outfit);">${plan.marketingQty}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.7rem; color:var(--text-muted);">여유분</div>
                        <div style="font-size: 0.85rem; font-weight:600; font-family:var(--font-outfit);">${plan.bufferQty}</div>
                    </div>
                </div>
                
                <div class="info-row" style="background: rgba(56,189,248,0.05); border-color: rgba(56,189,248,0.2);">
                    <span class="label" style="color:var(--color-primary);">총 생산 목표량</span>
                    <span class="value" style="font-size: 1rem; font-weight:700; color:var(--color-primary);">${plan.totalQty.toLocaleString()} 개</span>
                </div>
            </div>
            
            <div style="margin-top: 16px; display: flex; gap: 10px;">
                <button class="btn-success" style="flex: 1.2; justify-content: center; font-size: 0.85rem; padding: 6px 4px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                    배합표 보기
                </button>
                <button class="btn-primary" style="flex: 1.2; justify-content: center; font-size: 0.85rem; padding: 6px 4px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                    수정하기
                </button>
                <button class="btn-secondary btn-delete-plan" style="border-color: rgba(248,113,113,0.3); color: var(--color-danger); padding: 0 10px;" title="계획 삭제">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;

        // Bind events programmatically
        const recipeBtn = container.querySelector('.btn-success');
        if (recipeBtn) {
            recipeBtn.onclick = () => this.openRecipeDrawer(plan.id);
        }

        const editBtn = container.querySelector('.btn-primary');
        if (editBtn) {
            editBtn.onclick = () => this.openEditPlanModal(plan.id);
        }

        const deleteBtn = container.querySelector('.btn-delete-plan');
        if (deleteBtn) {
            deleteBtn.onclick = () => this.deletePlan(plan.id);
        }
    }

    openEditPlanModal(planId) {
        const plan = window.wyshStore.getPlans().find(p => p.id === planId);
        if (!plan) return;

        // Set edit mode fields
        document.getElementById('plan-edit-id').value = plan.id;
        document.getElementById('plan-name').value = plan.name;
        document.getElementById('plan-product').value = plan.productId;
        document.getElementById('plan-start-date').value = plan.startDate;
        document.getElementById('plan-bottling-date').value = plan.bottlingDate;
        document.getElementById('plan-shipping-limit').value = plan.shippingLimit;
        document.getElementById('plan-expiry-date').value = plan.expiryDate;
        document.getElementById('plan-avg-order').value = plan.avgOrderQty;
        document.getElementById('plan-marketing').value = plan.marketingQty;
        document.getElementById('plan-buffer').value = plan.bufferQty;
        document.getElementById('plan-total-qty').value = plan.totalQty;
        document.getElementById('plan-fermenter').value = plan.fermenterType;

        // Calculate volume
        const product = window.wyshStore.getProductById(plan.productId);
        if (product) {
            const totalVolumeL = window.wyshService.calculateTotalVolumeL(plan.totalQty, product.weight, product.yield);
            document.getElementById('plan-total-volume').value = `${totalVolumeL.toFixed(2)} L`;
        }

        // Change modal title and button text
        document.getElementById('plan-modal-title').innerText = '생산 계획 수정';
        document.querySelector('#plan-registration-form button[type="submit"]').innerText = '수정 완료';

        // Clear warning and re-validate
        this.validateFermenterChoice();

        // Open modal
        const modal = document.getElementById('plan-registration-modal');
        if (modal) modal.classList.add('open');
    }

    deletePlan(planId) {
        window.showConfirmModal(
            '생산 계획 삭제',
            '정말로 이 생산 계획을 삭제하시겠습니까? 관련 재고 기록도 함께 삭제됩니다.',
            () => {
                window.wyshStore.deletePlan(planId);
                this.selectedPlan = null;
                
                // Reset detail panel
                document.getElementById('plan-detail-content').innerHTML = `
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>달력에서 일정을 선택하면 상세 정보 및 레시피가 활성화됩니다.</p>
                    </div>
                `;
                
                if (window.calendarInstance) {
                    window.calendarInstance.selectedPlanId = null;
                }
            }
        );
    }

    openRecipeDrawer(planId) {
        const store = window.wyshStore;
        const plan = store.getPlans().find(p => p.id === planId);
        if (!plan) return;

        const product = store.getProductById(plan.productId);
        if (!product) {
            alert('해당 제품의 레시피 정보를 찾을 수 없습니다.');
            return;
        }

        document.getElementById('drawer-plan-name').innerText = plan.name;
        document.getElementById('drawer-product-name').innerText = product.name;
        document.getElementById('drawer-product-weight').innerText = `${product.weight.toLocaleString()} g`;
        document.getElementById('drawer-product-yield').innerText = `${product.yield}%`;
        document.getElementById('drawer-plan-qty').innerText = `${plan.totalQty.toLocaleString()} 개`;
        
        // Total production weight in grams (Finished weight)
        const totalWeightG = plan.totalQty * product.weight;
        document.getElementById('drawer-total-weight').innerText = `${totalWeightG.toLocaleString()} g (${(totalWeightG/1000).toFixed(2)} kg)`;

        // Total raw material input weight in grams (considering yield rate)
        const totalInputWeightG = totalWeightG / (product.yield / 100);
        document.getElementById('drawer-total-input-weight').innerText = `${Math.round(totalInputWeightG).toLocaleString()} g (${(totalInputWeightG/1000).toFixed(2)} kg)`;

        // Render ingredients double units
        const tbody = document.getElementById('recipe-drawer-table-body');
        tbody.innerHTML = '';

        let totalRatioSum = 0;
        let totalWeightSum = 0;

        product.ingredients.forEach(ing => {
            const neededQtyG = totalInputWeightG * (ing.ratio / 100);
            const neededQtyKg = neededQtyG / 1000;

            totalRatioSum += ing.ratio;
            totalWeightSum += neededQtyG;

            const isLacticBacteria = ing.name.includes('유산균');
            const displayG = isLacticBacteria
                ? Number(neededQtyG.toFixed(1)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                : Math.round(neededQtyG).toLocaleString();

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 500;">${ing.name}</td>
                <td style="text-align: right; font-family: var(--font-outfit);">${ing.ratio}%</td>
                <td style="text-align: right; font-family: var(--font-outfit); font-weight: 600;">${displayG} g</td>
                <td style="text-align: right; font-family: var(--font-outfit); color: var(--text-secondary); font-style: italic;">(${neededQtyKg.toFixed(2)} kg)</td>
            `;
            tbody.appendChild(row);
        });

        // Total Row
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.innerHTML = `
            <td>합계</td>
            <td style="text-align: right; font-family: var(--font-outfit);">${totalRatioSum.toFixed(2)}%</td>
            <td style="text-align: right; font-family: var(--font-outfit);">${Math.round(totalWeightSum).toLocaleString()} g</td>
            <td style="text-align: right; font-family: var(--font-outfit); font-style: italic;">(${(totalWeightSum/1000).toFixed(2)} kg)</td>
        `;
        tbody.appendChild(totalRow);

        document.getElementById('recipe-drawer-overlay').classList.add('open');
    }
}

window.planController = new PlanController();
