
class BitStream {
  constructor(stream) {
    this.stream = stream;
    this.offset = 0;
    this.bit = 1;
    this.byte = this.stream.getUint8();
    this.stream.backup();
  }

  next() {
    this.byte = this.stream.getUint8();
    this.offset++;
    this.bit = 1;
  }

  read(length=0) {
    // console.log(this.byte.toString(2));
    let value = 0;
    if (length) {
      let s = '';
      for (var i = 0; i < length; i++) {
        s += this.read();
        // value = value + (this.read() << (length-i));
      }
      // console.log(s);
      // value = value & (Math.pow(2, length) - 1);
    }
    else {
      value = (this.byte & this.bit ? 1 : 0);
      if (this.bit == 128) {
        this.next();
      } else {
        this.bit = this.bit * 2;
      }
    }
    return value;
  }
}

module.exports = BitStream;
