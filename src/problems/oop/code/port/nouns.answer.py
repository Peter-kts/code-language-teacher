class Container:
    """One box: just data (a code and a weight), so a very small class."""

    def __init__(self, code, weight):
        pass


class Yard:
    """Where containers wait on land."""

    def add(self, container):
        pass

    def take(self, code):
        pass


class Ship:
    """Comes in either to unload or to load. Its manifest is a list of container codes."""

    def __init__(self, name, mode, manifest, cargo=None):
        pass

    def take_off(self, code):
        pass

    def put_on(self, container):
        pass

    def remaining(self):
        pass


class Crane:
    """Moves one container at a time between a ship and the yard."""

    def unload(self, ship, yard, code):
        pass

    def load(self, ship, yard, code):
        pass


class Port:
    """The boss: ships arrive, get worked by the crane, and depart."""

    def arrive(self, ship):
        pass

    def process(self, name):
        pass

    def depart(self, name):
        pass
