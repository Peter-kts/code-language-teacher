import math


class Shape:
    def __init__(self, name):
        self.name = name

    def area(self):
        # Each kind of shape works out its own area, so the plain Shape can't.
        raise NotImplementedError("each shape gives its own area")

    def describe(self):
        # Works for every shape: it calls self.area(), whichever class self is.
        return f"{self.name} with area {round(self.area(), 2)}"


class Circle(Shape):
    def __init__(self, radius):
        super().__init__("circle")
        self.radius = radius

    # Give Circle its own area(): pi times radius squared (math.pi).


class Rectangle(Shape):
    # Set it up with a width and a height, named "rectangle", and give it an area().
    pass


class Square(Rectangle):
    # A square is a rectangle with equal sides: Square(3) is a 3 by 3 rectangle named "square".
    pass


circle = Circle(1)
print(circle.name, circle.radius)
# Once each shape has its area, try:
# for s in [Circle(1), Rectangle(3, 4), Square(2)]:
#     print(s.describe())
