// WYSH Calendar Component

class WyshCalendar {
    constructor(containerId, onPlanSelect) {
        this.container = document.getElementById(containerId);
        this.onPlanSelect = onPlanSelect;
        this.currentDate = new Date(); // Represents currently viewed month
        this.selectedPlanId = null;
    }

    // Helper to format date as YYYY-MM-DD (local time safe)
    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Safe add days to a YYYY-MM-DD date string
    addDays(dateStr, days) {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return this.formatDate(d);
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    selectPlan(planId) {
        this.selectedPlanId = planId;
        this.render();
    }

    render() {
        if (!this.container) return;

        const store = window.wyshStore;
        const plans = store.getPlans();
        const products = store.getProducts();

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Find the active selected plan
        const selectedPlan = plans.find(p => p.id === this.selectedPlanId);

        // Get first day of month and total days in month
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        // Days of previous month to fill the first row
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        // Clear calendar and build structure
        this.container.innerHTML = '';

        // Add Year/Month Title and Navigation
        const header = document.createElement('div');
        header.className = 'calendar-header-wrapper';
        
        const title = document.createElement('div');
        title.className = 'calendar-title';
        title.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${year}년 ${month + 1}월 생산 일정
        `;
        
        const controls = document.createElement('div');
        controls.className = 'calendar-controls';
        controls.innerHTML = `
            <button class="btn-icon" id="cal-prev-btn" title="이전 달">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button class="btn-secondary" id="cal-today-btn" style="padding: 6px 12px; font-size: 0.8rem;">오늘</button>
            <button class="btn-icon" id="cal-next-btn" title="다음 달">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        `;
        
        header.appendChild(title);
        header.appendChild(controls);
        this.container.appendChild(header);

        // Bind Controls
        setTimeout(() => {
            document.getElementById('cal-prev-btn').onclick = () => this.prevMonth();
            document.getElementById('cal-next-btn').onclick = () => this.nextMonth();
            document.getElementById('cal-today-btn').onclick = () => {
                this.currentDate = new Date();
                this.render();
            };
        }, 0);

        // Calendar Grid
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Weekday headers
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        weekdays.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'calendar-weekday-cell';
            cell.innerText = day;
            grid.appendChild(cell);
        });

        // Add calendar day cells
        const todayStr = this.formatDate(new Date());
        
        // Compute total cells to display (multiples of 7 to fill complete rows)
        const totalCells = Math.ceil((firstDayOfMonth + totalDays) / 7) * 7;

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell';
            
            let cellDate;
            let isCurrentMonth = true;

            if (i < firstDayOfMonth) {
                // Days of previous month
                const dayNum = prevMonthTotalDays - firstDayOfMonth + i + 1;
                cellDate = new Date(year, month - 1, dayNum);
                cell.classList.add('other-month');
                isCurrentMonth = false;
            } else if (i >= firstDayOfMonth + totalDays) {
                // Days of next month
                const dayNum = i - (firstDayOfMonth + totalDays) + 1;
                cellDate = new Date(year, month + 1, dayNum);
                cell.classList.add('other-month');
                isCurrentMonth = false;
            } else {
                // Days of current month
                const dayNum = i - firstDayOfMonth + 1;
                cellDate = new Date(year, month, dayNum);
            }

            const cellDateStr = this.formatDate(cellDate);

            if (cellDateStr === todayStr) {
                cell.classList.add('today');
            }

            // Day number header
            const dayNumElem = document.createElement('div');
            dayNumElem.className = 'day-number';
            dayNumElem.innerText = cellDate.getDate();
            cell.appendChild(dayNumElem);

            // Container for event blocks
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'calendar-events-container';
            cell.appendChild(eventsContainer);

            // 1. Check for selected plan deadline highlights
            if (selectedPlan) {
                if (cellDateStr === selectedPlan.shippingLimit) {
                    cell.classList.add('highlight-shipping');
                    const badge = document.createElement('div');
                    badge.className = 'day-highlight-tag shipping';
                    badge.innerText = '🚚 최종출고';
                    eventsContainer.appendChild(badge);
                }
                if (cellDateStr === selectedPlan.expiryDate) {
                    cell.classList.add('highlight-expiry');
                    const badge = document.createElement('div');
                    badge.className = 'day-highlight-tag expiry';
                    badge.innerText = '⚠️ 소비기한';
                    eventsContainer.appendChild(badge);
                }
            }

            // 2. Add 3-day stage blocks for all active plans
            plans.forEach((plan, index) => {
                const prod = products.find(p => p.id === plan.productId);
                const prodName = prod ? prod.name : '알수없음';
                
                const d1 = plan.startDate;
                const d2 = this.addDays(d1, 1);
                const d3 = plan.bottlingDate; // startDate + 2

                let isPlanDay = false;
                let dayLabel = '';
                let dayClass = '';

                if (cellDateStr === d1) {
                    isPlanDay = true;
                    dayLabel = `🧪 발효 | ${prodName}`;
                    dayClass = 'event-day-1';
                } else if (cellDateStr === d2) {
                    isPlanDay = true;
                    dayLabel = `🌀 유청분리`;
                    dayClass = 'event-day-2';
                } else if (cellDateStr === d3) {
                    isPlanDay = true;
                    dayLabel = `🍼 병입 | 완료`;
                    dayClass = 'event-day-3';
                }

                if (isPlanDay) {
                    const eventElem = document.createElement('div');
                    const eventColor = prod && prod.color ? prod.color : ['blue', 'purple', 'green', 'orange', 'pink'][index % 5];
                    eventElem.className = `calendar-event ${dayClass} event-color-${eventColor}`;
                    if (this.selectedPlanId === plan.id) {
                        eventElem.classList.add('selected');
                    }
                    eventElem.innerText = dayLabel;
                    eventElem.title = `${plan.name} (${prodName} ${plan.totalQty}개)\n1일차: 발효 | 2일차: 유청분리 | 3일차: 병입`;
                    eventElem.onclick = (e) => {
                        e.stopPropagation();
                        this.selectPlan(plan.id);
                        if (this.onPlanSelect) {
                            this.onPlanSelect(plan);
                        }
                    };
                    eventsContainer.appendChild(eventElem);
                }
            });

            grid.appendChild(cell);
        }

        this.container.appendChild(grid);
    }
}

window.WyshCalendar = WyshCalendar;
