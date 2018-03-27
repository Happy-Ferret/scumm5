const Resource = require('./resource');

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

    let paletteEl = this.paletteEl; //document.body.querySelector('#palette');
    while(paletteEl.firstChild) paletteEl.removeChild(paletteEl.firstChild);
    // paletteEl.innerHTML = '';
    // if (paletteEl)
    //   document.body.removeChild(paletteEl);

    if (palette) {
      // paletteEl = document.createElement('div');
      // paletteEl.id = 'palette';
      // paletteEl.classList.add('palette');

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

      // document.body.appendChild(paletteEl);
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

  createRoomObjects() {

  }

  setRoom(num) {
    let room = this.resource.getRoom(num);
    if (room) {
      this.room = room;
      this.roomno = num;
      this.palette = room.palette;

      this.title.innerHTML = 'Room ' + room.id + ' ' + room.name + ' ' + room.width + 'x' + room.height;

      this.createPaletteElement();
      this.createRoomImageElement();
      this.createRoomObjects();
    }
  }

  parseFiles() {
    if (this.files[INDEX_FILE]) {
      // this.parseIndex();
      this.resource.addIndex(this.files[INDEX_FILE]);
    }
    if (this.files[BUNDLE_FILE]) {
      this.resource.addBundle(this.files[BUNDLE_FILE]);
      this.setRoom(19);
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

  createElements() {
    let el = document.createElement('div');
    el.classList.add('container');
    el.classList.add('room-container');

    this.title = document.createElement('div');
    this.title.classList.add('title');
    this.title.innerHTML = 'title';
    el.appendChild(this.title);

    this.canvasContainerEl = document.createElement('div');
    this.canvasContainerEl.classList.add('room-image');
    this.canvas = document.createElement('canvas');
    this.canvasContainerEl.appendChild(this.canvas);

    el.appendChild(this.canvasContainerEl);

    document.body.appendChild(el);

    let containerEl = document.createElement('div');
    containerEl.classList.add('container');
    containerEl.classList.add('palette-container');

    this.paletteEl = document.createElement('div');
    this.paletteEl.classList.add('palette-swatches');
    containerEl.appendChild(this.paletteEl);

    document.body.appendChild(containerEl);
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
