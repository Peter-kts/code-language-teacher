class Counter {
  constructor() {
    this.count = 0
  }

  increment() {
    this.count += 1
    return this.count
  }

  add(n) {
    this.count += n
    return this.count
  }

  reset() {
    this.count = 0
  }
}

const clicks = new Counter()
clicks.increment()
clicks.increment()
const visits = new Counter()
visits.add(5)
console.log(clicks.increment(), visits.add(1))
