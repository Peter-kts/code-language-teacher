class BankAccount {
  constructor(owner, balance = 0) {
    this.owner = owner
    this.balance = balance
    this.history = [] // like "deposit 50" and "withdraw 20", oldest first
  }

  deposit(amount) {
    // The amount must be more than 0, or throw an Error.
    // Add it, note it in the history, and return the new balance.
  }

  withdraw(amount) {
    // The amount must be more than 0 and no more than the balance, or throw an Error.
    // Take it out, note it in the history, and return the new balance.
  }
}

const account = new BankAccount("Ada", 100)
account.deposit(50)
account.withdraw(30)
console.log(account.balance, account.history)
