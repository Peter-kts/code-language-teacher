class Container:
    def __init__(self, code, weight):
        self.code = code
        self.weight = weight

    def __repr__(self):
        # How the container prints: Container(C1, 10t)
        pass

    def __eq__(self, other):
        # Two containers are equal when they have the same code.
        pass


a = Container("C1", 10)
b = Container("C1", 10)
print(a.code, b.code)
print(a == b, a is b)
# Once __repr__ works, print(a) shows Container(C1, 10t)
