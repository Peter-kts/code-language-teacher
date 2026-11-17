class Container:
    def __init__(self, code, weight):
        self.code = code
        self.weight = weight


class Truck:
    def __init__(self, capacity):
        self.capacity = capacity
        self.containers = []  # the Container objects on this truck

    def total_weight(self):
        # Add up the weight of every container on the truck.
        pass

    def load(self, container):
        # If it fits (total weight stays within capacity), add it and return True.
        # Otherwise leave the truck as it is and return False.
        pass

    def codes(self):
        # The codes of the containers on board, in the order they were loaded.
        pass


truck = Truck(25)
truck.load(Container("C1", 10))
truck.load(Container("C2", 12))
truck.load(Container("C3", 8))
print(truck.codes(), truck.total_weight())
