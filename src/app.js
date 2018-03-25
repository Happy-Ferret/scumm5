const Scumm = require('./scumm');
const Bitmap = require('./bitmap');
const Room = require('./room');
const BufferStream = require('./buffer_stream');
const BitStream = require('./bit_stream');

const INDEX_FILE = 'monkey2.000';
const BUNDLE_FILE = 'monkey2.001';
// const INDEX_FILE = 'mi2demo.000';
// const BUNDLE_FILE = 'mi2demo.001';

class App {
  constructor() {
    console.log('App');

    this.files = [];
    this.roomNames = [];
    this.roomOffsets = [];
    this.roomBlockOffsets = [];
    this.rooms = [];

    this.offscreen = document.createElement('canvas');
    this.offscreen.width = 320;
    this.offscreen.height = 200;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 400;
    document.body.appendChild(this.canvas);

    this.initEventListeners();
  }

  decode(buffer, enc=0) {
    let temp = new Uint8Array(buffer);
    for (var i = 0; i < temp.length; i++) {
      temp[i] = temp[i] ^ enc;
    }
    return temp.buffer;
  }

  getBlockTypeName(uint32) {
    return String.fromCharCode(
      (uint32 & 0xff),
      ((uint32 >> 8) & 0xff),
      ((uint32 >> 16) & 0xff),
      ((uint32 >> 24) & 0xff)
    );
  }

