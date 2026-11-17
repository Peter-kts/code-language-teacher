// new Hotel(rooms): rooms is an array of room numbers, like [101, 102].
// Days are whole numbers. A stay from checkIn to checkOut covers the nights
// checkIn, checkIn + 1, ... checkOut - 1 (the guest leaves on checkOut).
//
// book(guest, room, checkIn, checkOut) -> a booking id: 1, then 2, 3...
//   Throw an Error if checkOut isn't after checkIn, if the room doesn't exist,
//   or if the room is already booked for any of those nights.
// cancel(bookingId) -> frees the room. Throw an Error for an unknown id.
// freeRooms(day) -> the rooms nobody is staying in that night, smallest first.
// bookingsFor(guest) -> the rooms booked by that guest, in the order they booked.

class Hotel {}
