class Booking {
  constructor(id, guest, room, checkIn, checkOut) {
    this.id = id
    this.guest = guest
    this.room = room
    this.checkIn = checkIn
    this.checkOut = checkOut
  }

  covers(day) {
    return this.checkIn <= day && day < this.checkOut
  }

  overlaps(checkIn, checkOut) {
    // Two stays clash when each one starts before the other ends.
    return this.checkIn < checkOut && checkIn < this.checkOut
  }
}

class Hotel {
  constructor(rooms) {
    this.rooms = [...rooms].sort((a, b) => a - b)
    this.bookings = new Map() // booking id -> Booking
    this.nextId = 1
  }

  book(guest, room, checkIn, checkOut) {
    if (checkOut <= checkIn) throw new Error("checkOut must be after checkIn")
    if (!this.rooms.includes(room)) throw new Error(`there is no room ${room}`)
    for (const b of this.bookings.values()) {
      if (b.room === room && b.overlaps(checkIn, checkOut)) throw new Error(`room ${room} is already booked then`)
    }
    const booking = new Booking(this.nextId, guest, room, checkIn, checkOut)
    this.bookings.set(booking.id, booking)
    this.nextId += 1
    return booking.id
  }

  cancel(bookingId) {
    if (!this.bookings.has(bookingId)) throw new Error(`no booking ${bookingId}`)
    this.bookings.delete(bookingId)
  }

  freeRooms(day) {
    const busy = new Set([...this.bookings.values()].filter((b) => b.covers(day)).map((b) => b.room))
    return this.rooms.filter((r) => !busy.has(r))
  }

  bookingsFor(guest) {
    return [...this.bookings.values()].filter((b) => b.guest === guest).map((b) => b.room)
  }
}

const hotel = new Hotel([101, 102])
const first = hotel.book("Ada", 101, 1, 3)
hotel.book("Grace", 102, 2, 4)
console.log(hotel.freeRooms(2), hotel.freeRooms(3))
