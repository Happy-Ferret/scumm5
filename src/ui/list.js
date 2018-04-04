
class List {
  constructor(params={}) {
    // this.type = params.type == undefined ? 'list' : params.type;
    this.type = params.type || 'basic-list';
    this.multiple = params.multiple;
    this.items = [];
    this.selection = [];

    this.el = document.createElement('div');
    this.el.classList.add('list');
    this.listEl = document.createElement('div');
    this.listEl.classList.add(this.type);
    this.el.appendChild(this.listEl);

    this.el.addEventListener('mousedown', this);
    this.el.addEventListener('keydown', this);
    this.el.addEventListener('focus', this);

    this.el.tabIndex = -1;
  }

  createItem(item) {
    let el = document.createElement('div');
    el.id = 'item' + item.id;
    el.dataset.id = item.id;

    if (this.type == 'icon-list') {
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
      el.classList.add('basic-list-item');
      el.appendChild(document.createTextNode(item.title));
    }

    this.listEl.appendChild(el);

    this.items.push(item);
  }

  addItem(candidate) {
    if (candidate instanceof Array) {
      for (var i = 0; i < candidate.length; i++) {
        let item = candidate[i];
        this.createItem(item);
      }
    } else {
      this.createItem(candidate);
    }
  }

  getItemById(id) {
    return this.items.find(element => element.id == id);
  }

  dom() {
    return this.el;
  }

  select(index, toggle=false) {
    let item = this.items[index];

    if (!this.selection.includes(item)) {
      let el = this.listEl.querySelector('#item' + item.id);
      if (el) {
        el.classList.add('selected');
      }
      this.selection.push(item);
      // console.log(el.offsetLeft, el.offsetTop);
      let left = el.offsetLeft;
      let top = el.offsetTop;
      let width = el.offsetWidth;
      let height = el.offsetHeight;
      // console.log(this.el.offsetHeight);
      if (top + height > this.el.scrollTop + this.el.offsetHeight) {
        // console.log('outside', top+ height);
        this.el.scrollTop = el.offsetTop - this.el.offsetHeight + height;
      } else if (top < this.el.scrollTop) {
        this.el.scrollTop = top;
      }
    } else {
      if (toggle) {
        this.deselect(index);
      }
    }

    // let rect = this.el.getBoundingClientRect();
    // console.log(rect);

    this.announceChange();
  }

  deselect(index) {
    if (index !== undefined) {
      let item = this.items[index];
      if (item) {
        let el = this.listEl.querySelector('#item' + item.id);
        if (el) {
          el.classList.remove('selected');
        }
        this.selection = this.selection.filter(element => element !== item);
      }
    }
    else {
      for (var i = 0; i < this.selection.length; i++) {
        let item = this.selection[i];
        let el = this.listEl.querySelector('#item' + item.id);
        if (el) {
          el.classList.remove('selected');
        }
      }
      this.selection = [];
    }
    this.announceChange();
  }

  selectNext() {
    let index = 0;
    if (this.selection.length) {
      let item = this.selection[this.selection.length - 1];
      index = this.items.indexOf(item) + 1;
      if (index > this.items.length - 1) index = this.items.length - 1;
      this.deselect();
    }
    this.select(index);
    // this.announceChange();
  }

  selectPrevious() {
    let index = 0;
    if (this.selection.length) {
      let item = this.selection[0];
      index = this.items.indexOf(item) - 1;
      if (index < 0) index = 0;
      this.deselect();
    }
    this.select(index);
    // this.announceChange();
  }

  announceChange() {
    var myEvent = new CustomEvent('change', {
      detail: { selection: this.selection }
    });
    this.el.dispatchEvent(myEvent);
  }

  onMouseDown(event) {
    if (event.button == 0) {
      // console.log(event.target.parentNode);
      // console.log('event.button', event.button);
      let id = event.target.dataset.id;
      if (id) {
        let item = this.getItemById(id);
        let index = this.items.indexOf(item);

        if (this.multiple) {
          let toggle = event.metaKey || event.ctrlKey;
          if (!toggle) this.deselect();
          this.select(index, toggle);
        } else {
          this.deselect();
          this.select(index);
        }
      }
      else {
        this.deselect();
      }
    }
  }

  onKeyDown(event) {
    if (event.key == 'ArrowLeft') {
      if (this.type == 'icon-list') {
        this.selectPrevious();
      }
    }
    else if (event.key == 'ArrowRight') {
      if (this.type == 'icon-list') {
        this.selectNext();
      }
    }
    else if (event.key == 'ArrowDown') {
      event.preventDefault();
      if (this.type == 'basic-list') {
        this.selectNext();
      }
    }
    else if (event.key == 'ArrowUp') {
      event.preventDefault();
      if (this.type == 'basic-list') {
        this.selectPrevious();
      }
    }
  }

  onFocus(event) {
    // this.el.style.border = '2px solid red';
  }

  onBlur(event) {
    // this.el.style.border = 'initial';
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
    else if (event.type == 'blur') {
      this.onBlur(event);
    }
  }

}

module.exports = List;
