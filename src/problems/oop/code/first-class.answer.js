class Dog {
  constructor(name) {
    this.name = name
  }

  speak() {
    return `${this.name} says woof`
  }
}

const rex = new Dog("Rex")
const fido = new Dog("Fido")
console.log(rex.speak())
console.log(fido.speak())
