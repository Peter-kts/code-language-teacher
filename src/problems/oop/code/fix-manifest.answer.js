class Ship {
  constructor(name) {
    this.name = name
    this.manifest = [] // made here, so each ship gets a new array of its own
  }

  add(container) {
    this.manifest.push(container)
  }

  count() {
    return this.manifest.length
  }
}

const atlas = new Ship("Atlas")
const borealis = new Ship("Borealis")
atlas.add("C1")
atlas.add("C2")
console.log(atlas.count(), borealis.count())
