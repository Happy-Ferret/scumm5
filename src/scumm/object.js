
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
    this.bitmap = params.bitmap;
  }
}

module.exports = RoomObject;
