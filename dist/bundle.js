(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
(function (global){
const Container = require('./ui/container');
const Workspace = require('./ui/workspace');
const List = require('./ui/list');

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

    this.canvasImages = [];

    this.el = document.getElementById('workspace');

    window.addEventListener('DOMContentLoaded', () => {
      this.createElements();
      this.initEventListeners();
    });
  }

  decode(buffer, enc = 0) {
    let temp = new Uint8Array(buffer);
    for (var i = 0; i < temp.length; i++) {
      temp[i] = temp[i] ^ enc;
    }
    return temp.buffer;
  }

  updatePalette() {
    let palette = this.palette;

    let paletteEl = this.paletteEl;
    while (paletteEl.firstChild) paletteEl.removeChild(paletteEl.firstChild);

    if (palette) {
      for (var i = 0; i < 256; i++) {
        let r = palette[i * 3];
        let g = palette[i * 3 + 1];
        let b = palette[i * 3 + 2];
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

      this.imageContainer.setSize(width, height);
    }

    let canvas = this.canvas;
    canvas.title = room.name;
    canvas.width = width;
    canvas.height = height;

    ctx = canvas.getContext('2d');
    // ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.offscreen, 0, 0, this.offscreen.width, this.offscreen.height);

    for (var i = 0; i < this.canvasImages.length; i++) {
      let im = this.canvasImages[i];
      ctx.drawImage(im.image, im.x, im.y);
    }
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
        let y = i / width >> 0;
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
    this.objects = this.room.getObjects();
    let objectsEl = this.objectsEl;
    while (objectsEl.firstChild) objectsEl.removeChild(objectsEl.firstChild);

    let list = new List({ type: 'icon', multiple: true });

    for (var i = 0, index = 1; i < this.objects.length; i++) {
      let ob = this.objects[i];

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

    this.objectsList = list;

    this.objectsList.dom().addEventListener('change', e => {
      this.clearCanvasImages();
      let selection = e.detail.selection;
      for (var i = 0; i < selection.length; i++) {
        let item = selection[i];
        let ob = this.objects.find(element => element.id == item.data);
        if (ob) {
          this.addImageToCanvas(item.image, ob.x, ob.y);
        }
      }
      this.updateRoomImage();
    });

    this.objectsEl.appendChild(list.dom());
  }

  setRoom(num) {
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
      this.list.addItem({ id: room.id, title: room.id.toString().padStart(3, '0') + ' ' + room.name });
    }
  }

  parseFiles() {
    if (this.files[INDEX_FILE]) {
      this.resource.addIndex(this.files[INDEX_FILE]);
    }
    if (this.files[BUNDLE_FILE]) {
      this.resource.addBundle(this.files[BUNDLE_FILE]);
      this.updateRoomList();
      this.setRoom(6);
      this.list.select(6);
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
    reader.onload = event => {
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
    } else if (event.key == 'ArrowLeft' && !event.repeat) {
      // this.setRoom(this.roomno - 1);
    }
  }

  handleEvent(event) {
    if (event.type == 'drop') {
      this.onDrop(event);
    } else if (event.type == 'dragover') {
      this.onDragOver(event);
    } else if (event.type == 'dragenter') {
      this.onDragEnter(event);
    } else if (event.type == 'keydown') {
      this.onKeyDown(event);
    }
  }

  createElements() {
    this.app = document.getElementById('app');

    let sidebarEl = document.createElement('div');
    sidebarEl.classList.add('side-bar');

    this.list = new List();
    this.list.dom().addEventListener('change', e => {
      let selection = e.detail.selection;
      if (selection.length) {
        // let id = e.detail.id;
        this.setRoom(selection[0].id);
      }
    });

    this.roomListEl = document.createElement('div');
    this.roomListEl.classList.add('room-list');

    this.roomListEl.appendChild(this.list.dom());

    let el = document.createElement('div');
    el.classList.add('room-list-heading');
    el.innerHTML = 'Rooms';
    sidebarEl.appendChild(el);

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

    this.objectsEl = document.createElement('div');
    this.objectsEl.classList.add('objects');

    this.objectsContainer = new Container({ title: 'Objects', content: this.objectsEl, x: 512, y: 32, width: 344, height: 360 });
    this.workspace.add(this.objectsContainer);
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./bitmap":3,"./resource":5,"./scumm":6,"./ui/container":9,"./ui/list":10,"./ui/workspace":11}],2:[function(require,module,exports){

class BitStream {
  constructor(stream) {
    this.stream = stream;
    this.offset = 0;
    this.cl = 0;
  }

  next() {
    this.byte = this.stream.getUint8();
    this.bit = this.byte & 1;
    this.cl = 8;
  }

  shift() {
    if (this.cl > 1) {
      this.byte >>= 1;
      this.bit = this.byte & 1;
      this.cl--;
    } else {
      this.next();
    }
  }

  read(length) {
    if (this.cl == 0) {
      this.next();
    }

    if (length) {
      let value = 0;
      for (var i = 0; i < length; i++) {
        value |= this.bit << i;
        this.shift();
      }
      return value;
    } else {
      let value = this.bit ? 1 : 0;
      this.shift();
      return value;
    }
  }
}

module.exports = BitStream;

},{}],3:[function(require,module,exports){

class Bitmap {
  constructor(params) {
    this.width = params.width;
    this.height = params.height;
    this.pixels = params.pixels;
  }
}

module.exports = Bitmap;

},{}],4:[function(require,module,exports){

class BufferStream {
  constructor(buffer) {
    this.buffer = buffer;
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  get length() {
    return this.buffer.byteLength;
  }

  seek(offset = 0) {
    this.offset = offset;
  }

  advance(count = 1) {
    this.offset += count;
    if (this.offset > this.buffer.byteLength - 1) this.offset = this.buffer.byteLength - 1;
  }

  backup(count = 1) {
    this.offset -= count;
    if (this.offset < 0) this.offset = 0;
  }

  getUint8(offset) {
    if (offset == undefined) {
      offset = this.offset;
      this.offset++;
    }
    return this.view.getUint8(offset);
  }

  getUint16(offset, littleEndian = false) {
    if (offset == undefined) {
      offset = this.offset;
      this.offset += 2;
    }
    return this.view.getUint16(offset, littleEndian);
  }

  getUint32(offset, littleEndian = false) {
    if (offset == undefined) {
      offset = this.offset;
      this.offset += 4;
    }
    return this.view.getUint32(offset, littleEndian);
  }

  getUint16LE(offset) {
    return this.getUint16(offset, true);
  }

  getUint32LE(offset) {
    return this.getUint32(offset, true);
  }

  getBytes(length = 1, offset) {
    if (offset == undefined) {
      offset = this.offset;
      this.offset += length;
    }
    let bytes = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
      bytes[i] = this.view.getUint8(offset + i); //this.getUint8(offset + i);
    }
    return bytes;
  }
}

module.exports = BufferStream;

},{}],5:[function(require,module,exports){
const BufferStream = require('./buffer_stream');
const BitStream = require('./bit_stream');
const Scumm = require('./scumm');

class Resource {
  constructor() {
    this.rooms = [];
    this.roomNames = [];
  }

  addIndex(buffer) {
    this.parseIndex(buffer);
  }

  addBundle(buffer) {
    this.parseBundle(buffer);
  }

  getRoom(num) {
    return this.parseRoom(num);
  }

  getBlockTypeName(uint32) {
    return String.fromCharCode(uint32 & 0xff, uint32 >> 8 & 0xff, uint32 >> 16 & 0xff, uint32 >> 24 & 0xff);
  }

  parseBlockName(stream) {
    let type = stream.getUint32LE();
    return this.getBlockTypeName(type);
  }

  parseIndex(buffer) {
    console.log('parseIndex');
    let stream = new BufferStream(buffer);

    while (stream.offset < stream.length) {
      let name = this.parseBlockName(stream);
      let size = stream.getUint32();

      if (name == 'RNAM') {
        // Room names table
        while (1) {
          let roomno = stream.getUint8();
          if (roomno == 0) break;
          let bytes = stream.getBytes(9);
          this.roomNames[roomno] = bytes.reduce((accumulator, currentValue) => {
            return accumulator + (currentValue != 0xff ? String.fromCharCode(currentValue ^ 0xff) : '');
          }, '');
        }
        // else if (name == 'DROO') {
        //   let numitems = stream.getUint16LE();
        //   let roomNos = stream.getBytes(, numitems);
        //
        //   let roomOffsets = [];
        //   for (var i = 0; i < numitems; i++) {
        //     let offs = stream.getUint32LE();
        //     roomOffsets[i] = offs;
        //   }
      } else {
        stream.getBytes(size - 8);
      }
    }
  }

  decompress1(bits, shift, width, height) {
    let pixels = new Uint8Array(width * height);
    let offset = 0;

    let color = bits.read(8);

    let inc = -1;

    while (offset < width * height) {
      pixels[offset++] = color;
      if (bits.read()) {
        if (!bits.read()) {
          color = bits.read(shift);
          inc = -1;
        } else {
          if (!bits.read()) {
            color += inc;
          } else {
            inc = -inc;
            color += inc;
          }
        }
      }
    }

    return pixels;
  }

  decompress2(bits, shift, width, height) {
    let pixels = new Uint8Array(width * height);
    let offset = 0;

    let color = bits.read(8);
    let skip = false;

    while (offset < width * height) {
      if (!skip) {
        pixels[offset++] = color;
        skip = false;
      }

      if (bits.read()) {
        if (bits.read()) {
          // adjust current palette index
          let c = bits.read(3);
          let incm = c - 4;
          if (incm) {
            color += incm;
          } else {
            let run = bits.read(8);
            for (var i = 0; i < run; i++) {
              pixels[offset++] = color;
            }
            skip = true;
          }
        } else {
          // read a new palette index
          color = bits.read(shift);
        }
      }
    }
    return pixels;
  }

  decompressStrip(stream, width, height) {
    let code = stream.getUint8();
    let shift = code % 10;

    let bits = new BitStream(stream);
    let pixels;
    let orientation = 0;

    if (code == 0x01) {
      // raw horizontal
      pixels = new Uint8Array(width * height);
      for (var i = 0; i < pixels.length; i++) {
        pixels[i] = stream.getUint8();
      }
    } else if (code >= 0x0e && code <= 0x12) {
      // method 1 vertical
      orientation = 1;
      pixels = this.decompress1(bits, shift, width, height);
    } else if (code >= 0x18 && code <= 0x1c) {
      // method 1 horizontal
      pixels = this.decompress1(bits, shift, width, height);
    } else if (code >= 0x22 && code <= 0x26) {
      // method 1 vertical transp
      orientation = 1;
      pixels = this.decompress1(bits, shift, width, height);
    } else if (code >= 0x2c && code <= 0x30) {
      // method 1 horizontal transp
      pixels = this.decompress1(bits, shift, width, height);
    } else if (code >= 0x40 && code <= 0x44) {
      // method 2 horizontal
      pixels = this.decompress2(bits, shift, width, height);
    } else if (code >= 0x54 && code <= 0x58) {
      // method 2 horizontal transp
      pixels = this.decompress2(bits, shift, width, height);
    } else if (code >= 0x68 && code <= 0x6c) {
      // method 2 horizontal transp
      pixels = this.decompress2(bits, shift, width, height);
    } else if (code >= 0x7c && code <= 0x80) {
      // method 2 horizontal
      pixels = this.decompress2(bits, shift, width, height);
    } else {
      console.log('unknown', code);
    }

    if (orientation) {
      // vertical
      let temp = new Uint8Array(pixels.length);
      for (var i = 0, index = 0; i < pixels.length; i++) {
        temp[index] = pixels[i];
        index += 8;
        if (index >= height * 8) index = (i / height >> 0) + 1;
      }
      pixels = temp;
    }

    return pixels;
  }

  parseSmap(stream, width, height) {
    let base = stream.offset;

    let name = this.parseBlockName(stream);
    let size = stream.getUint32();

    if (name !== 'SMAP') return;

    let offsets = [];

    for (var i = 0; i < width / 8; i++) offsets.push(stream.getUint32LE());

    let bitmap = new Uint8Array(width * height);

    for (var i = 0; i < offsets.length; i++) {
      stream.seek(base + offsets[i]);
      let pixels = this.decompressStrip(stream, 8, height);
      if (pixels) {
        for (var j = 0, x = 0, y = 0; j < pixels.length; j++) {
          bitmap[x + i * 8 + y * width] = pixels[j];
          y = x == 7 ? y + 1 : y;
          x = x == 7 ? 0 : x + 1;
        }
      }
    }

    return bitmap;
  }

  parseOBIM(stream) {
    let name = this.parseBlockName(stream);
    if (name !== 'IMHD') return;
    let size = stream.getUint32();

    let ob = {};

    ob.id = stream.getUint16LE();
    ob.imnn = stream.getUint16LE();
    ob.zpnn = stream.getUint16LE();
    ob.flags = stream.getUint8();
    stream.advance();
    ob.x = stream.getUint16LE();
    ob.y = stream.getUint16LE();
    ob.width = stream.getUint16LE();
    ob.height = stream.getUint16LE();
    ob.bitmaps = [];

    if (ob.imnn) {
      for (var i = 0; i < ob.imnn; i++) {
        let name = this.parseBlockName(stream);
        let size = stream.getUint32();
        let jump = stream.offset + size - 8;

        let bitmap = this.parseSmap(stream, ob.width, ob.height);
        ob.bitmaps.push(bitmap);
        stream.seek(jump);
      }
    }

    return ob;
  }

  parseOBCD(stream) {
    let name = this.parseBlockName(stream);
    let size = stream.getUint32();

    let ob = {};

    ob.id = stream.getUint16LE();
    ob.x = stream.getUint8();
    ob.y = stream.getUint8();
    ob.width = stream.getUint8();
    ob.height = stream.getUint8();
    ob.flags = stream.getUint8();
    ob.parent = stream.getUint8();
    ob.walk_x = stream.getUint16LE();
    ob.walk_y = stream.getUint16LE();
    ob.actor_dir = stream.getUint8();
    ob.name = '';

    name = this.parseBlockName(stream);
    size = stream.getUint32();
    stream.advance(size - 8);

    stream.advance(8);

    for (let b = stream.getUint8(); b !== 0; b = stream.getUint8()) {
      ob.name += String.fromCharCode(b);
    }

    return ob;
  }

  parseRoom(num) {
    let block = this.rooms[num];
    if (!block) return;

    let stream = new BufferStream(block.buffer);

    let end = block.length;

    let width;
    let height;
    let numObjects;
    let palette;
    let bitmap;
    let transparent;
    let obIMs = [];
    let obCDs = [];

    while (stream.offset < end) {
      let name = this.parseBlockName(stream);
      let size = stream.getUint32();
      let jump = stream.offset + size - 8;

      if (name == 'RMHD') {
        width = stream.getUint16LE();
        height = stream.getUint16LE();
        numObjects = stream.getUint16LE();
      } else if (name == 'RMIM') {
        stream.advance(18);
        bitmap = this.parseSmap(stream, width, height);
      } else if (name == 'CLUT') {
        palette = [];
        for (var i = 0; i < 256; i++) {
          let r = stream.getUint8();
          let g = stream.getUint8();
          let b = stream.getUint8();
          palette.push(r, g, b);
        }
      } else if (name == 'OBIM') {
        let ob = this.parseOBIM(stream);
        obIMs[ob.id] = ob;
        // if (ob.imnn > 1) console.log(num, ob.id, ob.imnn);
      } else if (name == 'OBCD') {
        let ob = this.parseOBCD(stream);
        obCDs[ob.id] = ob;
      } else if (name == 'TRNS') {
        transparent = stream.getUint8();
        // console.log('TRNS', transparent);
      } else {
          // stream.getBytes(size - 8);
        }
      stream.seek(jump);
    }

    let room = new Scumm.Room({
      id: num,
      name: this.roomNames[num],
      width: width,
      height: height,
      numObjects: numObjects,
      obIMs: obIMs,
      obCDs: obCDs,
      bitmap: bitmap,
      palette: palette,
      transparent: transparent
    });

    return room;
  }

  getRoomList() {
    // console.log('getRoomList');
    let result = [];
    for (var i = 0; i < this.rooms.length; i++) {
      let room = this.rooms[i];
      if (room) {
        result.push({ id: i, name: this.roomNames[i] });
      }
    }
    return result;
  }

  parseBundle(buffer) {
    console.log('parseBundle');

    let stream = new BufferStream(buffer);

    let name = this.parseBlockName(stream);
    let size = stream.getUint32();

    if (name != 'LECF') return;

    name = this.parseBlockName(stream);
    size = stream.getUint32();

    if (name == 'LOFF') {
      this.numrooms = stream.getUint8();

      let offsets = [];

      for (var i = 0; i < this.numrooms; i++) {
        let id = stream.getUint8();
        let offs = stream.getUint32LE();
        offsets[id] = offs;
      }

      for (var i = 0; i < offsets.length; i++) {
        let offs = offsets[i];
        if (offs != undefined) {
          stream.seek(offs);
          let name = this.parseBlockName(stream);
          let size = stream.getUint32();
          this.rooms[i] = stream.getBytes(size - 8);
        }
      }
    }
  }

}

module.exports = Resource;

},{"./bit_stream":2,"./buffer_stream":4,"./scumm":6}],6:[function(require,module,exports){

var Scumm = {
  RoomObject: require('./room_object'),
  Room: require('./room')
};

module.exports = Scumm;

},{"./room":7,"./room_object":8}],7:[function(require,module,exports){
const RoomObject = require('./room_object');

class Room {
  constructor(params) {
    this.id = params.id;
    this.name = params.name;
    this.width = params.width;
    this.height = params.height;
    this.numObjects = params.numObjects;
    this.obIMs = params.obIMs;
    this.obCDs = params.obCDs;
    this.palette = params.palette;
    this.bitmap = params.bitmap;
    this.transparent = params.transparent;
  }

  getObjects() {
    let objects = [];
    for (var i = 0; i < this.obIMs.length; i++) {
      let obim = this.obIMs[i];
      if (obim) {
        let obcd = this.obCDs[obim.id];
        let ob = new RoomObject({
          id: obim.id,
          name: obcd.name,
          x: obim.x,
          y: obim.y,
          width: obim.width,
          height: obim.height,
          bitmaps: obim.bitmaps
        });
        objects.push(ob);
      }
    }
    return objects;
  }
}

module.exports = Room;

},{"./room_object":8}],8:[function(require,module,exports){

class RoomObject {
  constructor(params) {
    this.id = params.id;
    this.name = params.name;
    this.imnn = params.imnn;
    this.zpnn = params.zpnn;
    this.flags = params.flags;
    this.x = params.x;
    this.y = params.y;
    this.width = params.width;
    this.height = params.height;
    this.bitmaps = params.bitmaps;
  }
}

module.exports = RoomObject;

},{}],9:[function(require,module,exports){

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
    this.el.style.left = this.el.offsetLeft + x + 'px';
    this.el.style.top = this.el.offsetTop + y + 'px';
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

  handleEvent(event) {
    if (event.type == 'mousedown') {
      this.onMouseDown(event);
    } else if (event.type == 'mouseup') {
      this.onMouseUp(event);
    } else if (event.type == 'mousemove') {
      this.onMouseMove(event);
    } else if (event.type == 'blur') {
      this.onBlur(event);
    }
  }
}

module.exports = Container;

},{}],10:[function(require,module,exports){

class List {
  constructor(params = {}) {
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

  select(id, toggle = false) {
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
    } else {
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
    } else if (event.type == 'keydown') {
      this.onKeyDown(event);
    } else if (event.type == 'focus') {
      this.onFocus(event);
    }
  }

}

module.exports = List;

},{}],11:[function(require,module,exports){

class Workspace {
  constructor(params) {
    this.el = document.createElement('div');
    this.el.classList.add('workspace');
    this.parent = params.parent;
    this.children = [];
    this.parent.appendChild(this.el);
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
    this.children.sort((a, b) => {
      return a.z - b.z;
    });
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

},{}]},{},[1])

//# sourceMappingURL=bundle.js.map
