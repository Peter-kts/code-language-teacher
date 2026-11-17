class Port {
  constructor() {
    this.yard = new Yard()
    this.crane = new Crane()
    this.ships = new Map() // name -> Ship, the ships docked now
    this.log = []
  }

  arrive(ship) {
    if (this.ships.has(ship.name)) throw new Error(`${ship.name} is already docked`)
    this.ships.set(ship.name, ship)
    this.log.push(`${ship.name} arrived to ${ship.mode}`)
  }

  // Move every container on the ship's manifest. Returns how many moved.
  process(name) {
    const ship = this.#ship(name)
    const codes = ship.remaining()
    // Check all of them first, so the port never stops halfway through a ship.
    const loading = ship.mode === "load"
    const problem = codes.filter((c) => (loading ? !this.yard.has(c) : this.yard.has(c)))
    if (problem.length) throw new Error(`the yard ${loading ? "doesn't have" : "already has"} ${problem.join(", ")}`)
    for (const code of codes) {
      if (loading) {
        this.crane.load(ship, this.yard, code)
        this.log.push(`loaded ${code} onto ${name}`)
      } else {
        this.crane.unload(ship, this.yard, code)
        this.log.push(`unloaded ${code} from ${name}`)
      }
    }
    return codes.length
  }

  depart(name) {
    const ship = this.#ship(name)
    if (!ship.done()) throw new Error(`${name} still has work: ${ship.remaining().join(", ")}`)
    this.ships.delete(name)
    this.log.push(`${name} departed`)
  }

  docked() {
    return [...this.ships.keys()].sort()
  }

  // The # makes it private: only this class's own methods can call it.
  #ship(name) {
    if (!this.ships.has(name)) throw new Error(`${name} is not docked`)
    return this.ships.get(name)
  }
}
