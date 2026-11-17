class Booking:
    def __init__(self, booking_id, guest, room, check_in, check_out):
        self.id = booking_id
        self.guest = guest
        self.room = room
        self.check_in = check_in
        self.check_out = check_out

    def covers(self, day):
        return self.check_in <= day < self.check_out

    def overlaps(self, check_in, check_out):
        # Two stays clash when each one starts before the other ends.
        return self.check_in < check_out and check_in < self.check_out


class Hotel:
    def __init__(self, rooms):
        self.rooms = sorted(rooms)
        self.bookings = {}  # booking id -> Booking
        self.next_id = 1

    def book(self, guest, room, check_in, check_out):
        if check_out <= check_in:
            raise ValueError("check_out must be after check_in")
        if room not in self.rooms:
            raise ValueError(f"there is no room {room}")
        for b in self.bookings.values():
            if b.room == room and b.overlaps(check_in, check_out):
                raise ValueError(f"room {room} is already booked then")
        booking = Booking(self.next_id, guest, room, check_in, check_out)
        self.bookings[booking.id] = booking
        self.next_id += 1
        return booking.id

    def cancel(self, booking_id):
        if booking_id not in self.bookings:
            raise KeyError(f"no booking {booking_id}")
        del self.bookings[booking_id]

    def free_rooms(self, day):
        busy = {b.room for b in self.bookings.values() if b.covers(day)}
        return [r for r in self.rooms if r not in busy]

    def bookings_for(self, guest):
        return [b.room for b in self.bookings.values() if b.guest == guest]


hotel = Hotel([101, 102])
first = hotel.book("Ada", 101, 1, 3)
hotel.book("Grace", 102, 2, 4)
print(hotel.free_rooms(2), hotel.free_rooms(3))
