class Counter:
    def __init__(self):
        # Every counter starts at 0: give self a count.
        pass

    def increment(self):
        # Add 1 to this counter's count and return the new count.
        pass

    def add(self, n):
        # Add n to the count and return the new count.
        pass

    def reset(self):
        # Put the count back to 0.
        pass


clicks = Counter()
clicks.increment()
clicks.increment()
visits = Counter()
visits.add(5)
print(clicks.increment(), visits.add(1))
