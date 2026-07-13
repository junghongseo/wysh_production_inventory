// RecipeController: UI Controller for Product Settings, Recipes, and Ingregients Editor
class RecipeController {
    constructor() {
        this.selectedProduct = null;
    }

    init() {
        this.initEventListeners();
    }

    initEventListeners() {
        // Modal 2: Product Registration Modal close triggers
        const productModal = document.getElementById('product-registration-modal');
        const openProductBtn = document.getElementById('open-product-modal-btn');
        const closeProductBtn = document.getElementById('close-product-modal-btn2');
        const cancelProductBtn = document.getElementById('cancel-product-modal-btn');
        const newColorPicker = document.getElementById('new-product-color-picker');

        if (openProductBtn) {
            openProductBtn.onclick = () => {
                document.getElementById('product-registration-form').reset();
                if (newColorPicker) {
                    newColorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                    const defaultSwatch = newColorPicker.querySelector('.color-swatch[data-color="blue"]');
                    if (defaultSwatch) defaultSwatch.classList.add('active');
                }
                document.getElementById('new-product-color').value = 'blue';
                if (productModal) productModal.classList.add('open');
            };
        }

        const closeProd = () => {
            if (productModal) productModal.classList.remove('open');
        };
        if (closeProductBtn) closeProductBtn.onclick = closeProd;
        if (cancelProductBtn) cancelProductBtn.onclick = closeProd;

        // Color swatch choice in modal
        if (newColorPicker) {
            newColorPicker.onclick = (e) => {
                const swatch = e.target.closest('.color-swatch');
                if (!swatch) return;
                newColorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                document.getElementById('new-product-color').value = swatch.dataset.color;
            };
        }

        const prodForm = document.getElementById('product-registration-form');
        if (prodForm) {
            prodForm.onsubmit = (e) => this.handleProductRegistrationSubmit(e);
        }
    }

    renderProductList() {
        const products = window.wyshStore.getProducts();
        const container = document.getElementById('product-list-container');
        if (!container) return;

        container.innerHTML = '';

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>등록된 제품이 없습니다.</p>
                </div>
            `;
            return;
        }

        products.forEach(p => {
            const item = document.createElement('div');
            item.className = `product-item ${this.selectedProduct && this.selectedProduct.id === p.id ? 'active' : ''}`;
            item.onclick = () => this.selectProductForRecipe(p.id);
            
            item.innerHTML = `
                <div>
                    <span class="name">${p.name}</span>
                    <div class="weight">${p.weight} g</div>
                </div>
                <button class="btn-delete-tiny" title="제품 삭제">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            `;

            const deleteBtn = item.querySelector('.btn-delete-tiny');
            if (deleteBtn) {
                deleteBtn.onclick = (event) => {
                    this.deleteProduct(event, p.id);
                };
            }

            container.appendChild(item);
        });
    }

    selectProductForRecipe(productId) {
        const prod = window.wyshStore.getProductById(productId);
        this.selectedProduct = prod;
        
        // Highlight active product item
        document.querySelectorAll('.product-item').forEach(item => {
            item.classList.remove('active');
        });
        
        this.renderProductList();
        this.renderRecipeEditor();
    }

    renderRecipeEditor() {
        const container = document.getElementById('recipe-editor-content');
        const badge = document.getElementById('recipe-product-badge');
        
        if (!container) return;

        if (!this.selectedProduct) {
            badge.innerText = '선택 대기';
            badge.style.background = 'var(--bg-tertiary)';
            badge.style.color = 'var(--text-secondary)';
            container.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>왼쪽 제품 목록에서 특정 요거트 제품을 클릭하면 해당 레시피를 편집할 수 있습니다.</p>
                </div>
            `;
            return;
        }

        badge.innerText = '편집 중';
        badge.style.background = 'rgba(56, 189, 248, 0.15)';
        badge.style.color = 'var(--color-primary)';

