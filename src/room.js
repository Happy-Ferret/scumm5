const Bitmap = require('./bitmap');

class Room {
  constructor(params) {
    this.width = params.width;
    this.height = params.height;
    this.numObjects = params.numObjects;
  }
}

module.exports = Room;
