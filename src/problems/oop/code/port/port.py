class Port:
    def __init__(self):
        self.yard = Yard()
        self.crane = Crane()
        self.ships = {}  # name -> Ship, the ships docked now
        self.log = []

    def arrive(self, ship):
        if ship.name in self.ships:
            raise ValueError(f"{ship.name} is already docked")
        self.ships[ship.name] = ship
        self.log.append(f"{ship.name} arrived to {ship.mode}")

    def process(self, name):
        """Move every container on the ship's manifest. Returns how many moved."""
        ship = self._ship(name)
        codes = ship.remaining()
        # Check all of them first, so the port never stops halfway through a ship.
        if ship.mode == "load":
            problem = [c for c in codes if not self.yard.has(c)]
            if problem:
                raise ValueError(f"the yard doesn't have {', '.join(problem)}")
        else:
            problem = [c for c in codes if self.yard.has(c)]
            if problem:
                raise ValueError(f"the yard already has {', '.join(problem)}")
        for code in codes:
            if ship.mode == "unload":
                self.crane.unload(ship, self.yard, code)
                self.log.append(f"unloaded {code} from {name}")
            else:
                self.crane.load(ship, self.yard, code)
                self.log.append(f"loaded {code} onto {name}")
        return len(codes)

    def depart(self, name):
        ship = self._ship(name)
        if not ship.done():
            raise ValueError(f"{name} still has work: {', '.join(ship.remaining())}")
        del self.ships[name]
        self.log.append(f"{name} departed")

    def docked(self):
        return sorted(self.ships)

    def _ship(self, name):
        # The leading _ says "only for this class's own methods".
        if name not in self.ships:
            raise KeyError(f"{name} is not docked")
        return self.ships[name]