        container.innerHTML = `
            <form id="recipe-editor-form">
                <!-- Validation Ratio Banner -->
                <div class="validation-banner" id="recipe-validation-banner" style="margin-bottom: 20px;"></div>

                <div class="form-group-grid" style="grid-template-columns: 2fr 1fr 1fr;">
                    <div class="form-group">
                        <label for="edit-product-name">제품 이름</label>
                        <input type="text" class="form-control" id="edit-product-name" value="${this.selectedProduct.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-weight">단일 용량 중량 (g)</label>
                        <input type="number" class="form-control" id="edit-product-weight" value="${this.selectedProduct.weight}" min="1" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-yield">수율 (%)</label>
                        <input type="number" class="form-control" id="edit-product-yield" value="${this.selectedProduct.yield || 28}" min="1" max="100" step="0.1" required>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                    <label>생산 일정 표시 색상</label>
                    <div class="color-picker-grid" id="edit-product-color-picker">
                        <div class="color-swatch ${this.selectedProduct.color === 'blue' ? 'active' : ''}" data-color="blue" style="background-color: #0ea5e9;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'purple' ? 'active' : ''}" data-color="purple" style="background-color: #a855f7;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'green' ? 'active' : ''}" data-color="green" style="background-color: #10b981;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'orange' ? 'active' : ''}" data-color="orange" style="background-color: #f97316;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'pink' ? 'active' : ''}" data-color="pink" style="background-color: #ec4899;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'red' ? 'active' : ''}" data-color="red" style="background-color: #ef4444;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'brown' ? 'active' : ''}" data-color="brown" style="background-color: #78350f;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'black' ? 'active' : ''}" data-color="black" style="background-color: #0f172a;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'gray' ? 'active' : ''}" data-color="gray" style="background-color: #64748b;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'teal' ? 'active' : ''}" data-color="teal" style="background-color: #14b8a6;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'yellow' ? 'active' : ''}" data-color="yellow" style="background-color: #eab308;"></div>
                        <div class="color-swatch ${this.selectedProduct.color === 'indigo' ? 'active' : ''}" data-color="indigo" style="background-color: #6366f1;"></div>
                    </div>
                    <input type="hidden" id="edit-product-color" value="${this.selectedProduct.color || 'blue'}">
                </div>

                <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <span>원재료 배합 비율 (%)</span>
                    <button type="button" class="btn-secondary btn-add-ing-row" style="padding: 4px 10px; font-size: 0.8rem;">
                        + 원재료 추가
                    </button>
                </h4>

                <div id="recipe-ingredients-grid">
                    <!-- Rows loaded here -->
                </div>

                <div style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px; display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" class="btn-secondary btn-reset-recipe">원래대로</button>
                    <button type="submit" class="btn-success" id="save-recipe-btn">레시피 비율 저장</button>
                </div>
            </form>
        `;

        // Bind form submission programmatically
        const form = document.getElementById('recipe-editor-form');
        if (form) {
            form.onsubmit = (event) => this.handleRecipeSaveSubmit(event);
        }

        // Bind Add Ingredient Button programmatically
        const addIngBtn = container.querySelector('.btn-add-ing-row');
        if (addIngBtn) {
            addIngBtn.onclick = () => this.addRecipeIngredientRow();
        }

        // Bind Reset Button programmatically
        const resetBtn = container.querySelector('.btn-reset-recipe');
        if (resetBtn) {
            resetBtn.onclick = () => this.resetRecipeForm();
        }

        // Bind color swatch click event
        const editPicker = document.getElementById('edit-product-color-picker');
        if (editPicker) {
            editPicker.onclick = (e) => {
                const swatch = e.target.closest('.color-swatch');
                if (!swatch) return;
                editPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                document.getElementById('edit-product-color').value = swatch.dataset.color;
            };
        }

        // Render each ingredient row
        const grid = document.getElementById('recipe-ingredients-grid');
        this.selectedProduct.ingredients.forEach((ing, i) => {
            const uniqueId = 'init-' + i + '-' + Date.now();
            grid.appendChild(this.createIngredientRowElement(ing.name, ing.ratio, uniqueId));
        });

