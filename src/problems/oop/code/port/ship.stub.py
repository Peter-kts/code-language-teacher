class Ship:
    def __init__(self, name, mode, manifest, cargo=None):
        # mode is "unload" or "load" (raise a ValueError for anything else).
        # manifest is a list of container codes: keep a copy of your own.
        # cargo is a list of the Container objects on board when the ship arrives (none if None).
        self.name = name

    def remaining(self):
        # The manifest codes still waiting to be moved, in manifest order:
        # an unloading ship's are the ones still on board, a loading ship's the ones not yet on.
        pass

    def done(self):
        # True when nothing is waiting.
        pass

    def take_off(self, code):
        # Unloading ships only: remove that container from the ship and return it.
        # Raise a ValueError if it isn't waiting to come off.
        pass

    def put_on(self, container):
        # Loading ships only: put the container on board.
        # Raise a ValueError if it isn't waiting to go on.
        pass
