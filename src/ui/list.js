
class List {
  constructor(params={}) {
    this.type = params.type == undefined ? 'list' : params.type;
    this.multiple = params.multiple;

    this.el = document.createElement('div');

    this.items = [];
    this.selection = [];

    let cl;
    if (this.type == 'icon') {
      cl = 'icon-list';
    } else {
      cl = 'list';
    }
    this.el.classList.add(cl);

    this.el.addEventListener('mousedown', this);
  }

  createItem(item) {
    let el = document.createElement('div');
    el.id = 'item' + item.id;
    el.dataset.id = item.id;

    if (this.type == 'icon') {
      el.classList.add('icon-list-item');

      let imageEl = document.createElement('div');
      imageEl.classList.add('icon-list-image');
      imageEl.appendChild(item.image);
      el.appendChild(imageEl);

      let titleEl = document.createElement('div');
      titleEl.classList.add('icon-list-title');
      titleEl.appendChild(document.createTextNode(item.title));
      el.appendChild(titleEl);
    } else {
      el.classList.add('list-item');
      el.appendChild(document.createTextNode(item.title));
    }

    this.el.appendChild(el);

    this.items.push(item);
  }

  addItem(item) {
    this.createItem(item);
  }

  addItems(items) {
    for (var i = 0; i < items.length; i++) {
      let item = items[i];
      this.createItem(item);
    }
  }

  getItem(id) {
    return this.items.find(element => element.id == id);
  }

  dom() {
    return this.el;
  }

  select(id, toggle=false) {
    // if (clear) this.deselect();

    let item = this.getItem(id);
    // console.log(item);

    // if (this.selected) {
    //   let el = this.el.querySelector('#item' + this.selected);
    //   if (el) {
    //     el.classList.remove('selected');
    //   }
    // }

    if (!this.selection.includes(item)) {
      let el = this.el.querySelector('#item' + id);
      if (el) {
        el.classList.add('selected');
      }
      this.selection.push(item);
    }
  }

  deselect() {
    for (var i = 0; i < this.selection.length; i++) {
      let item = this.selection[i];
      let el = this.el.querySelector('#item' + item.id);
      if (el) {
        el.classList.remove('selected');
      }
    }
    this.selection = [];
  }

  onMouseDown(event) {
    let id = event.target.dataset.id;
    if (id) {
      // console.log(id);
      if (this.multiple) {
        if (!event.ctrlKey && !event.metaKey) this.deselect();
      } else {
        this.deselect();
      }
      this.select(id);

      // if (this.multiple) {
      //   this.select(id, event.ctrlKey || event.metaKey);
      // } else {
      //   this.select(id, true);
      // }
      var myEvent = new CustomEvent('change', {
      	detail: { selection: this.selection }
      });
      this.el.dispatchEvent(myEvent);
    } else {
      this.deselect();
      var myEvent = new CustomEvent('change', {
      	detail: { selection: this.selection }
      });
      this.el.dispatchEvent(myEvent);
    }
  }

  handleEvent(event) {
    if (event.type == 'mousedown') {
      this.onMouseDown(event);
    }
  }
}

module.exports = List;
