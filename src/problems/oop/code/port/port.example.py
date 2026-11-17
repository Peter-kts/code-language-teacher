

port = Port()
atlas = Ship("Atlas", "unload", ["C1", "C2"], [Container("C1", 10), Container("C2", 12)])
borealis = Ship("Borealis", "load", ["C2"])
port.arrive(atlas)
port.arrive(borealis)
port.process("Atlas")
port.process("Borealis")
port.depart("Atlas")
print(port.yard.codes(), port.docked())
print(port.log)
