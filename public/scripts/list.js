//const MDCList = mdc.list.MDCList;
//const MDCRipple = mdc.ripple.MDCRipple;

const selectedClass = 'mdc-list-item--selected';

class LocationListItem {
    constructor(loc, root, template, bus) {
        this.loc = loc;
        this.bus = bus;

        const item = template.content.cloneNode(true);
        this.template(item);
        item.children[0].addEventListener('click', this.click.bind(this));
        item.querySelector('.item-menu').addEventListener('click', this.menu.bind(this));
        new MDCRipple(item.children[0]);
        root.prepend(item);
        this.item = root.children[0];
    }

    click() {
        if (!this.selected()) {
            this.bus.dispatch('select', this.loc);
        } else {
            this.bus.dispatch('menu', this.loc);
        }
    }

    menu() {
        this.bus.dispatch('menu', this.loc);
    }

    template(elem) {
        const latlong =  `${this.loc.coords.latitude.toFixed(5)} | ${this.loc.coords.longitude.toFixed(5)}`;
        elem.querySelector('.latlong').textContent = latlong;

        const dateOpts = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' };
        const timestamp = new Date(this.loc.timestamp).toLocaleString([], dateOpts);
        elem.querySelector('.timestamp').textContent = timestamp;

        elem.querySelector('.material-icons').textContent = this.loc.type === 'save'? 'place' : 'gps_fixed';
    }

    update(loc) {
        this.loc = loc;
        this.template(this.item)
    }

    remove() {
        this.item.remove();
    }

    select() {
        this.item.classList.add(selectedClass);
    }

    unselect() {
        this.item.classList.remove(selectedClass);
    }

    selected() {
        return this.item.classList.contains(selectedClass);
    }
}

class LocationList {
    constructor(rootId, templateId, bus) {
        this.root = document.getElementById(rootId);
        this.template = document.getElementById(templateId);
        this.bus = bus;
        
        this.list = new MDCList(this.root);
        this.list.singleSelection = true;
    }

    getItem(loc) {
        return new LocationListItem(loc, this.root, this.template, this.bus)
    }

    resize(locations) {
        if (locations.length > 3) return;
        const parent = this.root.parentElement;
        parent.className = '';
        parent.classList.add(`length-${locations.length}`);
    }
}
