
const MDCList = mdc.list.MDCList;
const MDCDialog = mdc.dialog.MDCDialog;
const MDCRipple = mdc.ripple.MDCRipple;

class Bus extends EventTarget {
    listen(action, listener) {
        this.addEventListener(action, (evt) => { listener(evt.detail); });
    }
    
    dispatch(action, data) {
        console.log('dispatched: ' + action);
        this.dispatchEvent(new CustomEvent(action, { detail: data }));
    }
}

class ClearButton {
    constructor(id, bus) {
        this.elem = document.getElementById(id);
        this.bus = bus;
        this.shareIds = new Map();
        this.bus.listen('share', this.share.bind(this));
        this.bus.listen('remove', this.remove.bind(this));
        this.bus.listen('clear', this.clear.bind(this));
        this.elem.addEventListener('click', this.click.bind(this));
    }
    
    click() {
        this.bus.dispatch('clear');
    }
    hide() {
        this.elem.style.display = 'none';
    }
    show() {
        this.elem.style.display = 'inline-block';
    }

    key(loc) { return `${loc.userId}_${loc.type}`; }

    share(loc) {
        this.shareIds.set(this.key(loc), true);
        this.show();
    }
    remove(loc) {
        this.shareIds.delete(this.key(loc));
        if (this.shareIds.size == 0) {
            this.hide();
        }
    }
    clear() {
        this.shareIds.clear();
        this.hide();
    }
}

class LocationMenu {
    constructor(rootId, itemsId, bus) {
        this.loc = undefined;
        this.bus = bus;
        this.dialog = new MDCDialog(document.getElementById(rootId));
        this.items = new MDCList(document.getElementById(itemsId));
        this.bus.listen('menu', this.menu.bind(this));
        this.dialog.listen('MDCDialog:opened', this.opened.bind(this));
        this.dialog.listen('MDCDialog:closed', this.closed.bind(this));
    }

    menu(loc) {
        this.loc = loc;
        this.dialog.open();
    }

    opened() {
        this.items.layout();
    }

    closed(evt) {
        if (!this.loc) return;

        if (evt.detail.action === 'maps') {
            const url = `http://www.google.com/maps/place/${this.loc.coords.latitude},${this.loc.coords.longitude}`
            window.open(url, '_blank');
        }
        if (evt.detail.action === 'remove') {
            this.bus.dispatch('remove', this.loc);
        }
    }
}

class Server {
    constructor(bus) {
        bus.listen('share', this.share.bind(this));
        bus.listen('remove', this.remove.bind(this));
        bus.listen('clear', this.clear.bind(this));

        fetch(`${window.location.href}/locations`)
        .then((response) => response.json())
        .then((locations) => {
            for(const location of locations) {
                location.fromServer = true;
                bus.dispatch('share', location);
            }
        });
    }

    share(loc) {
        if (loc.fromServer)
            return;

        fetch(`${window.location.href}/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loc),
        });
    }

    remove(loc) {
        fetch(`${window.location.href}/locations/${loc.id}`, {
            method: 'DELETE',
        });
    }

    clear() {
        fetch(`${window.location.href}`, {
            method: 'DELETE',
        });
    }
}
