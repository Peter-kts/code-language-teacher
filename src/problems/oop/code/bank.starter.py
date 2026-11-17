class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance
        self.history = []  # like "deposit 50" and "withdraw 20", oldest first

    def deposit(self, amount):
        # The amount must be more than 0, or raise a ValueError.
        # Add it, note it in the history, and return the new balance.
        pass

    def withdraw(self, amount):
        # The amount must be more than 0 and no more than the balance, or raise a ValueError.
        # Take it out, note it in the history, and return the new balance.
        pass


account = BankAccount("Ada", 100)
account.deposit(50)
account.withdraw(30)
print(account.balance, account.history)
