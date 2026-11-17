// All money is in cents.
//
// stock(item, price, count): adds count of item at that price (a new price replaces the old one).
// insert(amount): adds money to the balance. Throw an Error unless amount is more than 0.
// buy(item) -> the change (balance minus price). The balance goes back to 0 and one item is gone.
//   Throw an Error if the machine never had the item, if it's sold out, or if the balance is
//   too low. When buy fails, nothing changes: the balance stays for another try.
// cancel() -> gives back the whole balance and sets it to 0.
// balance: the money put in so far.

class VendingMachine {}
