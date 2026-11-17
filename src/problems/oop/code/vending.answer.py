class Slot:
    def __init__(self, price, count):
        self.price = price
        self.count = count


class VendingMachine:
    def __init__(self):
        self.slots = {}  # item -> Slot
        self.balance = 0

    def stock(self, item, price, count):
        slot = self.slots.setdefault(item, Slot(price, 0))
        slot.price = price
        slot.count += count

    def insert(self, amount):
        if amount <= 0:
            raise ValueError("insert more than 0")
        self.balance += amount

    def buy(self, item):
        if item not in self.slots:
            raise KeyError(f"no {item} in this machine")
        slot = self.slots[item]
        if slot.count == 0:
            raise ValueError(f"{item} is sold out")
        if self.balance < slot.price:
            raise ValueError(f"{item} costs {slot.price}")
        slot.count -= 1
        change = self.balance - slot.price
        self.balance = 0
        return change

    def cancel(self):
        back = self.balance
        self.balance = 0
        return back


machine = VendingMachine()
machine.stock("chips", 150, 2)
machine.insert(100)
machine.insert(100)
print(machine.buy("chips"), machine.slots["chips"].count)
