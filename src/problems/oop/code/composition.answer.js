class Container {
  constructor(code, weight) {
    this.code = code
    this.weight = weight
  }
}

class Truck {
  constructor(capacity) {
    this.capacity = capacity
    this.containers = []
  }

  totalWeight() {
    return this.containers.reduce((sum, c) => sum + c.weight, 0)
  }

  load(container) {
    if (this.totalWeight() + container.weight > this.capacity) return false
    this.containers.push(container)
    return true
  }

  codes() {
    return this.containers.map((c) => c.code)
  }
}

const truck = new Truck(25)
truck.load(new Container("C1", 10))
truck.load(new Container("C2", 12))
truck.load(new Container("C3", 8))
console.log(truck.codes(), truck.totalWeight())
