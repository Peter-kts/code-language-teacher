class Warehouse {
  constructor() {
    this.stock = new Map() // item -> how many are in stock
  }

  add(item, count) {
    // count must be more than 0, or throw an Error.
  }

  remove(item, count) {
    // Throw an Error if there aren't that many (and change nothing).
    // An item that reaches 0 is no longer in stock at all.
  }

  count(item) {
    // How many of item are in stock (0 if none).
  }

  items() {
    // The items in stock, in A to Z order.
  }
}

const w = new Warehouse()
w.add("bolts", 10)
w.add("nuts", 4)
w.remove("nuts", 4)
console.log(w.items(), w.count("bolts"))
