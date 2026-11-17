
const yard = new Yard()
const crane = new Crane()
const atlas = new Ship("Atlas", "unload", ["C1"], [new Container("C1", 10)])
const borealis = new Ship("Borealis", "load", ["C1"])
crane.unload(atlas, yard, "C1")
crane.load(borealis, yard, "C1")
console.log(yard.codes(), borealis.done(), crane.moves)
