// WyshService: Pure Business Calculations & Form Validations
class WyshService {
    // Helper to format date as YYYY-MM-DD
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // Add days to date string
    dateAddDays(dateStr, days) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        d.setDate(d.getDate() + days);
        return this.formatDate(d);
    }

    // Auto-calculate dates based on startDate
    calculateDates(startDate) {
        if (!startDate) return { bottlingDate: '', shippingLimit: '', expiryDate: '' };
        
        const bottlingDate = this.dateAddDays(startDate, 2);
        const shippingLimit = this.dateAddDays(bottlingDate, 7);
        const expiryDate = this.dateAddDays(bottlingDate, 22);

        return { bottlingDate, shippingLimit, expiryDate };
    }

    // Sum Quantity calculation
    calculateTotalQty(avgOrder, marketing, buffer) {
        return (avgOrder * 7) + marketing + buffer;
    }

    // Volume in L calculation considering yield rate
    calculateTotalVolumeL(totalQty, weight, yieldRate) {
        if (!weight || !yieldRate) return 0;
        return (totalQty * weight) / (yieldRate * 10);
    }

    // Validate fermenter choice based on capacity limits
    validateFermenterCapacity(volume, chosenFermenter) {
        if (volume <= 0) return { valid: true, message: '' };

        if (volume >= 120 && volume <= 280) {
            if (chosenFermenter === 'large') {
                return {
                    valid: false,
                    message: `⚠️ 계산된 원재료 총량(${volume.toFixed(2)}L)은 소형 규격(120L~280L)에 해당합니다. 소형 발효기를 선택하세요.`
                };
            }
        } else if (volume >= 300 && volume <= 580) {
            if (chosenFermenter === 'small') {
                return {
                    valid: false,
                    message: `⚠️ 계산된 원재료 총량(${volume.toFixed(2)}L)은 대형 규격(300L~580L)에 해당합니다. 대형 발효기를 선택하세요.`
                };
            }
        } else {
            // Out of bounds
            return {
                valid: false,
                message: `❌ 원재료 총량이 소형(120L~280L) 또는 대형(300L~580L) 발효기 규격을 벗어났습니다. 수량을 조정하세요.`
            };
        }

        return { valid: true, message: '' };
    }

    // Validate fermenter choice based on schedule overlaps
    validateFermenterOverlap(chosenFermenter, startDate, currentPlanId, plans) {
        if (!chosenFermenter || !startDate) return { valid: true, message: '' };

        const hasOverlap = plans.some(plan => {
            // Exclude current plan if editing
            if (currentPlanId && plan.id === currentPlanId) return false;
            return plan.startDate === startDate && plan.fermenterType === chosenFermenter;
        });

        if (hasOverlap) {
            const typeStr = chosenFermenter === 'small' ? '소형' : '대형';
            return {
                valid: false,
                message: `❌ 일정 충돌: ${startDate} 일자에 이미 ${typeStr} 발효기가 배정되어 사용 중입니다. 날짜나 발효기를 변경하세요.`
            };
        }

        return { valid: true, message: '' };
    }
}

window.wyshService = new WyshService();
