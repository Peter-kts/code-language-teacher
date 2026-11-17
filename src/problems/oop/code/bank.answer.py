class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance
        self.history = []

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("a deposit must be more than 0")
        self.balance += amount
        self.history.append(f"deposit {amount}")
        return self.balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("a withdrawal must be more than 0")
        if amount > self.balance:
            raise ValueError("not enough money")
        self.balance -= amount
        self.history.append(f"withdraw {amount}")
        return self.balance


account = BankAccount("Ada", 100)
account.deposit(50)
account.withdraw(30)
print(account.balance, account.history)
