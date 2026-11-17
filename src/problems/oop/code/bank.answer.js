class BankAccount {
  constructor(owner, balance = 0) {
    this.owner = owner
    this.balance = balance
    this.history = []
  }

  deposit(amount) {
    if (amount <= 0) throw new Error("a deposit must be more than 0")
    this.balance += amount
    this.history.push(`deposit ${amount}`)
    return this.balance
  }

  withdraw(amount) {
    if (amount <= 0) throw new Error("a withdrawal must be more than 0")
    if (amount > this.balance) throw new Error("not enough money")
    this.balance -= amount
    this.history.push(`withdraw ${amount}`)
    return this.balance
  }
}

const account = new BankAccount("Ada", 100)
account.deposit(50)
account.withdraw(30)
console.log(account.balance, account.history)
