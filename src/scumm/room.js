
class Room {
  constructor(params) {
    this.id = params.id;
    this.name = params.name;
    this.width = params.width;
    this.height = params.height;
    this.numObjects = params.numObjects;
    this.objects = params.objects;
    this.palette = params.palette;
    this.bitmap = params.bitmap;
  }
}

module.exports = Room;
