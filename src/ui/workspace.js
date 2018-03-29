
class Workspace {
  constructor(params) {
    this.el = params.el;
    this.children = [];
  }

  add(child) {
    child.z = this.children.length ? this.children[this.children.length - 1].z + 1 : 1;
    let childEl = child.dom();
    childEl.addEventListener('mousedown', this);
    this.el.appendChild(childEl);
    childEl.style.zIndex = child.z;
    this.children.push(child);
  }

  remove(child) {
    let childEl = child.dom();
    childEl.removeEventListener('mousedown', this);
    this.el.removeChild(childEl);
    this.children = this.children.filter(element => element !== child);
  }

  bringToFront(child) {
    child.z = Number.POSITIVE_INFINITY;
    this.children.sort((a, b) => { return a.z - b.z } );
    for (var i = 0; i < this.children.length; i++) {
      let child = this.children[i];
      child.dom().style.zIndex = child.z = i;
    }
  }

  onMouseDown(event) {
    let temp = event.target;

    while (temp.parentNode && temp.parentNode !== document.body) {
      if (temp.parentNode === this.el) break;
      temp = temp.parentNode;
    }

    let child = this.children.find(element => element.dom() === temp);
    if (child) {
      this.bringToFront(child);
    }
  }

  handleEvent(event) {
    if (event.type == 'mousedown') {
      this.onMouseDown(event);
    }
  }
}

module.exports = Workspace;
