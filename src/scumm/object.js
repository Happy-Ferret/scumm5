
class Object {
  constructor(params) {
    this.id = params.id;
    this.imnn = params.imnn;
    this.zpnn = params.zpnn;
    this.flags = params.flags;
    this.x = params.x;
    this.y = params.y;
    this.width = params.width;
    this.height = params.height;
  }
}

module.exports = Object;
