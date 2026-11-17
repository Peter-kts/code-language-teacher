class Task:
    def __init__(self, name, priority, order):
        self.name = name
        self.priority = priority
        self.order = order  # when it was added, to break ties


class TaskScheduler:
    def __init__(self):
        self.tasks = []
        self.added = 0

    def add(self, name, priority):
        if any(t.name == name for t in self.tasks):
            raise ValueError(f"{name} is already waiting")
        self.added += 1
        self.tasks.append(Task(name, priority, self.added))

    def _best(self):
        if not self.tasks:
            return None
        return max(self.tasks, key=lambda t: (t.priority, -t.order))

    def peek(self):
        best = self._best()
        return best.name if best else None

    def next_task(self):
        best = self._best()
        if best is None:
            return None
        self.tasks.remove(best)
        return best.name

    def size(self):
        return len(self.tasks)


s = TaskScheduler()
s.add("email", 1)
s.add("deploy", 5)
s.add("lunch", 5)
print(s.next_task(), s.next_task(), s.size())
