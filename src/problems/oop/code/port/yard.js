// Containers waiting on land, by code, so finding one is a quick Map lookup.
class Yard {
  constructor() {
    this.containers = new Map() // code -> Container
  }

  add(container) {
    if (this.containers.has(container.code)) throw new Error(`${container.code} is already in the yard`)
    this.containers.set(container.code, container)
  }

  take(code) {
    if (!this.containers.has(code)) throw new Error(`${code} is not in the yard`)
    const container = this.containers.get(code)
    this.containers.delete(code)
    return container
  }

  has(code) {
    return this.containers.has(code)
  }

  codes() {
    return [...this.containers.keys()].sort()
  }
}
