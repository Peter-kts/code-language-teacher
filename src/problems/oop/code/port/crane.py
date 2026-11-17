class Crane:
    def __init__(self):
        self.moves = 0

    def unload(self, ship, yard, code):
        # Check before changing anything, so a refused move can't drop a container in the sea.
        if yard.has(code):
            raise ValueError(f"the yard already has {code}")
        container = ship.take_off(code)  # raises if it isn't waiting to come off
        yard.add(container)
        self.moves += 1

    def load(self, ship, yard, code):
        if ship.mode != "load" or code not in ship.remaining():
            raise ValueError(f"{ship.name} isn't waiting for {code}")
        container = yard.take(code)  # raises if the yard doesn't have it: nothing changed yet
        ship.put_on(container)
        self.moves += 1
