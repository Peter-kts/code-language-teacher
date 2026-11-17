class Ship:
    def __init__(self, name, mode, manifest, cargo=None):
        if mode not in ("unload", "load"):
            raise ValueError("mode must be 'unload' or 'load'")
        self.name = name
        self.mode = mode
        self.manifest = list(manifest)  # its own copy: no list shared with anyone
        self.cargo = {}  # code -> Container on board
        for container in cargo or []:
            self.cargo[container.code] = container

    def remaining(self):
        """Codes on the manifest still waiting to be moved, in manifest order."""
        if self.mode == "unload":
            return [code for code in self.manifest if code in self.cargo]
        return [code for code in self.manifest if code not in self.cargo]

    def done(self):
        return not self.remaining()

    def take_off(self, code):
        if self.mode != "unload" or code not in self.remaining():
            raise ValueError(f"{code} is not waiting to come off {self.name}")
        return self.cargo.pop(code)

    def put_on(self, container):
        if self.mode != "load" or container.code not in self.remaining():
            raise ValueError(f"{container.code} is not waiting to go onto {self.name}")
        self.cargo[container.code] = container
