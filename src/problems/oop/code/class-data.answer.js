class Ship {
  static built = 0 // how many ships have been made: one number for the whole class

  constructor(name) {
    this.name = name
    Ship.built += 1
    this.number = Ship.built
  }
}

const atlas = new Ship("Atlas")
const borealis = new Ship("Borealis")
console.log(Ship.built)
