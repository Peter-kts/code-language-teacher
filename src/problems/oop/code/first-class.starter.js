class Dog {
  constructor(name) {
    // The constructor runs when you write new Dog("Rex"). this is the new dog.
    // Save the name on it: this.name = ...
  }

  speak() {
    // Return "<name> says woof", using the name saved on this.
  }
}

const rex = new Dog("Rex")
const fido = new Dog("Fido")
console.log(rex.speak())
console.log(fido.speak())
