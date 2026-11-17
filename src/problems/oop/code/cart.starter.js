// Prices are in cents.
//
// add(name, price, qty = 1): adds to the cart. Adding a name that's already there adds to its
//   quantity (the first price stays). qty must be more than 0, or throw an Error.
// remove(name, qty = 1): takes some away; a line that reaches 0 is gone. Throw an Error if
//   there aren't that many.
// total() -> the price to pay, in whole cents:
//   - a line with 3 or more of one item gets 10% off that line (round down to whole cents)
//   - then a coupon, if one was applied, takes its percent off the whole (round down again)
// applyCoupon(percent): only one coupon per cart; a second one throws an Error.
// lines() -> [name, qty] pairs, in the order the items were first added.

class Cart {}
