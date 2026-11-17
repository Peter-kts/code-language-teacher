class Port {
  constructor() {
    // A port has one yard, one crane, the ships docked now (by name) and a log.
    this.yard = new Yard()
    this.crane = new Crane()
    this.ships = new Map()
    this.log = []
  }

  arrive(ship) {
    // Dock the ship and log "<name> arrived to <mode>".
    // Throw an Error if a ship with that name is already docked.
  }

  process(name) {
    // Use the crane to move every container still waiting on that ship's manifest, logging
    // "unloaded C1 from Atlas" or "loaded C1 onto Atlas" for each. Return how many moved.
    // Check first, and throw without moving anything, if any of them can't be moved.
  }

  depart(name) {
    // Throw an Error if the ship still has work. Otherwise undock it and log "<name> departed".
  }

  docked() {
    // The names of the docked ships, in A to Z order.
  }
}
