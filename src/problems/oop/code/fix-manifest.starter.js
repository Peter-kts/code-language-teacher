// Every Ship shares one manifest, kept on the class. Fix it so each ship has its own,
// reached as ship.manifest.
class Ship {
  static manifest = []

  constructor(name) {
    this.name = name
  }

  add(container) {
    Ship.manifest.push(container)
  }

  count() {
    return Ship.manifest.length
  }
}

const atlas = new Ship("Atlas")
const borealis = new Ship("Borealis")
atlas.add("C1")
atlas.add("C2")
console.log(atlas.count(), borealis.count())
