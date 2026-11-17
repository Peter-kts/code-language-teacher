class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1
        return self.count

    def add(self, n):
        self.count += n
        return self.count

    def reset(self):
        self.count = 0


clicks = Counter()
clicks.increment()
clicks.increment()
visits = Counter()
visits.add(5)
print(clicks.increment(), visits.add(1))
