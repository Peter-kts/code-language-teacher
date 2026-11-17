# The interview starter: every Ship shares one manifest. Fix it so each ship has its own.
class Ship:
    manifest = []

    def __init__(self, name):
        self.name = name

    def add(self, container):
        self.manifest.append(container)

    def count(self):
        return len(self.manifest)


atlas = Ship("Atlas")
borealis = Ship("Borealis")
atlas.add("C1")
atlas.add("C2")
print(atlas.manifest, borealis.manifest)
