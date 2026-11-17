

yard = Yard()
yard.add(Container("C1", 10))
yard.add(Container("C2", 12))
yard.take("C1")
print(yard.codes(), yard.has("C1"))
