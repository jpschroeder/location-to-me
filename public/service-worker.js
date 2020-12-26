
class ServiceWorker {
    constructor() {
        self.addEventListener('install', this.install.bind(this));
        self.addEventListener('activate', this.activate.bind(this));
        self.addEventListener('push', this.push.bind(this));
        self.addEventListener('notificationclick', this.notificationClick.bind(this));
        
    }
    
    install(event) {
        self.skipWaiting();
    }
    
    activate(event) {
        self.clients.claim();
    }
    
    push(event) {
        const payload = event.data ? event.data.text() : 'no payload';
        
        const promiseChain = self.registration.showNotification('Location To Me', 
        {
            body: 'A new location was posted to ' + payload,
            data: { key: payload },
            tag: payload
        });
        event.waitUntil(promiseChain);
    }
    
    notificationClick(event) {
        event.notification.close();
        
        const urlToOpen = new URL('/' + event.notification.data.key, self.location.origin).href;
        
        const promiseChain = clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then((windowClients) => {
            let matchingClient = windowClients.find(wc => wc.url === urlToOpen)
            if (matchingClient) {
                return matchingClient.focus();
            } else {
                return clients.openWindow(urlToOpen);
            }
        });
        
        event.waitUntil(promiseChain);
    }
}

const sw = new ServiceWorker();