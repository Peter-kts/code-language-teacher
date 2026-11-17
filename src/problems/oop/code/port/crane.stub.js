class Crane {
  constructor() {
    this.moves = 0 // how many containers it has moved
  }

  unload(ship, yard, code) {
    // Move one container off the ship into the yard, and count the move.
    // If the move can't happen, throw an Error and leave the ship and the yard as they were.
  }

  load(ship, yard, code) {
    // Move one container from the yard onto the ship, and count the move.
    // Same rule: a refused move changes nothing.
  }
}
