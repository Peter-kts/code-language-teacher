class Shape {
  constructor(name) {
    this.name = name
  }

  area() {
    throw new Error("each shape gives its own area")
  }

  describe() {
    return `${this.name} with area ${Math.round(this.area() * 100) / 100}`
  }
}

class Circle extends Shape {
  constructor(radius) {
    super("circle")
    this.radius = radius
  }

  area() {
    return Math.PI * this.radius ** 2
  }
}

class Rectangle extends Shape {
  constructor(width, height) {
    super("rectangle")
    this.width = width
    this.height = height
  }

  area() {
    return this.width * this.height
  }
}

class Square extends Rectangle {
  constructor(side) {
    super(side, side)
    this.name = "square"
  }
}

const shapes = [new Circle(1), new Rectangle(3, 4), new Square(2)]
for (const s of shapes) console.log(s.describe())
