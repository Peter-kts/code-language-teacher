class Line:
    def __init__(self, name, price, qty):
        self.name = name
        self.price = price
        self.qty = qty

    def cost(self):
        full = self.price * self.qty
        return full * 90 // 100 if self.qty >= 3 else full


class Cart:
    def __init__(self):
        self.items = {}  # name -> Line (dicts keep the order items were added)
        self.coupon = None

    def add(self, name, price, qty=1):
        if qty <= 0:
            raise ValueError("qty must be more than 0")
        if name in self.items:
            self.items[name].qty += qty
        else:
            self.items[name] = Line(name, price, qty)

    def remove(self, name, qty=1):
        line = self.items.get(name)
        if line is None or line.qty < qty:
            raise ValueError(f"not that many {name} in the cart")
        line.qty -= qty
        if line.qty == 0:
            del self.items[name]

    def apply_coupon(self, percent):
        if self.coupon is not None:
            raise ValueError("only one coupon per cart")
        self.coupon = percent

    def total(self):
        total = sum(line.cost() for line in self.items.values())
        if self.coupon is not None:
            total = total * (100 - self.coupon) // 100
        return total

    def lines(self):
        return [[line.name, line.qty] for line in self.items.values()]


cart = Cart()
cart.add("apple", 50, 3)
cart.add("bread", 300)
cart.apply_coupon(20)
print(cart.lines(), cart.total())
