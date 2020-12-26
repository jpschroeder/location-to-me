
class SubscribeButton {
    constructor(id, bus) {
        this.elem = document.getElementById(id);
        this.bus = bus;
        this.ready = false;
        this.exists = false;
        this.bus.listen('notifications_ready', this.notificationsReady.bind(this));
        this.elem.addEventListener('click', this.click.bind(this));
    }
    
    click() {
        if (!this.ready) return;
        this.ready = false;
        this.bus.dispatch(this.exists? 'unsubscribe' : 'subscribe');
        this.exists = !this.exists;
        this.setIcon();
    }

    setIcon() {
        this.elem.innerText = this.exists? 'notifications_active' : 'notifications_off';
    }

    hide() {
        this.elem.style.display = 'none';
    }

    show() {
        this.elem.style.display = 'inline-block';
    }

    notificationsReady(exists) {
        this.ready = true;
        this.exists = exists;
        this.show();
        this.setIcon();
    }
}

class Notifications {
    constructor(bus) {
        if (!this.capable()) return;

        this.bus = bus;
        this.registration = undefined;
        this.subscription = undefined;
        this.exists = false;
        this.publicKey = undefined;

        this.bus.listen('subscribe', this.subscribe.bind(this));
        this.bus.listen('unsubscribe', this.unsubscribe.bind(this));

        navigator.serviceWorker.ready
        .then((reg) => {
            this.registration = reg;
            return reg.pushManager.getSubscription()
        })
        .then((sub) => {
            this.subscription = sub;
            //if (!sub) return false;
            return this.details();
        })
        .then((details) => {
            this.exists = details.exists;
            this.publicKey = details.publicKey;
            bus.dispatch('notifications_ready', this.exists);
        });
    }

    capable() {
        return ('serviceWorker' in navigator) && ('PushManager' in window);
    }

    subscribe() {
        if (!this.registration) return;

        if (this.subscription) {
            return this.post('subscribe');
        }

        return this.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(this.publicKey)
        })
        .then((sub) => {
            if (!sub) return;
            this.subscription = sub;
            this.exists = true;
            return this.post('subscribe');
        })
        .then(() => {
            this.bus.dispatch('notifications_ready', this.exists);
        });
    }
    
    unsubscribe() {
        if (!this.subscription) return;

        this.subscription.unsubscribe()
        .then((successful) => {
            if (!successful) return;
            this.subscription = undefined;
            this.exists = false;
            return this.post('unsubscribe');
        })
        .then(() => {
            this.bus.dispatch('notifications_ready', this.exists);
        });
    }

    details() {
        return fetch(`${window.location.href}/subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.subscription || {}),
        })
        .then((response) => response.json());
    }

    post(action) {
        return fetch(`${window.location.href}/${action}`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.subscription),
        });
    }
}
