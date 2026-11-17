class Ship:
    built = 0  # how many ships have been made: one number for the whole class

    def __init__(self, name):
        self.name = name
        # Add 1 to the class's count (not to a copy on this ship),
        # then give this ship its number: 1 for the first ship, 2 for the next...


atlas = Ship("Atlas")
borealis = Ship("Borealis")
print(Ship.built)
