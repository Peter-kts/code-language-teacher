class Container:
    def __init__(self, code, weight):
        # Keep the code (like "C1") and the weight on the container.
        pass


class Yard:
    def __init__(self):
        self.containers = {}  # code -> Container

    def add(self, container):
        # Raise a ValueError if a container with that code is already here.
        pass

    def take(self, code):
        # Remove the container with that code and return it. Raise a KeyError if it isn't here.
        pass

    def has(self, code):
        # True if a container with that code is in the yard.
        pass

    def codes(self):
        # The codes of every container in the yard, in A to Z order.
        pass
