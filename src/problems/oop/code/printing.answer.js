class Container {
  constructor(code, weight) {
    this.code = code
    this.weight = weight
  }

  toString() {
    return `Container(${this.code}, ${this.weight}t)`
  }

  equals(other) {
    return other instanceof Container && this.code === other.code
  }
}

const a = new Container("C1", 10)
const b = new Container("C1", 10)
console.log(`${a}`)
console.log(a.equals(b), a === b)
