
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
        value |= (this.bit << i);
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
