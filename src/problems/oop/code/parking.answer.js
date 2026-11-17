class ParkingLot {
  constructor(size) {
    this.size = size
    this.spots = new Map()
  }

  park(plate) {
    if (this.spots.has(plate)) throw new Error(`${plate} is already parked`)
    const taken = new Set(this.spots.values())
    for (let spot = 1; spot <= this.size; spot++) {
      if (!taken.has(spot)) {
        this.spots.set(plate, spot)
        return spot
      }
    }
    throw new Error("the lot is full")
  }

  leave(plate) {
    if (!this.spots.has(plate)) throw new Error(`${plate} isn't here`)
    const spot = this.spots.get(plate)
    this.spots.delete(plate)
    return spot
  }

  where(plate) {
    return this.spots.get(plate) ?? null
  }

  free() {
    return this.size - this.spots.size
  }
}

const lot = new ParkingLot(3)
lot.park("AB-123")
lot.park("CD-456")
lot.leave("AB-123")
console.log(lot.park("EF-789"), lot.free())
