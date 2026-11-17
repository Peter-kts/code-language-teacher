
const atlas = new Ship("Atlas", "unload", ["C1", "C2"], [new Container("C1", 10), new Container("C2", 12)])
const borealis = new Ship("Borealis", "load", ["C3"])
atlas.takeOff("C1")
console.log(atlas.remaining(), borealis.remaining(), atlas.done())
