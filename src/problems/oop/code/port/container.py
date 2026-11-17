class Container:
    def __init__(self, code, weight):
        self.code = code
        self.weight = weight

    def __repr__(self):
        return f"Container({self.code})"
