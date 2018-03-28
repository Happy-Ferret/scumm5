const Resource = require('./resource');
const Container = require('./ui/container');

const Scumm = require('./scumm');
const Bitmap = require('./bitmap');

const INDEX_FILE = 'monkey2.000';
const BUNDLE_FILE = 'monkey2.001';

// const INDEX_FILE = 'mi2demo.000';
// const BUNDLE_FILE = 'mi2demo.001';

class App {
  constructor() {
    console.log('init');

    this.files = [];

    this.resource = new Resource();

    this.offscreen = document.createElement('canvas');
    this.offscreen.width = 320;
    this.offscreen.height = 200;

    window.addEventListener('DOMContentLoaded', () => {
      this.createElements();
      this.initEventListeners();
    });
  }

  decode(buffer, enc=0) {
    let temp = new Uint8Array(buffer);
    for (var i = 0; i < temp.length; i++) {
      temp[i] = temp[i] ^ enc;
    }
    return temp.buffer;
  }

  createPaletteElement() {
    let palette = this.palette;

    let paletteEl = this.paletteEl;
    while(paletteEl.firstChild) paletteEl.removeChild(paletteEl.firstChild);

    if (palette) {
      for (var i = 0; i < 256; i++) {
        let r = palette[i*3];
        let g = palette[i*3 + 1];
        let b = palette[i*3 + 2];
        let swatch = document.createElement('div');
        swatch.classList.add('palette-swatch');
        swatch.style.backgroundColor = 'rgb('+r+','+g+','+b+')';
        swatch.title = i + ':' + 'rgb('+r+','+g+','+b+')';
        paletteEl.appendChild(swatch);
      }
    }
  }

  resizeOffscreenCanvas(width, height) {
    this.offscreen.width = width;
    this.offscreen.height = height;
  }

