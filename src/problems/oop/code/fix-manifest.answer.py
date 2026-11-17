class Ship:
    def __init__(self, name):
        self.name = name
        self.manifest = []  # made here, so each ship gets a new list of its own

    def add(self, container):
        self.manifest.append(container)

    def count(self):
        return len(self.manifest)


atlas = Ship("Atlas")
borealis = Ship("Borealis")
atlas.add("C1")
atlas.add("C2")
print(atlas.manifest, borealis.manifest)
