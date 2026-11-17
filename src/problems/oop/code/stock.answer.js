class Warehouse {
  constructor() {
    this.stock = new Map()
  }

  add(item, count) {
    if (count <= 0) throw new Error("count must be more than 0")
    this.stock.set(item, this.count(item) + count)
  }

  remove(item, count) {
    if (count > this.count(item)) throw new Error(`only ${this.count(item)} ${item} in stock`)
    const left = this.count(item) - count
    if (left === 0) this.stock.delete(item)
    else this.stock.set(item, left)
  }

  count(item) {
    return this.stock.get(item) ?? 0
  }

  items() {
    return [...this.stock.keys()].sort()
  }
}

const w = new Warehouse()
w.add("bolts", 10)
w.add("nuts", 4)
w.remove("nuts", 4)
console.log(w.items(), w.count("bolts"))
