
const yard = new Yard()
yard.add(new Container("C1", 10))
yard.add(new Container("C2", 12))
yard.take("C1")
console.log(yard.codes(), yard.has("C1"))
