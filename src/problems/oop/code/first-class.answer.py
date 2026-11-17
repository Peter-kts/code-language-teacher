class Dog:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return f"{self.name} says woof"


rex = Dog("Rex")
fido = Dog("Fido")
print(rex.speak())
print(fido.speak())
