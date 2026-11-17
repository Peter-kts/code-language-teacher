class ParkingLot {
  constructor(size) {
    this.size = size // spots are numbered 1 to size
    this.spots = new Map() // plate -> spot number, for the cars parked now
  }

  park(plate) {
    // Put the car in the lowest-numbered free spot and return that number.
    // Throw an Error if the lot is full or the car is already parked.
  }

  leave(plate) {
    // Free the car's spot and return its number. Throw an Error if it isn't here.
  }

  where(plate) {
    // The car's spot number, or null if it isn't here.
  }

  free() {
    // How many spots are free.
  }
}

const lot = new ParkingLot(3)
lot.park("AB-123")
lot.park("CD-456")
lot.leave("AB-123")
console.log(lot.park("EF-789"), lot.free())
