// One box: just data (a code and a weight), so a very small class.
class Container {
  constructor(code, weight) {}
}

// Where containers wait on land.
class Yard {
  add(container) {}
  take(code) {}
}

// Comes in either to unload or to load. Its manifest is an array of container codes.
class Ship {
  constructor(name, mode, manifest, cargo = []) {}
  takeOff(code) {}
  putOn(container) {}
  remaining() {}
}

// Moves one container at a time between a ship and the yard.
class Crane {
  unload(ship, yard, code) {}
  load(ship, yard, code) {}
}

// The boss: ships arrive, get worked by the crane, and depart.
class Port {
  arrive(ship) {}
  process(name) {}
  depart(name) {}
}
