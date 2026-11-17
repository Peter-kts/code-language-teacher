class Ship:
    manifest = []

    def __init__(self, name):
        self.name = name

    def add(self, container):
        self.manifest.append(container)


class Truck:
    def __init__(self, name):
        self.name = name
        self.load = []


atlas = Ship("Atlas")
borealis = Ship("Borealis")
atlas.add("C1")
print(borealis.manifest)
print(atlas.manifest is borealis.manifest)

t1 = Truck("T1")
t2 = Truck("T2")
t1.load.append("C2")
print(t2.load)