        this.validateRecipeRatios();
    }

    createIngredientRowElement(name, ratio, index) {
        const row = document.createElement('div');
        row.className = 'recipe-ingredient-row';
        row.id = `recipe-ing-row-${index}`;
        row.innerHTML = `
            <input type="text" class="form-control ing-name-input" value="${name}" placeholder="원재료명 (예: 원유, 과일 퓨레 등)" required>
            <div style="position: relative;">
                <input type="number" class="form-control ing-ratio-input" value="${ratio}" min="0.000001" max="100" step="any" placeholder="비율" required style="padding-right: 28px;">
                <span style="position: absolute; right: 10px; top: 10px; font-size: 0.85rem; color: var(--text-muted);">%</span>
            </div>
            <button type="button" class="btn-icon" style="border-color: rgba(248,113,113,0.2);">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;

        const ratioInput = row.querySelector('.ing-ratio-input');
        if (ratioInput) {
            ratioInput.oninput = () => this.validateRecipeRatios();
        }

        const deleteBtn = row.querySelector('.btn-icon');
        if (deleteBtn) {
            deleteBtn.onclick = () => this.removeRecipeIngredientRow(index);
        }

        return row;
    }

    addRecipeIngredientRow() {
        const grid = document.getElementById('recipe-ingredients-grid');
        const uniqueId = 'added-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        grid.appendChild(this.createIngredientRowElement('', 0, uniqueId));
        this.validateRecipeRatios();
    }

    removeRecipeIngredientRow(index) {
        window.showConfirmModal(
            '원재료 삭제',
            '정말로 이 원재료 항목을 레시피에서 삭제하시겠습니까?',
            () => {
                const row = document.getElementById(`recipe-ing-row-${index}`);
                if (row) {
                    row.remove();
                }
                this.validateRecipeRatios();
            }
        );
    }

    validateRecipeRatios() {
        const banner = document.getElementById('recipe-validation-banner');
        const saveBtn = document.getElementById('save-recipe-btn');
        
        if (!banner || !saveBtn) return;

        const ratioInputs = document.querySelectorAll('.ing-ratio-input');
        let sum = 0;
        
        ratioInputs.forEach(input => {
            sum += parseFloat(input.value) || 0;
        });

        const roundedSum = Math.round(sum * 100) / 100; // Round to 2 decimal places

        banner.className = 'validation-banner';
        if (roundedSum === 100) {
            banner.innerText = '✓ 배합 비율 합계가 100%입니다. 저장이 가능합니다.';
            banner.classList.add('show', 'success');
            saveBtn.disabled = false;
        } else {
            banner.innerText = `⚠️ 성분 함량의 합계는 반드시 정확히 100%여야 합니다. (현재 합계: ${roundedSum}%)`;
            banner.classList.add('show');
            saveBtn.disabled = true;
        }
    }

    resetRecipeForm() {
        this.renderRecipeEditor();
    }

    handleRecipeSaveSubmit(e) {
        e.preventDefault();
        
        const store = window.wyshStore;
        const prodName = document.getElementById('edit-product-name').value;
        const prodWeight = parseInt(document.getElementById('edit-product-weight').value) || 0;
        const prodYield = parseFloat(document.getElementById('edit-product-yield').value) || 28;
        const prodColor = document.getElementById('edit-product-color').value;

        const rowElems = document.querySelectorAll('.recipe-ingredient-row');
        const ingredients = [];

        rowElems.forEach(row => {
            const name = row.querySelector('.ing-name-input').value;
            const ratio = parseFloat(row.querySelector('.ing-ratio-input').value) || 0;
            ingredients.push({ name, ratio });
        });

        // Update in-memory product
        const products = store.getProducts();
        const index = products.findIndex(p => p.id === this.selectedProduct.id);
        
        if (index !== -1) {
            products[index].name = prodName;
            products[index].weight = prodWeight;
            products[index].yield = prodYield;
            products[index].color = prodColor;
            products[index].ingredients = ingredients;
            
            store.saveProducts(products);
            this.selectedProduct = products[index];

            alert('제품 레시피 정보가 안전하게 저장되었습니다.');
        }
    }

    handleProductRegistrationSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('new-product-name').value;
        const weight = parseInt(document.getElementById('new-product-weight').value) || 0;
        const yieldRate = parseFloat(document.getElementById('new-product-yield').value) || 28;
        const color = document.getElementById('new-product-color').value;

        const store = window.wyshStore;
        const newProd = {
            name,
            weight,
            yield: yieldRate,
            color,
            ingredients: [
                { name: '원유', ratio: 100 }
            ]
        };

        const added = store.addProduct(newProd);
        
        // Close modal & select that product
        const productModal = document.getElementById('product-registration-modal');
        if (productModal) productModal.classList.remove('open');
        
        this.selectProductForRecipe(added.id); // Auto-focus recipe editor on new product
    }

    deleteProduct(e, id) {
        e.stopPropagation(); // Stop click from selectProductForRecipe
        
        window.showConfirmModal(
            '제품 삭제',
            '정말로 이 요거트 제품을 삭제하시겠습니까? 관련된 생산 계획 및 재고 데이터가 함께 삭제됩니다.',
            () => {
                window.wyshStore.deleteProduct(id);
                if (this.selectedProduct && this.selectedProduct.id === id) {
                    this.selectedProduct = null;
                    this.renderRecipeEditor();
                }
            }
        );
    }
}

window.recipeController = new RecipeController();
