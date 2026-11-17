class Ship:
    built = 0  # how many ships have been made: one number for the whole class

    def __init__(self, name):
        self.name = name
        Ship.built += 1  # self.built += 1 would make a new number on this ship instead
        self.number = Ship.built


atlas = Ship("Atlas")
borealis = Ship("Borealis")
print(Ship.built)
