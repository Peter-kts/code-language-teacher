class Crane:
    def __init__(self):
        self.moves = 0  # how many containers it has moved

    def unload(self, ship, yard, code):
        # Move one container off the ship into the yard, and count the move.
        # If the move can't happen, raise an error and leave the ship and the yard as they were.
        pass

    def load(self, ship, yard, code):
        # Move one container from the yard onto the ship, and count the move.
        # Same rule: a refused move changes nothing.
        pass
