
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
    this.el.addEventListener('keydown', this);
    this.el.addEventListener('focus', this);

    // this.el.tabIndex = params.tabIndex || 1;
    this.el.tabIndex = -1;
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
    // console.log('select', id, toggle);
    let item = this.getItem(id);

    if (!this.selection.includes(item)) {
      let el = this.el.querySelector('#item' + id);
      if (el) {
        el.classList.add('selected');
      }
      this.selection.push(item);
    } else {
      // console.log('already');
      if (toggle) {
        this.deselect(id);
      }
    }
  }

  deselect(id) {
    if (id) {
      let item = this.getItem(id);
      let el = this.el.querySelector('#item' + item.id);
      if (el) {
        el.classList.remove('selected');
      }
      this.selection = this.selection.filter(element => element !== item);
    }
    else {
      for (var i = 0; i < this.selection.length; i++) {
        let item = this.selection[i];
        let el = this.el.querySelector('#item' + item.id);
        if (el) {
          el.classList.remove('selected');
        }
      }
      this.selection = [];
    }
  }

  onMouseDown(event) {
    let id = event.target.dataset.id;
    if (id) {

      if (this.multiple) {
        let toggle = event.metaKey || event.ctrlKey;
        if (!toggle) this.deselect();
        this.select(id, toggle);
      } else {
        this.deselect();
        this.select(id);
      }
      // this.select(id);

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

  onKeyDown(event) {
    console.log(event);
  }

  onFocus(event) {
    console.log('focus');
  }

  handleEvent(event) {
    if (event.type == 'mousedown') {
      this.onMouseDown(event);
    }
    else if (event.type == 'keydown') {
      this.onKeyDown(event);
    }
    else if (event.type == 'focus') {
      this.onFocus(event);
    }
  }

}

module.exports = List;
