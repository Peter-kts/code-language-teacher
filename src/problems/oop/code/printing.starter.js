class Container {
  constructor(code, weight) {
    this.code = code
    this.weight = weight
  }

  toString() {
    // How the container turns into text: Container(C1, 10t)
  }

  equals(other) {
    // Two containers are equal when they have the same code.
  }
}

const a = new Container("C1", 10)
const b = new Container("C1", 10)
console.log(a.code, b.code)
console.log(a.equals(b), a === b)
// Once toString works, console.log(`${a}`) shows Container(C1, 10t)
