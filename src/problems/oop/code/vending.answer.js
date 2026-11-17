class Slot {
  constructor(price, count) {
    this.price = price
    this.count = count
  }
}

class VendingMachine {
  constructor() {
    this.slots = new Map() // item -> Slot
    this.balance = 0
  }

  stock(item, price, count) {
    if (!this.slots.has(item)) this.slots.set(item, new Slot(price, 0))
    const slot = this.slots.get(item)
    slot.price = price
    slot.count += count
  }

  insert(amount) {
    if (amount <= 0) throw new Error("insert more than 0")
    this.balance += amount
  }

  buy(item) {
    const slot = this.slots.get(item)
    if (!slot) throw new Error(`no ${item} in this machine`)
    if (slot.count === 0) throw new Error(`${item} is sold out`)
    if (this.balance < slot.price) throw new Error(`${item} costs ${slot.price}`)
    slot.count -= 1
    const change = this.balance - slot.price
    this.balance = 0
    return change
  }

  cancel() {
    const back = this.balance
    this.balance = 0
    return back
  }
}

const machine = new VendingMachine()
machine.stock("chips", 150, 2)
machine.insert(100)
machine.insert(100)
console.log(machine.buy("chips"), machine.slots.get("chips").count)
