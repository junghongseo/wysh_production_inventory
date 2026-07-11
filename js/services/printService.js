// PrintService: Print and PDF export handler for recipe drawers
class PrintService {
    printRecipe() {
        document.body.classList.add('printing-recipe');
        window.print();
        
        window.addEventListener('afterprint', () => {
            document.body.classList.remove('printing-recipe');
        }, { once: true });
        
        // Safety fallback if afterprint event is not triggered in some browsers
        setTimeout(() => {
            document.body.classList.remove('printing-recipe');
        }, 1500);
    }
}

window.printService = new PrintService();
