class Crane {
  constructor() {
    this.moves = 0
  }

  unload(ship, yard, code) {
    // Check before changing anything, so a refused move can't drop a container in the sea.
    if (yard.has(code)) throw new Error(`the yard already has ${code}`)
    const container = ship.takeOff(code) // throws if it isn't waiting to come off
    yard.add(container)
    this.moves += 1
  }

  load(ship, yard, code) {
    if (ship.mode !== "load" || !ship.remaining().includes(code)) throw new Error(`${ship.name} isn't waiting for ${code}`)
    const container = yard.take(code) // throws if the yard doesn't have it: nothing changed yet
    ship.putOn(container)
    this.moves += 1
  }
}
