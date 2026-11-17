class Yard:
    """Containers waiting on land, by code, so finding one is a quick dict lookup."""

    def __init__(self):
        self.containers = {}  # code -> Container

    def add(self, container):
        if container.code in self.containers:
            raise ValueError(f"{container.code} is already in the yard")
        self.containers[container.code] = container

    def take(self, code):
        if code not in self.containers:
            raise KeyError(f"{code} is not in the yard")
        return self.containers.pop(code)

    def has(self, code):
        return code in self.containers

    def codes(self):
        return sorted(self.containers)
