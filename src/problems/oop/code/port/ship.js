class Ship {
  constructor(name, mode, manifest, cargo = []) {
    if (mode !== "unload" && mode !== "load") throw new Error('mode must be "unload" or "load"')
    this.name = name
    this.mode = mode
    this.manifest = [...manifest] // its own copy: no array shared with anyone
    this.cargo = new Map() // code -> Container on board
    for (const container of cargo) this.cargo.set(container.code, container)
  }

  // Codes on the manifest still waiting to be moved, in manifest order.
  remaining() {
    if (this.mode === "unload") return this.manifest.filter((code) => this.cargo.has(code))
    return this.manifest.filter((code) => !this.cargo.has(code))
  }

  done() {
    return this.remaining().length === 0
  }

  takeOff(code) {
    if (this.mode !== "unload" || !this.remaining().includes(code)) throw new Error(`${code} is not waiting to come off ${this.name}`)
    const container = this.cargo.get(code)
    this.cargo.delete(code)
    return container
  }

  putOn(container) {
    if (this.mode !== "load" || !this.remaining().includes(container.code)) throw new Error(`${container.code} is not waiting to go onto ${this.name}`)
    this.cargo.set(container.code, container)
  }
}
