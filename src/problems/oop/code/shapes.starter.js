class Shape {
  constructor(name) {
    this.name = name
  }

  area() {
    // Each kind of shape works out its own area, so the plain Shape can't.
    throw new Error("each shape gives its own area")
  }

  describe() {
    // Works for every shape: it calls this.area(), whichever class this is.
    return `${this.name} with area ${Math.round(this.area() * 100) / 100}`
  }
}

class Circle extends Shape {
  constructor(radius) {
    super("circle")
    this.radius = radius
  }

  // Give Circle its own area(): pi times radius squared (Math.PI).
}

class Rectangle extends Shape {
  // Set it up with a width and a height, named "rectangle", and give it an area().
}

class Square extends Rectangle {
  // A square is a rectangle with equal sides: new Square(3) is a 3 by 3 rectangle named "square".
}

const circle = new Circle(1)
console.log(circle.name, circle.radius)
// Once each shape has its area, try:
// for (const s of [new Circle(1), new Rectangle(3, 4), new Square(2)]) console.log(s.describe())
