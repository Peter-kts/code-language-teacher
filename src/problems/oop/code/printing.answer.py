class Container:
    def __init__(self, code, weight):
        self.code = code
        self.weight = weight

    def __repr__(self):
        return f"Container({self.code}, {self.weight}t)"

    def __eq__(self, other):
        return isinstance(other, Container) and self.code == other.code


a = Container("C1", 10)
b = Container("C1", 10)
print(a)
print(a == b, a is b)