  parseIndex() {
    if (!this.files[INDEX_FILE]) return;
    let stream = new BufferStream(this.files[INDEX_FILE]);

    while (stream.offset < stream.length) {
      let type = stream.getUint32LE();
      let size = stream.getUint32();
      let name = this.getBlockTypeName(type);

      if (name == 'RNAM') { // Room names table
        while (1) {
          let roomno = stream.getUint8();
          if (roomno == 0) break;

          let bytes = stream.getBytes(9);
          this.roomNames[roomno] = bytes.reduce((accumulator, currentValue) => {
            return accumulator + (currentValue != 0xff ? String.fromCharCode(currentValue ^ 0xff) : '');
          }, '');
        }
        console.log(this.roomNames);
      // }
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

  getBundleStream() {
    let filename = BUNDLE_FILE;
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

  decompressStrip(stream, width, height) {
    let pixels = new Uint8Array(width * height);
    let offset = 0;

    let code = stream.getUint8();
    let shift = code % 10;
    // let mask = 0xff >> (8 - shift);

    let color = stream.getUint8();

    let bits = new BitStream(stream);

    console.log(code);

    if (code >= 0x40 && code <= 0x44) {
      // console.log('Method B Horizontal', code, shift);
      // console.log('Color', color, '[', this.palette[color*3], this.palette[color*3+1], this.palette[color*3+2], ']');

      //scab-isl
      //01010100[4]01101110[3]11011010[2]00110100[1]01001101[0]

      // for (var i = 0; i < 1; i++) {
      //   let b = bits.read(16);
      //   console.log(b.toString(2).padStart(16, '0'));
      // }

      while (offset < width * height) {
        pixels[offset++] = color;

        if (bits.read()) {
          if (bits.read()) {
            // command
            let c = bits.read(3);

            if (c >= 0 && c <= 3) {
              color += 4 - c;
            }
            else if (c == 4) {
              // run
              let run = bits.read(8);
              for (var i = 0; i < run; i++) {
                pixels[offset++] = color;
              }
            }
            else if (c >= 5 && c <= 7) {
              color -= c - 4;
            }
          } else {
            // read a palette index
            color = bits.read(shift);
            // console.log('new index', color);
          }
        }
      }
    }

    return pixels;
  }

  drawStrip(pixels, pos, width, height) {
    // console.log('drawStrip', pos, width, height);
    let ctx = this.offscreen.getContext('2d');
    let imageData = ctx.getImageData(pos, 0, width, height);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        let index = y * width + x;
        let color = pixels[index];
        if (color) {
          imageData.data[index * 4 + 0] = this.palette[color * 3 + 0];
          imageData.data[index * 4 + 1] = this.palette[color * 3 + 1];
          imageData.data[index * 4 + 2] = this.palette[color * 3 + 2];
          imageData.data[index * 4 + 3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, pos, 0);

    ctx = this.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.offscreen, 0, 0, 320*2, 200*2);
  }

  parseRoom(num) {
    console.log('Parsing room', num, '...');
    let stream = this.getBundleStream();
    let offset = this.roomOffsets[num];

    stream.seek(offset);

    // Read and store the block offsets RMHD, CLUT etc

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
          blocks[block.name] = [ blocks[block.name], info ];
        }
      } else {
        blocks[block.name] = info;
      }

      stream.getBytes(block.size - 8);
    }

    // console.log(blocks);

    this.roomBlockOffsets[num] = blocks;

    // Read header data - width, height etc

    stream.seek(blocks['RMHD'].offset + 8);
    let width = stream.getUint16LE();
    let height = stream.getUint16LE();
    let numObjects = stream.getUint16LE();

    // console.log(this.roomNames[num], width, height, numObjects);

    let room = new Room({ width: width, height: height, numObjects: numObjects });

    // Read palette entries

    if (blocks['CLUT']) {
      stream.seek(blocks['CLUT'].offset + 8);

      room.palette = [];
      for (var i = 0; i < 256; i++) {
        let r = stream.getUint8();
        let g = stream.getUint8();
        let b = stream.getUint8();
        room.palette.push(r, g, b);
      }

      this.palette = room.palette;
    }

    // Decode background image

    if (blocks['RMIM']) {
      stream.seek(blocks['RMIM'].offset + 8);

      let block = this.readBlockHead(stream);
      let numzbuf = stream.getUint16LE();

      if (block.name == 'RMIH') {
        let block = this.readBlockHead(stream);

        if (block.name == 'IM00') {
          let SMAPoffs = stream.offset;
          let block = this.readBlockHead(stream);

          if (block.name == 'SMAP') {
            let offsets = [];
            for (var i = 0; i < room.width / 8; i++) {
              let offs = stream.getUint32LE();
              offsets.push(offs);
            }
            // console.log('offsets', offsets[0], offsets[1]);
            for (var i = 0; i < room.width / 8; i++) {
              stream.seek(SMAPoffs + offsets[i]);
              let pixels = this.decompressStrip(stream, 8, room.height);
              this.drawStrip(pixels, i*8, 8, room.height);
            }
          }
        }
      }
    }

    this.rooms[num] = room;
  }

  parseBundle(num) {
    let stream = this.getBundleStream();
    let block = this.readBlockHead(stream);

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

  createPaletteElement(num) {
    let room = this.rooms[num];

    if (room && room.palette) {
      let paletteEl = document.createElement('div');
      paletteEl.classList.add('palette');

      for (var i = 0; i < 256; i++) {
        let r = room.palette[i*3];
        let g = room.palette[i*3 + 1];
        let b = room.palette[i*3 + 2];
        let swatch = document.createElement('div');
        swatch.classList.add('swatch');
        swatch.style.backgroundColor = 'rgb('+r+','+g+','+b+')';
        swatch.title = i + ':' + 'rgb('+r+','+g+','+b+')';
        paletteEl.appendChild(swatch);
      }

      document.body.appendChild(paletteEl);
    }
  }

  parseFiles() {
    if (this.files[INDEX_FILE]) {
      this.parseIndex();
    }
    if (this.files[BUNDLE_FILE]) {
      this.parseBundle();
      this.parseRoom(2);
      this.createPaletteElement(2);
    }
  }

  onFileLoaded(filename) {
    console.log('Loaded', filename, this.files[filename].byteLength);

    if (filename == INDEX_FILE || filename == BUNDLE_FILE) {
      this.files[filename] = this.decode(this.files[filename], 0x69);
    }

    this.filesToLoad--;

    if (this.filesToLoad == 0) {
      console.log('Load done.');
      this.parseFiles();
    }
  }

  loadFile(file) {
    var reader = new FileReader();
    var filename = file.name.toLowerCase();
		reader.onload = (event) => {
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
  }

  initEventListeners() {
    window.addEventListener('drop', this, false);
    window.addEventListener('dragenter', this, false);
    window.addEventListener('dragover', this, false);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  let app = new App();
});
