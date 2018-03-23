const Scumm = require('./scumm');
const BufferStream = require('./buffer_stream');

class App {
  constructor() {
    console.log('App');
    this.files = [];
    this.roomNames = [];
    this.roomOffsets = [];
    this.rooms = [];
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

  parseRoom(num) {
    let filename = 'monkey2.001';

    if (!this.files[filename]) return;

    let stream = new BufferStream(this.files[filename]);
    let offset = this.roomOffsets[num];

    stream.seek(offset);

    let type = stream.getUint32LE();
    let size = stream.getUint32();
    let name = this.getBlockTypeName(type);

    // console.log(name);

    let end = offset + size;

    let blocks = {};

    while (stream.offset < end) {
      let type = stream.getUint32LE();
      let size = stream.getUint32();

      let name = this.getBlockTypeName(type);

      // console.log(name, size);

      let block = {
        name: name,
        size: size,
        offset: stream.offset - 8
      };

      if (blocks[name]) {
        if (blocks[name] instanceof Array) {
          blocks[name].push(block);
        } else {
          blocks[name] = [ blocks[name], block ];
        }
      } else {
        blocks[name] = block;
      }

      stream.getBytes(size - 8);
    }

    this.rooms[num] = {
      blocks: blocks
    };

  }

  parseBundle(filename) {
    if (!this.files[filename]) return;

    let stream = new BufferStream(this.files[filename]);

    let type = stream.getUint32LE();
    let size = stream.getUint32();
    let name = this.getBlockTypeName(type);

    console.log(name, size);

    let offset = 8;

    if (name == 'LECF') {
      type = stream.getUint32LE();
      size = stream.getUint32();
      name = this.getBlockTypeName(type);

      if (name == 'LOFF') {
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
    }
    else if (filename == 'monkey2.001') {
      this.files[filename] = this.decode(this.files[filename], 0x69);
      this.parseBundle(filename);
      this.parseRoom(2);
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
    }
    else if (event.type == 'dragover') {
      this.onDragOver(event);
    }
    else if (event.type == 'dragenter') {
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
