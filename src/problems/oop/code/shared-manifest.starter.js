class Ship {
  static manifest = []

  constructor(name) {
    this.name = name
  }

  add(container) {
    Ship.manifest.push(container)
  }

  list() {
    return Ship.manifest
  }
}

class Truck {
  load = []

  constructor(name) {
    this.name = name
  }
}

const atlas = new Ship("Atlas")
const borealis = new Ship("Borealis")
atlas.add("C1")
console.log(borealis.list())
console.log(atlas.list() === borealis.list())

const t1 = new Truck("T1")
const t2 = new Truck("T2")
t1.load.push("C2")
console.log(t2.load)
