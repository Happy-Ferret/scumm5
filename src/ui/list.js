
class List {
  constructor(params) {
    this.el = document.createElement('div');
    this.el.classList.add('list');
    this.listEl = document.createElement('ul');
    this.el.appendChild(this.listEl);

    this.listEl.addEventListener('mousedown', this);
  }

  createItem(item) {
    let el = document.createElement('li');
    el.id = 'item-' + item.id;
    el.classList.add('list-item');
    el.dataset.id = item.id;
    el.appendChild(document.createTextNode(item.title));
    this.listEl.appendChild(el);
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

  dom() {
    return this.el;
  }

  select(id) {
    // console.log('select', id);
    if (id != undefined) {
      if (this.selected) {
        let el = this.listEl.querySelector('#item-' + this.selected);
        if (el) {
          el.classList.remove('selected');
        }
      }
      let el = this.listEl.querySelector('#item-' + id);
      if (el) {
        el.classList.add('selected');
      }
      this.selected = id;
    }
  }

  onMouseDown(event) {
    let id = event.target.dataset.id;
    if (id && this.selected !== id) {
      var myEvent = new CustomEvent('selected', {
      	detail: {
      		id: id
      	}
      	// bubbles: true,
      	// cancelable: false
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
