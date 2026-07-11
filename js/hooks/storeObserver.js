// StoreObserver: Simple Event Publisher/Subscriber for state changes reactivity
class StoreObserver {
    constructor() {
        this.subscribers = {};
    }

    subscribe(event, callback) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(callback);
    }

    notify(event, data) {
        if (this.subscribers[event]) {
            this.subscribers[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Observer error for event "${event}":`, e);
                }
            });
        }
    }
}

window.wyshObserver = new StoreObserver();
