
const unselectedSave = new L.divIcon({ 
    className: 'material-icons mapicon-unselected',
    html: 'place',
    iconSize: [36, 36], iconAnchor: [18, 32]
});

const selectedSave = new L.divIcon({ 
    className: 'material-icons mapicon-selected',
    html: 'place',
    iconSize: [36, 36], iconAnchor: [18, 32]
});

const unselectedShare = new L.divIcon({ 
    className: 'material-icons mapicon-unselected',
    html: 'gps_fixed',
    iconSize: [36, 36], iconAnchor: [18, 18]
});

const selectedShare = new L.divIcon({ 
    className: 'material-icons mapicon-selected',
    html: 'gps_fixed',
    iconSize: [36, 36], iconAnchor: [18, 18]
});

class LocationMapItem {
    constructor(loc, map, bus) {
        this.map = map;
        this.bus = bus;
        
        this.loc = loc;
        this.marker = L.marker(this.latlong, { icon: this.selectedIcon });
        this.marker.addTo(map);
        this.marker.on('click', this.click.bind(this));
        
        this.circle = L.circle(this.latlong, this.accuracy)
        this.circle.addTo(map);
    }

    get selectedIcon() { return this.loc.type === 'save'? selectedSave : selectedShare; }
    get unselectedIcon() { return this.loc.type === 'save'? unselectedSave : unselectedShare; }

    click() {
        if (!this.selected()) {
            this.bus.dispatch('select', this.loc);
        } else {
            this.bus.dispatch('menu', this.loc);
        }
    }

    get latlong() {
        return [this.loc.coords.latitude, this.loc.coords.longitude];
    }

    get accuracy() {
        return this.loc.coords.accuracy;
    }

    update(loc) {
        const selected = this.selected();
        this.loc = loc;
        this.marker.setLatLng(this.latlong);
        this.marker.setIcon(selected? this.selectedIcon : this.unselectedIcon);
        this.circle.setLatLng(this.latlong);
        this.circle.setRadius(this.accuracy);
    }
    
    remove() {
        this.marker.removeFrom(this.map);
        this.circle.removeFrom(this.map);
    }
    
    select() {
        this.marker.setIcon(this.selectedIcon);
        this.circle.addTo(this.map);
    }
    
    unselect() {
        this.marker.setIcon(this.unselectedIcon);
        this.circle.removeFrom(this.map);
    }

    selected() {
        return this.marker.getIcon() === this.selectedIcon;
    }
}

class LocationMap {
    constructor(id, bus) {
        this.bus = bus;
        this.elem = document.getElementById(id);
        this.map = L.map(this.elem);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    }

    getItem(loc) {
        return new LocationMapItem(loc, this.map, this.bus);
    }

    resize(locations) {
        this.map.invalidateSize(false);
        if (locations.length > 0) {
            const bounds = locations.map(l => l.latlong);
            this.map.fitBounds(bounds);
        } else {
            this.map.fitWorld().zoomIn(1, { animate: false });
        }
    }
}
