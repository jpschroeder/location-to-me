
class MapButtons {
    constructor(findId, saveId, userId, bus) {
        this.findbutton = new FindButton(findId, this.findclick.bind(this));
        this.savebutton = new SaveButton(saveId, this.saveclick.bind(this));
        this.finder = new LocationFinder(userId, this.share.bind(this));
        this.bus = bus;
        this.finding = false;
        this.loc = undefined;
        bus.listen('clear', this.cancel.bind(this));
        bus.listen('remove', this.remove.bind(this));
    }
    
    cancel() { 
        this.finding = false;
        this.loc = undefined;
        this.finder.cancel();
        this.findbutton.cancel();
        this.savebutton.hide();
    }

    find() { 
        this.finding = true;
        this.finder.find();
        this.findbutton.find();
    }

    share(loc) {
        this.loc = loc;
        this.savebutton.show();
        this.bus.dispatch('share', loc);
    }

    remove(loc) {
        if (this.loc && this.loc.id === loc.id) {
            this.cancel();
        }
    }

    findclick() {
        if (!this.finding) {
            this.find();
        } else {
            this.cancel();
        }
    }

    saveclick() {
        if (this.loc) {
            this.bus.dispatch('share', { 
                ...this.loc,
                id: uuidv4(),
                type: 'save'
            });
            this.cancel();
        }
    }
}

class FindButton {
    constructor(id, click) {
        this.elem = document.getElementById(id);
        this.elem.addEventListener('click', click);
        new MDCRipple(this.elem);
    }
    setIcon(icon) {
        this.elem.querySelector('.material-icons').innerText = icon;
    }
    setText(text) {
        this.elem.querySelector('.mdc-fab__label').innerText = text;
    }
    cancel() { 
        this.setIcon('gps_not_fixed'); 
        this.setText('Share');
    }
    find() { 
        this.setIcon('gps_fixed'); 
        this.setText('Stop');
    }
}

class SaveButton {
    constructor(id, click) {
        this.elem = document.getElementById(id);
        this.elem.addEventListener('click', click);
        //new MDCRipple(this.elem);
    }
    show() {
        this.elem.style.display = 'inline-flex'; 
    }
    hide() {
        this.elem.style.display = 'none'; 
    }
}

class LocationFinder {
    constructor(userId, share) {
        this.userId = userId;
        this.watchId = undefined;
        this.shareId = undefined;
        this.share = share;
    }
    
    found(position) {
        this.share({
            id: uuidv4(),
            shareId: this.shareId,
            userId: this.userId,
            type: 'share',
            coords: {
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
            },
            timestamp: new Date(position.timestamp).toString().replace(/\s+\(.+\)/, '') // remove the long timezone
        });
    }
    
    cancel() {
        if (!this.watchId) return;
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = undefined;
        this.shareId = undefined;
    }
    
    find() {
        this.shareId = uuidv4();
        const options = {
            enableHighAccuracy: true,
            maximumAge: 0
        };
        const error = (err) => console.error(err);
        this.watchId = navigator.geolocation.watchPosition(this.found.bind(this), error, options);
    }
}
