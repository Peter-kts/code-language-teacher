class Warehouse:
    def __init__(self):
        self.stock = {}  # item -> how many are in stock

    def add(self, item, count):
        # count must be more than 0, or raise a ValueError.
        pass

    def remove(self, item, count):
        # Raise a ValueError if there aren't that many (and change nothing).
        # An item that reaches 0 is no longer in stock at all.
        pass

    def count(self, item):
        # How many of item are in stock (0 if none).
        pass

    def items(self):
        # The items in stock, in A to Z order.
        pass


w = Warehouse()
w.add("bolts", 10)
w.add("nuts", 4)
w.remove("nuts", 4)
print(w.items(), w.count("bolts"))
