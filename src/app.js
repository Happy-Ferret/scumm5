const Container = require('./ui/container');
const Workspace = require('./ui/workspace');
const List = require('./ui/list');

const Resource = require('./scumm/resource');
// const Scumm = require('./scumm');
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

    this.canvasImages = [];

    this.el = document.getElementById('workspace');

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

  updatePalette() {
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
        swatch.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
        // swatch.title = 'Index: ' + i + '\n' + 'RGB: ' + r + ', ' + g + ', ' + b;
        paletteEl.appendChild(swatch);
      }
    }
  }

  updateRoomImage() {
    if (!this.room) return;
    let room = this.room;

    let width = room.width;
    let height = room.height;

    this.offscreen.width = width;
    this.offscreen.height = height;

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

      for (var i = 0; i < this.canvasImages.length; i++) {
        let im = this.canvasImages[i];
        ctx.drawImage(im.image, im.x, im.y);
      }
    }

    let scale = 1;

    let canvas = this.canvas;
    canvas.title = room.name;
    canvas.width = width * scale;
    canvas.height = height * scale;

    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.offscreen, 0, 0, this.offscreen.width*scale, this.offscreen.height*scale);

    this.imageContainer.setSize(width * scale, height * scale);
  }

  createCanvasFromBitmap(bitmap, width, height, transparent) {
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
        if (color !== transparent) {
          imageData.data[index + 0] = this.palette[color * 3 + 0];
          imageData.data[index + 1] = this.palette[color * 3 + 1];
          imageData.data[index + 2] = this.palette[color * 3 + 2];
          imageData.data[index + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return canvas;
  }

  updateRoomObjects() {
    this.roomObjects = this.room.getObjects();
    let objectsEl = this.roomObjectsEl;
    while (objectsEl.firstChild) objectsEl.removeChild(objectsEl.firstChild);

    let list = new List({ type: 'icon-list', multiple: true });

    for (var i = 0, index = 1; i < this.roomObjects.length; i++) {
      let ob = this.roomObjects[i];

      if (ob.bitmaps) {
        for (var j = 0; j < ob.bitmaps.length; j++) {
          let bitmap = ob.bitmaps[j];
          let canvas = this.createCanvasFromBitmap(bitmap, ob.width, ob.height, this.room.transparent);
          list.addItem({
            id: index++,
            title: ob.id,
            image: canvas,
            data: ob.id
          });
        }
      }
    }

    this.roomObjectsList = list;

    this.roomObjectsList.dom().addEventListener('change', (e) => {
      this.clearCanvasImages();
      let selection = e.detail.selection;
      for (var i = 0; i < selection.length; i++) {
        let item = selection[i];
        let ob = this.roomObjects.find(element => element.id == item.data);
        if (ob) {
          this.addImageToCanvas(item.image, ob.x, ob.y);
        }
      }
      this.updateRoomImage();
    });

    this.roomObjectsEl.appendChild(list.dom());
  }

  setRoom(num) {
    if (this.roomno == num) return;
    let room = this.resource.getRoom(num);
    if (room) {
      this.room = room;
      this.roomno = num;
      this.palette = room.palette;
      this.canvasImages = [];

      this.updatePalette();
      this.updateRoomImage();
      this.updateRoomObjects();
    }
  }

  addImageToCanvas(image, x, y) {
    this.canvasImages.push({
      x: x,
      y: y,
      image: image
    });
    this.updateRoomImage();
  }

  clearCanvasImages() {
    this.canvasImages = [];
  }

  updateRoomList() {
    let roomList = this.resource.getRoomList();
    for (var i = 0; i < roomList.length; i++) {
      let room = roomList[i];
      this.roomList.addItem({ id: room.id, title: room.id.toString().padStart(3, '0') + ' ' + room.name });
    }
  }

  parseFiles() {
    if (this.files[INDEX_FILE]) {
      this.resource.addIndex(this.files[INDEX_FILE]);
    }
    if (this.files[BUNDLE_FILE]) {
      this.resource.addBundle(this.files[BUNDLE_FILE]);
      this.updateRoomList();
      this.setRoom(1);
      this.roomList.select(0);
    }
  }

  onFileLoaded(filename) {
    console.log('Loaded', filename, this.files[filename].byteLength);

    if (filename == INDEX_FILE || filename == BUNDLE_FILE) {
      this.files[filename] = this.decode(this.files[filename], 0x69);
    }

    this.filesToLoad--;

    if (this.filesToLoad == 0) {
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
    // console.log(event.target);
    if (event.key == 'ArrowRight' && !event.repeat) {
      // this.setRoom(this.roomno + 1);
    }
    else if (event.key == 'ArrowLeft' && !event.repeat) {
      // this.setRoom(this.roomno - 1);
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
    this.app = document.getElementById('app');

    let sidebarEl = document.createElement('div');
    sidebarEl.classList.add('side-bar');

    this.roomList = new List();
    this.roomList.dom().addEventListener('change', (e) => {
      // console.log('change');
      let selection = e.detail.selection;
      if (selection.length) {
        // let id = e.detail.id;
        this.setRoom(selection[0].id);
      }
    });

    this.roomListEl = document.createElement('div');
    this.roomListEl.classList.add('room-list');

    this.roomListEl.appendChild(this.roomList.dom());

    let el = document.createElement('div');
    // el.classList.add('room-list-heading');
    // el.innerHTML = 'Rooms';
    // sidebarEl.appendChild(el);

    sidebarEl.appendChild(this.roomListEl);

    this.app.appendChild(sidebarEl);

    this.workspace = new Workspace({ parent: this.app });

    this.canvasContainerEl = document.createElement('div');
    this.canvasContainerEl.classList.add('room-image');

    this.canvas = document.createElement('canvas');
    this.canvasContainerEl.appendChild(this.canvas);

    this.imageContainer = new Container({ title: 'Background', content: this.canvasContainerEl, x: 32, y: 32, width: 320, height: 200 });
    this.workspace.add(this.imageContainer);

    this.paletteEl = document.createElement('div');
    this.paletteEl.classList.add('palette-swatches');

    this.paletteContainer = new Container({ title: 'Palette', content: this.paletteEl, x: 32, y: 280, width: 192, height: 192, status: false });
    this.workspace.add(this.paletteContainer);

    this.roomObjectsEl = document.createElement('div');
    this.roomObjectsEl.classList.add('room-objects');
    this.roomObjectsContainer = new Container({ title: 'Object Images', content: this.roomObjectsEl, x: 256, y: 280, width: 336, height: 278 });
    this.workspace.add(this.roomObjectsContainer);


    this.costumesEl = document.createElement('div');
    this.costumesEl.classList.add('costumes');
    this.costumesContainer = new Container({ title: 'Costumes', content: this.costumesEl, x: 624, y: 280, width: 336, height: 278 });
    this.workspace.add(this.costumesContainer);

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
