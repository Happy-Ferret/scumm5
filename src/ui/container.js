
class Container {
  constructor(params) {
    // title, content, x, y

    let el = document.createElement('div');
    el.classList.add('container');

    let titleEl = document.createElement('div');
    titleEl.id = 'title';
    titleEl.classList.add('title');
    titleEl.appendChild(document.createTextNode(params.title));
    el.appendChild(titleEl);

    let contentEl = document.createElement('div');
    contentEl.id = 'content';

    contentEl.appendChild(params.content);

    el.appendChild(contentEl);

    el.style.left = params.x + 'px';
    el.style.top = params.y + 'px';

    this.el = el;

    this.el.addEventListener('mousedown', this);
  }

  show() {
    document.body.appendChild(this.el);
  }

  hide() {
    document.body.removeChild(this.el);
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
    // console.log(x, y);
  }

  onMouseDown(event) {
    console.log('down');
    window.addEventListener('mousemove', this);
    window.addEventListener('mouseup', this);
    window.addEventListener('blur', this);
  }

  onMouseUp(event) {
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
    else if (event.type == 'blur') {
      this.onBlur(event);
    }
  }
}

module.exports = Container;
