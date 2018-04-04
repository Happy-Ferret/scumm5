const BufferStream = require('./../buffer_stream');
const BitStream = require('./../bit_stream');
const RoomObject = require('./room_object');
const Room = require('./room');

class Resource {
  constructor() {
    this.rooms = [];
    this.roomNames = [];
    this.diskBlocks = [];
    this.offsets = {
      costume: [],
      room: []
    };
  }

  addIndex(buffer) {
    this.parseIndex(buffer);
  }

  addBundle(buffer) {
    this.parseBundle(buffer);
  }

  getRoom(num) {
    // console.log('getRoom', num);
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

  parseIndex(buffer) {
    // console.log('parseIndex');
    let stream = new BufferStream(buffer);

    while (stream.offset < stream.length) {
      let name = this.parseBlockName(stream);
      let size = stream.getUint32();
      let jmp = stream.offset + size - 8;

      if (name == 'RNAM') { // Room names table
        while (1) {
          let roomno = stream.getUint8();
          if (roomno == 0) break;
          let bytes = stream.getBytes(9);
          this.roomNames[roomno] = bytes.reduce((accumulator, currentValue) => {
            return accumulator + (currentValue != 0xff ? String.fromCharCode(currentValue ^ 0xff) : '');
          }, '');
        }
      }
      else if (name == 'DCOS') {
        // console.log('DCOS', size);
        let num = stream.getUint16LE();
        // console.log('DCOS', num);

        for (var i = 0; i < num; i++) {
          let roomno = stream.getUint8();
          this.offsets.costume[i] = { roomno: roomno };
        }
        for (var i = 0; i < num; i++) {
          let offs = stream.getUint32LE();
          this.offsets.costume[i].offset = offs;
          // console.log(offs);
        }
        // console.log(this.offsets.costume);
      }
      else if (name == 'DROO') {
      //   let numitems = stream.getUint16LE();
      //   let roomNos = stream.getBytes(, numitems);
      //
      //   let roomOffsets = [];
      //   for (var i = 0; i < numitems; i++) {
      //     let offs = stream.getUint32LE();
      //     roomOffsets[i] = offs;
      //   }

      }
      stream.seek(jmp);
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

  parseSMAP(stream, width, height) {
    let base = stream.offset;
    let name = this.parseBlockName(stream);
    let size = stream.getUint32();

    if (name !== 'SMAP') return;

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
      }

    }

    return bitmap;
  }

  parseOBIM(stream) {
    let name = this.parseBlockName(stream);
    if (name !== 'OBIM') return;
    // console.log(name);
    let size = stream.getUint32();

    name = this.parseBlockName(stream);
    if (name !== 'IMHD') return;
    // console.log(name);
    size = stream.getUint32();

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

        let bitmap = this.parseSMAP(stream, ob.width, ob.height);
        ob.bitmaps.push(bitmap);
        stream.seek(jump);
      }
    }

