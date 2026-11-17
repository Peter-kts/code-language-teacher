class ParkingLot:
    def __init__(self, size):
        self.size = size  # spots are numbered 1 to size
        self.spots = {}  # plate -> spot number, for the cars parked now

    def park(self, plate):
        # Put the car in the lowest-numbered free spot and return that number.
        # Raise a ValueError if the lot is full or the car is already parked.
        pass

    def leave(self, plate):
        # Free the car's spot and return its number. Raise a KeyError if it isn't here.
        pass

    def where(self, plate):
        # The car's spot number, or None if it isn't here.
        pass

    def free(self):
        # How many spots are free.
        pass


lot = ParkingLot(3)
lot.park("AB-123")
lot.park("CD-456")
lot.leave("AB-123")
print(lot.park("EF-789"), lot.free())
