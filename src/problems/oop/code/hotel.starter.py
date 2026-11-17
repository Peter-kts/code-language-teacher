# Hotel(rooms): rooms is a list of room numbers, like [101, 102].
# Days are whole numbers. A stay from check_in to check_out covers the nights
# check_in, check_in + 1, ... check_out - 1 (the guest leaves on check_out).
#
# book(guest, room, check_in, check_out) -> a booking id: 1, then 2, 3...
#   Raise a ValueError if check_out isn't after check_in, if the room doesn't exist,
#   or if the room is already booked for any of those nights.
# cancel(booking_id) -> frees the room. Raise a KeyError for an unknown id.
# free_rooms(day) -> the rooms nobody is staying in that night, smallest first.
# bookings_for(guest) -> the rooms booked by that guest, in the order they booked.


class Hotel:
    pass
