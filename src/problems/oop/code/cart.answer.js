class Line {
  constructor(name, price, qty) {
    this.name = name
    this.price = price
    this.qty = qty
  }

  cost() {
    const full = this.price * this.qty
    return this.qty >= 3 ? Math.floor((full * 90) / 100) : full
  }
}

class Cart {
  constructor() {
    this.items = new Map() // name -> Line (a Map keeps the order items were added)
    this.coupon = null
  }

  add(name, price, qty = 1) {
    if (qty <= 0) throw new Error("qty must be more than 0")
    if (this.items.has(name)) this.items.get(name).qty += qty
    else this.items.set(name, new Line(name, price, qty))
  }

  remove(name, qty = 1) {
    const line = this.items.get(name)
    if (!line || line.qty < qty) throw new Error(`not that many ${name} in the cart`)
    line.qty -= qty
    if (line.qty === 0) this.items.delete(name)
  }

  applyCoupon(percent) {
    if (this.coupon !== null) throw new Error("only one coupon per cart")
    this.coupon = percent
  }

  total() {
    let total = 0
    for (const line of this.items.values()) total += line.cost()
    if (this.coupon !== null) total = Math.floor((total * (100 - this.coupon)) / 100)
    return total
  }

  lines() {
    return [...this.items.values()].map((line) => [line.name, line.qty])
  }
}

const cart = new Cart()
cart.add("apple", 50, 3)
cart.add("bread", 300)
cart.applyCoupon(20)
console.log(cart.lines(), cart.total())
