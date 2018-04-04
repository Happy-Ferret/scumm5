
class Container {
  constructor(params) {
    this.parent = params.parent;

    this.el = document.createElement('div');
    this.el.classList.add('container');

    this.titleEl = document.createElement('div');
    this.titleEl.id = 'title';
    this.titleEl.classList.add('container-title');
    this.titleEl.appendChild(document.createTextNode(params.title));
    this.el.appendChild(this.titleEl);

    this.contentEl = document.createElement('div');
    this.contentEl.id = 'content';
    this.contentEl.classList.add('container-content');

    this.contentEl.appendChild(params.content);

    this.el.appendChild(this.contentEl);

    this.el.style.left = params.x + 'px';
    this.el.style.top = params.y + 'px';

    // this.contentEl.style.width = params.width + 'px';
    // this.contentEl.style.height = params.height + 'px';
    this.setSize(params.width, params.height);

    if (params.status) {
      let statusEl = document.createElement('div');
      statusEl.classList.add('container-status');
      // statusEl.innerHTML = 'Status 1234567890';
      this.el.appendChild(statusEl);
    }

    this.el.addEventListener('mousedown', this);

    // this.el.tabIndex = -1;
  }

  dom() {
    return this.el;
  }

  setSize(width, height) {
    this.contentEl.style.maxWidth = this.contentEl.style.width = width + 'px';
    this.contentEl.style.maxHeight = this.contentEl.style.height = height + 'px';

  }

  cancelDrag() {
    window.removeEventListener('mousemove', this);
    window.removeEventListener('mouseup', this);
    window.removeEventListener('blur', this);
  }

  onMouseMove(event) {
    let x = event.movementX;
    let y = event.movementY;
    this.el.style.left = (this.el.offsetLeft + x) + 'px';
    this.el.style.top = (this.el.offsetTop + y) + 'px';
  }

  onMouseDown(event) {
    if (event.button == 0 && event.target === this.titleEl) {
      window.addEventListener('mousemove', this);
      window.addEventListener('mouseup', this);
      window.addEventListener('blur', this);
    }
  }

  onMouseUp(event) {
    this.cancelDrag();
  }

  onBlur(event) {
    this.cancelDrag();
  }

  onBlur(event) {
    this.cancelDrag();
  }

  handleEvent(event) {
    if (event.type == 'mousedown') {
      this.onMouseDown(event);
    }
    else if (event.type == 'mouseup') {
      this.onMouseUp(event);
    }
    else if (event.type == 'mousemove') {
      this.onMouseMove(event);
    }
    else if (event.type == 'focus') {
      this.onFocus(event);
    }
    else if (event.type == 'blur') {
      this.onBlur(event);
    }
  }
}

module.exports = Container;