  createRoomImageElement() {
    if (!this.room) return;
    let room = this.room;

    let width = room.width;
    let height = room.height;

    this.resizeOffscreenCanvas(width, height);

    let ctx = this.offscreen.getContext('2d');
    ctx.clearRect(0, 0, this.offscreen.width, this.offscreen.height);

    if (room.bitmap) {
      let imageData = ctx.getImageData(0, 0, width, height);

      for (var i = 0; i < room.bitmap.length; i++) {
        let index = room.bitmap[i];
        imageData.data[i * 4 + 0] = this.palette[index * 3 + 0];
        imageData.data[i * 4 + 1] = this.palette[index * 3 + 1];
        imageData.data[i * 4 + 2] = this.palette[index * 3 + 2];
        imageData.data[i * 4 + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
    }

    let canvas = this.canvas;
    canvas.width = width;
    canvas.height = height;

    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.offscreen, 0, 0, this.offscreen.width, this.offscreen.height);
    // this.canvasContainerEl.appendChild(canvas);
  }

  createCanvasFromBitmap(bitmap, width, height) {
    let canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    if (bitmap) {
      let ctx = canvas.getContext('2d');
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < bitmap.length; i++) {
        let x = i % width;
        let y = (i / width) >> 0;
        let index = (y * width + x) * 4;
        let color = bitmap[i];
        imageData.data[index + 0] = this.palette[color * 3 + 0];
        imageData.data[index + 1] = this.palette[color * 3 + 1];
        imageData.data[index + 2] = this.palette[color * 3 + 2];
        imageData.data[index + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return canvas;
  }

  createRoomObjects() {
    let objects = this.room.getObjects();
    let contentEl = this.objectsEl;
    while (contentEl.firstChild) contentEl.removeChild(contentEl.firstChild);

    for (var i = 0; i < objects.length; i++) {
      let ob = objects[i];

      if (ob.bitmap) {
        let el = document.createElement('div');
        el.classList.add('object');

        let imageEl = document.createElement('div');
        imageEl.classList.add('object-image');

        let canvas = this.createCanvasFromBitmap(ob.bitmap, ob.width, ob.height);
        imageEl.appendChild(canvas);

        let titleEl = document.createElement('div');
        titleEl.classList.add('object-title');
        // titleEl.appendChild(document.createTextNode(ob.name));
        titleEl.innerHTML = ob.id;

        el.title = ob.name;

        el.appendChild(imageEl);
        el.appendChild(titleEl);

        contentEl.appendChild(el);
      }
    }
  }

  setRoom(num) {
    let room = this.resource.getRoom(num);
    if (room) {
      this.room = room;
      this.roomno = num;
      this.palette = room.palette;

      this.createPaletteElement();
      this.createRoomImageElement();
      this.createRoomObjects();

      // console.log(num);
    }
  }

  parseFiles() {
    if (this.files[INDEX_FILE]) {
      // this.parseIndex();
      this.resource.addIndex(this.files[INDEX_FILE]);
    }
    if (this.files[BUNDLE_FILE]) {
      this.resource.addBundle(this.files[BUNDLE_FILE]);
      this.setRoom(29);
      // this.parseBundle();
      // this.setRoom(4);
    }
  }

  onFileLoaded(filename) {
    console.log('Loaded', filename, this.files[filename].byteLength);

    if (filename == INDEX_FILE || filename == BUNDLE_FILE) {
      this.files[filename] = this.decode(this.files[filename], 0x69);
    }

    this.filesToLoad--;

    if (this.filesToLoad == 0) {
      console.log('done');
      this.parseFiles();
    }
  }

  loadFile(file) {
    var reader = new FileReader();
    var filename = file.name.toLowerCase();
		reader.onload = (event) => {
      this.files[filename] = event.target.result;
      this.onFileLoaded(filename);
		};
	  reader.readAsArrayBuffer(file);
  }

  onDrop(event) {
    event.stopPropagation();
    event.preventDefault();

    var files = event.dataTransfer.files;
    if (files.length) {
      this.filesToLoad = files.length;
      for (var i = 0; i < files.length; i++) {
        this.loadFile(files[i]);
      }
    }
  }

  onDragEnter(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  onDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  onKeyDown(event) {
    if (event.key == 'ArrowRight' && !event.repeat) {
      this.setRoom(this.roomno + 1);
    }
    else if (event.key == 'ArrowLeft' && !event.repeat) {
      this.setRoom(this.roomno - 1);
    }
  }

  handleEvent(event) {
    if (event.type == 'drop') {
      this.onDrop(event);
    }
    else if (event.type == 'dragover') {
      this.onDragOver(event);
    }
    else if (event.type == 'dragenter') {
      this.onDragEnter(event);
    }
    else if (event.type == 'keydown') {
      this.onKeyDown(event);
    }
  }

  // createWindow(title, content, x, y) {
  //   let el = document.createElement('div');
  //   el.classList.add('container');
  //
  //   let titleEl = document.createElement('div');
  //   titleEl.id = 'title';
  //   titleEl.classList.add('title');
  //   titleEl.appendChild(document.createTextNode(title));
  //   el.appendChild(titleEl);
  //
  //   let contentEl = document.createElement('div');
  //   contentEl.id = 'content';
  //
  //   contentEl.appendChild(content);
  //
  //   el.appendChild(contentEl);
  //
  //   el.style.left = x + 'px';
  //   el.style.top = y + 'px';
  //
  //   return el;
  // }

  createElements() {
    this.canvasContainerEl = document.createElement('div');
    this.canvasContainerEl.classList.add('room-image');

    this.canvas = document.createElement('canvas');
    this.canvasContainerEl.appendChild(this.canvas);

    this.imageContainer = new Container({ title: 'Background', content: this.canvasContainerEl, x: 32, y: 32 });
    this.imageContainer.show();

    this.paletteEl = document.createElement('div');
    this.paletteEl.classList.add('palette-swatches');

    this.paletteContainer = new Container({ title: 'Palette', content: this.paletteEl, x: 32, y: 256 });
    this.paletteContainer.show();

    this.objectsEl = document.createElement('div');
    this.objectsEl.classList.add('objects');

    this.objectsContainer = new Container({ title: 'Objects', content: this.objectsEl, x: 512, y: 32 });
    this.objectsContainer.show();

  }

  initEventListeners() {
    window.addEventListener('drop', this, false);
    window.addEventListener('dragenter', this, false);
    window.addEventListener('dragover', this, false);

    window.addEventListener('keydown', this, false);
    window.addEventListener('keyup', this, false);
  }
}

module.exports = App;
global.App = App;