    return ob;
  }

  parseOBCD(stream) {
    let name, size;

    name = this.parseBlockName(stream);
    if (name !== 'OBCD') return;
    // console.log(name);
    size = stream.getUint32();

    name = this.parseBlockName(stream);
    size = stream.getUint32();

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

    // VERB

    name = this.parseBlockName(stream);
    size = stream.getUint32();
    stream.advance(size - 8);

    // OBNA

    name = this.parseBlockName(stream);
    size = stream.getUint32();
    let end = stream.offset + size - 8;

    for (let b = stream.getUint8(); b !== 0 && stream.offset < end; b = stream.getUint8()) {
      ob.name += String.fromCharCode(b);
    }

    return ob;
  }

  parseCOST(stream) {
    let name = this.parseBlockName(stream);
    if (name !== 'COST') return;
    let size = stream.getUint32();
    console.log(name, stream.length);

    let base = stream.offset - 8 + 2;
    // let base = stream.offset;

    let numAnim = stream.getUint8();
    console.log('numAnim', numAnim);
    let format = stream.getUint8();
    let numColors = (format & 1 ? 32 : 16);

    // console.log('format', (format & 0x7e).toString(16), format.toString(16));

    let palette = stream.getBytes(numColors);

    stream.advance(2); // skip cmds offset 16bitLE

    let limbOffsets = [];
    for (var i = 0; i < 16; i++) {
      let value = stream.getUint16LE();
      limbOffsets.push(value);
    }
    console.log(limbOffsets);

    let animOffsets = []
    for (var i = 0; i < numAnim; i++) {
      animOffsets.push(stream.getUint16LE());
    }
    console.log(animOffsets);

    let stop;

    for (var i = 0; i < limbOffsets.length; i++) {
    // for (var i = 0; i < 1; i++) {
      let offs = limbOffsets[i];
      if (offs === stop) break;

      stream.seek(base + offs);

      let picOffset = stream.getUint16LE();

      if (base + picOffset < stream.length) {
        stream.seek(base + picOffset);
        let width = stream.getUint16LE();
        let height = stream.getUint16LE();
        console.log(base + picOffset, picOffset, 'w', width, 'h', height);
      }

      if (i == 0) stop = picOffset;

      // if (i < limbOffsets.length - 1 && picOffset == limbOffsets[i + 1]) {
      //   break;
      // }

    }

    for (var i = 0; i < animOffsets.length; i++) {
      let offs = animOffsets[i];
      stream.seek(base + offs);
      let mask = stream.getUint16LE();
      // console.log(mask.toString(2).padStart(16, '0'));
    }

  }

  parseRoom(num) {
    let block = this.diskBlocks[num - 1];
    if (!block) return;

    let stream = new BufferStream(block.buffer);

    let width;
    let height;
    let numObjects;
    let palette;
    let bitmap;
    let transparent;
    let obIMs = [];
    let obCDs = [];
    let costumes = [];

    let name = this.parseBlockName(stream);
    if (name !== 'ROOM') return;
    let size = stream.getUint32();

    // console.log('COSTUME OFFSETS');
    // let offsets = this.offsets.costume.filter(element => element.roomno == num);
    // console.log(offsets);

    while (stream.offset < block.length) {
      let name = this.parseBlockName(stream);
      let size = stream.getUint32();
      let jump = stream.offset + size - 8;
      // console.log(name);

      if (name == 'RMHD') {
        width = stream.getUint16LE();
        height = stream.getUint16LE();
        numObjects = stream.getUint16LE();
      }
      else if (name == 'RMIM') {
        stream.advance(18);
        bitmap = this.parseSMAP(stream, width, height);
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
        // console.log('OBIM');
        stream.backup(8);
        let ob = this.parseOBIM(stream);
        obIMs[ob.id] = ob;
      }
      else if (name == 'OBCD') {
        // console.log('OBCD');
        stream.backup(8);
        let ob = this.parseOBCD(stream);
        obCDs[ob.id] = ob;
      }
      else if (name == 'TRNS') {
        transparent = stream.getUint8();
      }
      else if (name == 'COST') {
        stream.backup(8);
        let costume = this.parseCOST(stream);
        costumes.push(costume);
      }
      else {
      }
      stream.seek(jump);
    }

    let room = new Room({
      id: num,
      name: this.roomNames[num],
      width: width,
      height: height,
      numObjects: numObjects,
      obIMs: obIMs,
      obCDs: obCDs,
      palette: palette,
      bitmap: bitmap,
      costumes: costumes,
      transparent: transparent
    });

    return room;
  }

  getRoomList() {
    // console.log('getRoomList');
    let result = [];
    for (var i = 0; i < this.numrooms; i++) {
      // let room = this.rooms[i];
      // if (room) {
        result.push({ id: i+1, name: this.roomNames[i+1] });
      // }
    }
    return result;
  }

  parseBundle(buffer) {
    // console.log('parseBundle');

    let stream = new BufferStream(buffer);

    let name = this.parseBlockName(stream);
    let size = stream.getUint32();

    if (name != 'LECF') return;
    // console.log(name);

    name = this.parseBlockName(stream); // LOFF
    size = stream.getUint32();

    this.numrooms = stream.getUint8();
    stream.advance(size - 8 - 1);

    // console.log(name);

    while (stream.offset < stream.length) {
      let name = this.parseBlockName(stream); // LFLF
      let size = stream.getUint32();

      // console.log(name);
      let block = stream.getBytes(size - 8);

      this.diskBlocks.push(block);
    }

    // if (name == 'LOFF') {
    //   this.numrooms = stream.getUint8();
    //
    //   let offsets = [];
    //
    //   for (var i = 0; i < this.numrooms; i++) {
    //     let roomid = stream.getUint8();
    //     let offs = stream.getUint32LE();
    //     offsets[roomid] = offs;
    //   }
    //
    //   // Save out ROOM blocks
    //
    //   for (var i = 0; i < offsets.length; i++) {
    //     let offs = offsets[i];
    //     if (offs != undefined) {
    //       stream.seek(offs);
    //       let name = this.parseBlockName(stream);
    //       let size = stream.getUint32();
    //       this.rooms[i] = stream.getBytes(size - 8);
    //     }
    //   }
    //
    //   // Save out COST blocks
    //
    //   // for (var i = 0; i < offsets.length; i++) {
    //   //   stream.seek(offs - 8);
    //   //   name = this.parseBlockName(stream);
    //   //   size = stream.getUint32();
    //   //
    //   //   let end = stream.offset + size - 8;
    //   //
    //   //   while (stream.offset <= end) {
    //   //     if (stream.offset + 8 > stream.length) break;
    //   //     let name = this.parseBlockName(stream);
    //   //     let size = stream.getUint32();
    //   //     if (name == 'COST') {
    //   //       console.log(i, name);
    //   //     }
    //   //     stream.advance(size - 8);
    //   //   }
    //   // }
    //
    // }
  }

}

module.exports = Resource;
