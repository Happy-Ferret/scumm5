(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
const Scumm = require('./scumm');
const Bitmap = require('./bitmap');
const Room = require('./room');
const BufferStream = require('./buffer_stream');

class App {
  constructor() {
    console.log('App');
    this.files = [];
    this.roomNames = [];
    this.roomOffsets = [];
    this.roomBlockOffsets = [];
    this.rooms = [];
  }

  decode(buffer, enc = 0) {
    let temp = new Uint8Array(buffer);
    for (var i = 0; i < temp.length; i++) {
      temp[i] = temp[i] ^ enc;
    }
    return temp.buffer;
  }

  getBlockTypeName(uint32) {
    return String.fromCharCode(uint32 & 0xff, uint32 >> 8 & 0xff, uint32 >> 16 & 0xff, uint32 >> 24 & 0xff);
  }

  parseIndexBlock(stream, offset) {
    let type = stream.getUint32LE();
    let size = stream.getUint32();

    let name = this.getBlockTypeName(type);
    console.log(name, size);

    if (name == 'RNAM') {
      while (1) {
        let roomno = stream.getUint8();
        if (roomno == 0) break;

        let bytes = stream.getBytes(9);
        this.roomNames[roomno] = bytes.reduce((accumulator, currentValue) => {
          return accumulator + (currentValue != 0xff ? String.fromCharCode(currentValue ^ 0xff) : '');
        }, '');
        // offset += 10;
      }
      console.log(this.roomNames);
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
    // }
    else {
        stream.getBytes(size - 8);
      }
  }

  parseIndex() {
    if (!this.files['monkey2.000']) return;

    let stream = new BufferStream(this.files['monkey2.000']);

    let offset = 0;

    while (offset < stream.length) {
      let blocksize = stream.getUint32(offset + 4);
      this.parseIndexBlock(stream, offset);
      offset += blocksize;
    }
  }

  getBundleStream() {
    let filename = 'monkey2.001';
    if (!this.files[filename]) return;
    let stream = new BufferStream(this.files[filename]);
    return stream;
  }

  readBlockHead(stream) {
    let type = stream.getUint32LE();
    let size = stream.getUint32();
    let name = this.getBlockTypeName(type);
    return { name: name, type: type, size: size };
  }

  parseRoomImage(num) {
    let room = this.rooms[num];
    if (!room) return;

    let stream = this.getBundleStream();
    if (!stream) return;

    let blocks = this.roomBlockOffsets[num];
    if (!blocks) return;

    stream.seek(blocks['RMIM'].offset + 8);

    let block = this.readBlockHead(stream);
    let numzbuf = stream.getUint16LE();

    console.log(block.name, block.size, numzbuf);

    if (block.name == 'RMIH') {
      let block = this.readBlockHead(stream);

      if (block.name == 'IM00') {
        let block = this.readBlockHead(stream);

        if (block.name == 'SMAP') {
          for (var i = 0; i < room.width / 8; i++) {
            let offs = stream.getUint32LE();
            console.log(i, offs);
          }
        }
      }
    }
  }

  parseRoom(num) {
    let stream = this.getBundleStream();
    let offset = this.roomOffsets[num];

    stream.seek(offset);

    let block = this.readBlockHead(stream);

    let end = offset + block.size;

    let blocks = {};

    while (stream.offset < end) {
      let block = this.readBlockHead(stream);

      let info = {
        name: block.name,
        size: block.size,
        offset: stream.offset - 8
      };

      if (blocks[block.name]) {
        if (blocks[block.name] instanceof Array) {
          blocks[block.name].push(info);
        } else {
          blocks[block.name] = [blocks[block.name], info];
        }
      } else {
        blocks[block.name] = info;
      }

      stream.getBytes(block.size - 8);
    }

    this.roomBlockOffsets[num] = blocks;

    stream.seek(blocks['RMHD'].offset + 8);
    let width = stream.getUint16LE();
    let height = stream.getUint16LE();
    let numObjects = stream.getUint16LE();

    this.rooms[num] = new Room({ width: width, height: height, numObjects: numObjects });

    console.log(num, width, height, numObjects);

    this.parseRoomImage(num);
  }

  parseBundle(num) {
    let stream = this.getBundleStream();

    // let type = stream.getUint32LE();
    // let size = stream.getUint32();
    // let name = this.getBlockTypeName(type);
    let block = this.readBlockHead(stream);

    console.log(block);

    let offset = 8;

    if (block.name == 'LECF') {
      let block = this.readBlockHead(stream);

      if (block.name == 'LOFF') {
        let numrooms = stream.getUint8();
        for (var i = 0; i < numrooms; i++) {
          let room = stream.getUint8();
          let offs = stream.getUint32LE();
          this.roomOffsets[room] = offs;
        }
      }
    }
  }

  onFileLoaded(filename) {
    console.log('Loaded', filename, this.files[filename].byteLength);

    if (filename == 'monkey2.000') {
      this.files[filename] = this.decode(this.files[filename], 0x69);
      this.parseIndex();
    } else if (filename == 'monkey2.001') {
      this.files[filename] = this.decode(this.files[filename], 0x69);
      this.parseBundle(filename);
      this.parseRoom(2);
    }
  }

  loadFile(file) {
    var reader = new FileReader();
    var filename = file.name.toLowerCase();
    reader.onload = event => {
      // console.log(event.target);
      this.files[filename] = event.target.result;
      this.onFileLoaded(filename);
    };
    reader.readAsArrayBuffer(file);
  }

  onDrop(event) {
    event.stopPropagation();
    event.preventDefault();

    var files = event.dataTransfer.files;
    for (var i = 0; i < files.length; i++) {
      this.loadFile(files[i]);
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

  handleEvent(event) {
    if (event.type == 'drop') {
      this.onDrop(event);
    } else if (event.type == 'dragover') {
      this.onDragOver(event);
    } else if (event.type == 'dragenter') {
      this.onDragEnter(event);
    }
  }

}

window.addEventListener('DOMContentLoaded', () => {
  var app = new App();
  window.addEventListener('drop', app, false);
  window.addEventListener('dragenter', app, false);
  window.addEventListener('dragover', app, false);
});

},{"./bitmap":2,"./buffer_stream":3,"./room":4,"./scumm":5}],2:[function(require,module,exports){

class Bitmap {
  constructor(params) {
    this.width = params.width;
    this.height = params.height;
    this.pixels = params.pixels;
  }
}

module.exports = Bitmap;

},{}],3:[function(require,module,exports){

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

},{}],4:[function(require,module,exports){
const Bitmap = require('./bitmap');

class Room {
  constructor(params) {
    this.width = params.width;
    this.height = params.height;
    this.numObjects = params.numObjects;
  }
}

module.exports = Room;

},{"./bitmap":2}],5:[function(require,module,exports){

class Scumm {
  constructor() {}
}

module.exports = Scumm;

},{}]},{},[1])

//# sourceMappingURL=bundle.js.map
