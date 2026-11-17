class ParkingLot:
    def __init__(self, size):
        self.size = size
        self.spots = {}

    def park(self, plate):
        if plate in self.spots:
            raise ValueError(f"{plate} is already parked")
        taken = set(self.spots.values())
        for spot in range(1, self.size + 1):
            if spot not in taken:
                self.spots[plate] = spot
                return spot
        raise ValueError("the lot is full")

    def leave(self, plate):
        if plate not in self.spots:
            raise KeyError(f"{plate} isn't here")
        return self.spots.pop(plate)

    def where(self, plate):
        return self.spots.get(plate)

    def free(self):
        return self.size - len(self.spots)


lot = ParkingLot(3)
lot.park("AB-123")
lot.park("CD-456")
lot.leave("AB-123")
print(lot.park("EF-789"), lot.free())
