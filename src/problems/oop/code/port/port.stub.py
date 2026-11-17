class Port:
    def __init__(self):
        # A port has one yard, one crane, the ships docked now (by name) and a log.
        self.yard = Yard()
        self.crane = Crane()
        self.ships = {}
        self.log = []

    def arrive(self, ship):
        # Dock the ship and log "<name> arrived to <mode>".
        # Raise a ValueError if a ship with that name is already docked.
        pass

    def process(self, name):
        # Use the crane to move every container still waiting on that ship's manifest, logging
        # "unloaded C1 from Atlas" or "loaded C1 onto Atlas" for each. Return how many moved.
        # Check first, and raise without moving anything, if any of them can't be moved.
        pass

    def depart(self, name):
        # Raise a ValueError if the ship still has work. Otherwise undock it and log "<name> departed".
        pass

    def docked(self):
        # The names of the docked ships, in A to Z order.
        pass
