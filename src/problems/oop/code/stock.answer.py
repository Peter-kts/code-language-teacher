class Warehouse:
    def __init__(self):
        self.stock = {}

    def add(self, item, count):
        if count <= 0:
            raise ValueError("count must be more than 0")
        self.stock[item] = self.stock.get(item, 0) + count

    def remove(self, item, count):
        if count > self.count(item):
            raise ValueError(f"only {self.count(item)} {item} in stock")
        self.stock[item] -= count
        if self.stock[item] == 0:
            del self.stock[item]

    def count(self, item):
        return self.stock.get(item, 0)

    def items(self):
        return sorted(self.stock)


w = Warehouse()
w.add("bolts", 10)
w.add("nuts", 4)
w.remove("nuts", 4)
print(w.items(), w.count("bolts"))
