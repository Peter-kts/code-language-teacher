class Container {
  constructor(code, weight) {
    // Keep the code (like "C1") and the weight on the container.
  }
}

class Yard {
  constructor() {
    this.containers = new Map() // code -> Container
  }

  add(container) {
    // Throw an Error if a container with that code is already here.
  }

  take(code) {
    // Remove the container with that code and return it. Throw an Error if it isn't here.
  }

  has(code) {
    // true if a container with that code is in the yard.
  }

  codes() {
    // The codes of every container in the yard, in A to Z order.
  }
}
