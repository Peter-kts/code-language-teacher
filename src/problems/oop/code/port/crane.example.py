

yard = Yard()
crane = Crane()
atlas = Ship("Atlas", "unload", ["C1"], [Container("C1", 10)])
borealis = Ship("Borealis", "load", ["C1"])
crane.unload(atlas, yard, "C1")
crane.load(borealis, yard, "C1")
print(yard.codes(), borealis.done(), crane.moves)
