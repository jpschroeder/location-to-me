
class CombinedItem {
    constructor(loc, listItem, mapItem) {
        this.loc = loc;
        this.listItem = listItem;
        this.mapItem = mapItem;
    }

    get id() { return this.loc.id; }
    get userId() { return this.loc.userId; }
    get type() { return this.loc.type; }

    update(loc) {
        this.loc = loc;
        this.listItem.update(loc);
        this.mapItem.update(loc);
    }

    remove() {
        this.listItem.remove();
        this.mapItem.remove();
    }

    select() {
        this.listItem.select();
        this.mapItem.select();
    }

    unselect() {
        this.listItem.unselect();
        this.mapItem.unselect();
    }
}

class CombinedList {
    constructor(list, map, bus) {
        this.list = list;
        this.map = map;
        this.bus = bus;
        this.locations = [];
        
        bus.listen('share', this.share.bind(this));
        bus.listen('select', this.select.bind(this));
        bus.listen('remove', this.remove.bind(this));
        bus.listen('clear', this.clear.bind(this));
        new ResizeObserver(this.resize.bind(this)).observe(this.map.elem);
    }

    getItem(loc) {
        return new CombinedItem(loc, this.list.getItem(loc), this.map.getItem(loc));
    }

    resize() {
        this.list.resize(this.locations.map(l => l.listItem));
        this.map.resize(this.locations.map(l => l.mapItem));
    }

    share(loc) {
        const index = this.locations.findIndex(l => l.userId === loc.userId && l.type === 'share');
        if (index === 0) {
            this.locations[index].update(loc);
        }
        else {
            if (index > 0) {
                this.locations[index].remove();
                this.locations.splice(index, 1);
            }
            this.locations.unshift(this.getItem(loc));
            this.select(loc);
        }
        this.resize();
    }

    select(loc) {
        for(const l of this.locations) {
            if (l.id === loc.id) {
                l.select();
            } else {
                l.unselect();
            }
        }
    }

    remove(loc) {
        const index = this.locations.findIndex(l => l.id === loc.id);
        if (index < 0)
            return;
        this.locations[index].remove();
        this.locations.splice(index, 1);
        if (this.locations.length > 0) {
            this.locations[0].select();
        }
        this.resize();
    }

    clear() {
        this.locations.forEach(l => l.remove());
        this.locations = [];
        this.resize();
    }
}
