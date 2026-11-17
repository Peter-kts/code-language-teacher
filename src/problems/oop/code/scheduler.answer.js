class Task {
  constructor(name, priority, order) {
    this.name = name
    this.priority = priority
    this.order = order // when it was added, to break ties
  }
}

class TaskScheduler {
  constructor() {
    this.tasks = []
    this.added = 0
  }

  add(name, priority) {
    if (this.tasks.some((t) => t.name === name)) throw new Error(`${name} is already waiting`)
    this.added += 1
    this.tasks.push(new Task(name, priority, this.added))
  }

  best() {
    let best = null
    for (const t of this.tasks) {
      if (!best || t.priority > best.priority || (t.priority === best.priority && t.order < best.order)) best = t
    }
    return best
  }

  peek() {
    return this.best()?.name ?? null
  }

  nextTask() {
    const best = this.best()
    if (!best) return null
    this.tasks.splice(this.tasks.indexOf(best), 1)
    return best.name
  }

  size() {
    return this.tasks.length
  }
}

const s = new TaskScheduler()
s.add("email", 1)
s.add("deploy", 5)
s.add("lunch", 5)
console.log(s.nextTask(), s.nextTask(), s.size())
