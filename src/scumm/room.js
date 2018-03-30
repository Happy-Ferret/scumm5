const RoomObject = require('./room_object');

class Room {
  constructor(params) {
    this.id = params.id;
    this.name = params.name;
    this.width = params.width;
    this.height = params.height;
    this.numObjects = params.numObjects;
    this.obIMs = params.obIMs;
    this.obCDs = params.obCDs;
    this.palette = params.palette;
    this.bitmap = params.bitmap;
    this.transparent = params.transparent;
  }

  getObjects() {
    let objects = [];
    for (var i = 0; i < this.obIMs.length; i++) {
      let obim = this.obIMs[i];
      if (obim) {
        let obcd = this.obCDs[obim.id];
        let ob = new RoomObject({
          id: obim.id,
          name: obcd.name,
          x: obim.x,
          y: obim.y,
          width: obim.width,
          height: obim.height,
          bitmaps: obim.bitmaps
        });
        objects.push(ob);
      }
    }
    return objects;
  }
}

module.exports = Room;
