import math


class Shape:
    def __init__(self, name):
        self.name = name

    def area(self):
        raise NotImplementedError("each shape gives its own area")

    def describe(self):
        return f"{self.name} with area {round(self.area(), 2)}"


class Circle(Shape):
    def __init__(self, radius):
        super().__init__("circle")
        self.radius = radius

    def area(self):
        return math.pi * self.radius ** 2


class Rectangle(Shape):
    def __init__(self, width, height):
        super().__init__("rectangle")
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height


class Square(Rectangle):
    def __init__(self, side):
        super().__init__(side, side)
        self.name = "square"


shapes = [Circle(1), Rectangle(3, 4), Square(2)]
for s in shapes:
    print(s.describe())
