class Dog:
    def __init__(self, name):
        # __init__ runs when you write Dog("Rex"). self is the new dog.
        # Save the name on it: self.name = ...
        pass

    def speak(self):
        # Return "<name> says woof", using the name saved on self.
        pass


rex = Dog("Rex")
fido = Dog("Fido")
print(rex.speak())
print(fido.speak())
