class Container {
  constructor(code, weight) {
    this.code = code
    this.weight = weight
  }
}

class Truck {
  constructor(capacity) {
    this.capacity = capacity
    this.containers = [] // the Container objects on this truck
  }

  totalWeight() {
    // Add up the weight of every container on the truck.
  }

  load(container) {
    // If it fits (total weight stays within capacity), add it and return true.
    // Otherwise leave the truck as it is and return false.
  }

  codes() {
    // The codes of the containers on board, in the order they were loaded.
  }
}

const truck = new Truck(25)
truck.load(new Container("C1", 10))
truck.load(new Container("C2", 12))
truck.load(new Container("C3", 8))
console.log(truck.codes(), truck.totalWeight())
