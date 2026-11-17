class Counter {
  constructor() {
    // Every counter starts at 0: give this a count.
  }

  increment() {
    // Add 1 to this counter's count and return the new count.
  }

  add(n) {
    // Add n to the count and return the new count.
  }

  reset() {
    // Put the count back to 0.
  }
}

const clicks = new Counter()
clicks.increment()
clicks.increment()
const visits = new Counter()
visits.add(5)
console.log(clicks.increment(), visits.add(1))
