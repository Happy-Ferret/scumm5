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
    return String.fromCharCode(
      (uint32 & 0xff),
      ((uint32 >> 8) & 0xff),
      ((uint32 >> 16) & 0xff),
      ((uint32 >> 24) & 0xff)
    );
  }

  parseBlockName(stream) {
    let type = stream.getUint32LE();
    return this.getBlockTypeName(type);
  }

  parseBlockHeader(stream) {
    let type = stream.getUint32LE();
    let size = stream.getUint32();
    let name = this.getBlockTypeName(type);
    return { type: type, size: size, name: name };
  }

  parseIndex(buffer) {
    // if (!this.index) return;
    console.log('parseIndex');
    let stream = new BufferStream(buffer);

    while (stream.offset < stream.length) {
      let name = this.parseBlockName(stream);
      let size = stream.getUint32();

      if (name == 'RNAM') { // Room names table
        while (1) {
          let roomno = stream.getUint8();
          if (roomno == 0) break;
          let bytes = stream.getBytes(9);
          // console.log(bytes);
          this.roomNames[roomno] = bytes.reduce((accumulator, currentValue) => {
            return accumulator + (currentValue != 0xff ? String.fromCharCode(currentValue ^ 0xff) : '');
          }, '');
          // console.log(this.roomNames[roomno]);
        }
        // console.log(this.roomNames);
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

  // getBundleStream() {
  //   let filename = BUNDLE_FILE;
  //   if (!this.files[filename]) return;
  //   let stream = new BufferStream(this.files[filename]);
  //   return stream;
  // }

  decompress1(bits, shift, width, height) {
    let pixels = new Uint8Array(width * height);
    let offset = 0;

    // let color = bits.read(shift);
    let color = bits.read(8);

    let inc = -1;

    while (offset < width * height) {
      pixels[offset++] = color;
      if (bits.read()) {
        if (!bits.read()) {
          color = bits.read(shift);
          inc = -1;
          // color = bits.read(shift);
          // inc = -1;
        } else {
          if (!bits.read()) {
            color += inc;
          } else {
            inc = -inc;
            color += inc;
          }
          // if (bits.read()) inc = -inc;
          // color += inc;
        }
      }
    }

    return pixels;
  }

  decompress2(bits, shift, width, height) {
    let pixels = new Uint8Array(width * height);
    let offset = 0;

    // let color = bits.read(shift);
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
            // console.log('run');
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

  //scab-isl 01010100.01101110.11011010.00110100.01001101

  decompressStrip(stream, width, height) {
    let code = stream.getUint8();
    let shift = code % 10;

    let bits = new BitStream(stream);
    let pixels;
    let orientation = 0;

    if (code == 0x01) { // raw horizontal
      pixels = new Uint8Array(width * height);
      for (var i = 0; i < pixels.length; i++) {
        pixels[i] = stream.getUint8();
      }
    }
    else if (code >= 0x0e && code <= 0x12) { // method 1 vertical
      orientation = 1;
      pixels = this.decompress1(bits, shift, width, height);
    }
    else if (code >= 0x18 && code <= 0x1c) { // method 1 horizontal
      pixels = this.decompress1(bits, shift, width, height);
    }
    else if (code >= 0x22 && code <= 0x26) { // method 1 vertical transp
      orientation = 1;
      pixels = this.decompress1(bits, shift, width, height);
    }
    else if (code >= 0x2c && code <= 0x30) { // method 1 horizontal transp
      pixels = this.decompress1(bits, shift, width, height);
    }
    else if (code >= 0x40 && code <= 0x44) { // method 2 horizontal
      pixels = this.decompress2(bits, shift, width, height);
    }
    else if (code >= 0x54 && code <= 0x58) { // method 2 horizontal transp
      pixels = this.decompress2(bits, shift, width, height);
    }
    else if (code >= 0x68 && code <= 0x6c) { // method 2 horizontal transp
      pixels = this.decompress2(bits, shift, width, height);
    }
    else if (code >= 0x7c && code <= 0x80) { // method 2 horizontal
      pixels = this.decompress2(bits, shift, width, height);
    }
    else {
      console.log('unknown', code);
    }

    if (orientation) { // vertical
      let temp = new Uint8Array(pixels.length);
      for (var i = 0, index = 0; i < pixels.length; i++) {
        temp[index] = pixels[i];
        index += 8;
        if (index >= height * 8) index = ((i / height) >> 0) + 1;
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

    // console.log('smap', width, height);

    let offsets = [];

    for (var i = 0; i < width / 8; i++)
      offsets.push(stream.getUint32LE());

    let bitmap = new Uint8Array(width * height);

    for (var i = 0; i < offsets.length; i++) {
      stream.seek(base + offsets[i]);
      let pixels = this.decompressStrip(stream, 8, height);
      if (pixels) {
        for (var j = 0, x = 0, y = 0; j < pixels.length; j++) {
          bitmap[x + i * 8 + y * width] = pixels[j];
          y = (x == 7 ? y + 1 : y);
          x = (x == 7 ? 0 : x + 1);
        }
      } else {
        console.log(i, offsets.length);
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

    if (ob.imnn) {
      let name = this.parseBlockName(stream);
      if (name.substring(0, 2) == 'IM') {
        stream.advance(4);
        ob.bitmap = this.parseSmap(stream, ob.width, ob.height);
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

    name = this.parseBlockName(stream);
    size = stream.getUint32();
    stream.advance(size - 8);

    stream.advance(8);

    // name = this.parseBlockName(stream);
    // size = stream.getUint32();

    ob.name = '';

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
      }
      else if (name == 'RMIM') {
        stream.advance(18);
        bitmap = this.parseSmap(stream, width, height);
      }
      else if (name == 'CLUT') {
        palette = [];
        for (var i = 0; i < 256; i++) {
          let r = stream.getUint8();
          let g = stream.getUint8();
          let b = stream.getUint8();
          palette.push(r, g, b);
        }
      }
      else if (name == 'OBIM') {
        let ob = this.parseOBIM(stream);
        obIMs[ob.id] = ob;
      }
      else if (name == 'OBCD') {
        let ob = this.parseOBCD(stream);
        obCDs[ob.id] = ob;
      }
      else {
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
      palette: palette
    });

    return room;
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
