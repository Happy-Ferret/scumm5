
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

  read(length) {
    if (length) {
      let limit = Math.pow(2, length - 1);
      let value = 0;
      let bit = 1;
      while (bit <= limit) {
        value = (this.read() ? value | bit : value);
        bit = bit << 1;
      }
      return value;
    }
    else {
      let value = (this.byte & this.bit ? 1 : 0);
      if (this.bit == 128) {
        this.next();
      } else {
        this.bit = this.bit << 1;
      }
      return value;
    }
  }
}

module.exports = BitStream;
