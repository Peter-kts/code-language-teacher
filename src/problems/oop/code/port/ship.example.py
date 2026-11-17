

atlas = Ship("Atlas", "unload", ["C1", "C2"], [Container("C1", 10), Container("C2", 12)])
borealis = Ship("Borealis", "load", ["C3"])
atlas.take_off("C1")
print(atlas.remaining(), borealis.remaining(), atlas.done())
