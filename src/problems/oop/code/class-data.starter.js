class Ship {
  static built = 0 // how many ships have been made: one number for the whole class

  constructor(name) {
    this.name = name
    // Add 1 to the class's count (Ship.built, not this.built),
    // then give this ship its number: 1 for the first ship, 2 for the next...
  }
}

const atlas = new Ship("Atlas")
const borealis = new Ship("Borealis")
console.log(Ship.built)
