class Container:
    def __init__(self, code, weight):
        self.code = code
        self.weight = weight


class Truck:
    def __init__(self, capacity):
        self.capacity = capacity
        self.containers = []

    def total_weight(self):
        return sum(c.weight for c in self.containers)

    def load(self, container):
        if self.total_weight() + container.weight > self.capacity:
            return False
        self.containers.append(container)
        return True

    def codes(self):
        return [c.code for c in self.containers]


truck = Truck(25)
truck.load(Container("C1", 10))
truck.load(Container("C2", 12))
truck.load(Container("C3", 8))
print(truck.codes(), truck.total_weight())
