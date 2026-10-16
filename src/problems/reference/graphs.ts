import type { References } from './types'

// Worked answers for the graphs and backtracking set (sets/graphs.ts). See types.ts.

export const GRAPHS: References = {
  'flood-fill': {
    python: `def floodFill(image, sr, sc, color):
    start = image[sr][sc]
    if start == color:
        return image

    def fill(r, c):
        if r < 0 or r >= len(image) or c < 0 or c >= len(image[0]):
            return
        if image[r][c] != start:
            return
        image[r][c] = color
        fill(r + 1, c)
        fill(r - 1, c)
        fill(r, c + 1)
        fill(r, c - 1)

    fill(sr, sc)
    return image
`,
    javascript: `function floodFill(image, sr, sc, color) {
  const start = image[sr][sc]
  if (start === color) return image

  function fill(r, c) {
    if (r < 0 || r >= image.length || c < 0 || c >= image[0].length) return
    if (image[r][c] !== start) return
    image[r][c] = color
    fill(r + 1, c)
    fill(r - 1, c)
    fill(r, c + 1)
    fill(r, c - 1)
  }

  fill(sr, sc)
  return image
}
`,
  },
  'number-of-islands': {
    python: `def numIslands(grid):
    rows, cols = len(grid), len(grid[0])

    def sink(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != "1":
            return
        grid[r][c] = "0"
        sink(r + 1, c)
        sink(r - 1, c)
        sink(r, c + 1)
        sink(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                count += 1
                sink(r, c)
    return count
`,
    javascript: `function numIslands(grid) {
  const rows = grid.length
  const cols = grid[0].length

  function sink(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== "1") return
    grid[r][c] = "0"
    sink(r + 1, c)
    sink(r - 1, c)
    sink(r, c + 1)
    sink(r, c - 1)
  }

  let count = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "1") {
        count++
        sink(r, c)
      }
    }
  }
  return count
}
`,
    slow: {
      python: `def numIslands(grid):
    rows, cols = len(grid), len(grid[0])

    def sink(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != "1":
            return
        grid[r][c] = "0"
        sink(r + 1, c)
        sink(r - 1, c)
        sink(r, c + 1)
        sink(r, c - 1)

    def find_land():
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    return r, c
        return None

    count = 0
    land = find_land()
    while land is not None:
        count += 1
        sink(land[0], land[1])
        land = find_land()
    return count
`,
      javascript: `function numIslands(grid) {
  const rows = grid.length
  const cols = grid[0].length

  function sink(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== "1") return
    grid[r][c] = "0"
    sink(r + 1, c)
    sink(r - 1, c)
    sink(r, c + 1)
    sink(r, c - 1)
  }

  function findLand() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === "1") return [r, c]
      }
    }
    return null
  }

  let count = 0
  let land = findLand()
  while (land !== null) {
    count++
    sink(land[0], land[1])
    land = findLand()
  }
  return count
}
`,
    },
  },
  'rotting-oranges': {
    python: `from collections import deque

def orangesRotting(grid):
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1

    minutes = 0
    while queue and fresh > 0:
        for _ in range(len(queue)):
            r, c = queue.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    queue.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1
`,
    javascript: `function orangesRotting(grid) {
  const rows = grid.length
  const cols = grid[0].length
  let queue = []
  let fresh = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c])
      else if (grid[r][c] === 1) fresh++
    }
  }

  let minutes = 0
  while (queue.length > 0 && fresh > 0) {
    const next = []
    for (const [r, c] of queue) {
      for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
          grid[nr][nc] = 2
          fresh--
          next.push([nr, nc])
        }
      }
    }
    queue = next
    minutes++
  }
  return fresh === 0 ? minutes : -1
}
`,
  },
  'course-schedule': {
    python: `from collections import deque

def canFinish(numCourses, prerequisites):
    needed_by = [[] for _ in range(numCourses)]
    waiting = [0] * numCourses
    for a, b in prerequisites:
        needed_by[b].append(a)
        waiting[a] += 1

    queue = deque(c for c in range(numCourses) if waiting[c] == 0)
    taken = 0
    while queue:
        course = queue.popleft()
        taken += 1
        for later in needed_by[course]:
            waiting[later] -= 1
            if waiting[later] == 0:
                queue.append(later)
    return taken == numCourses
`,
    javascript: `function canFinish(numCourses, prerequisites) {
  const neededBy = Array.from({ length: numCourses }, () => [])
  const waiting = new Array(numCourses).fill(0)
  for (const [a, b] of prerequisites) {
    neededBy[b].push(a)
    waiting[a]++
  }

  const queue = []
  for (let c = 0; c < numCourses; c++) if (waiting[c] === 0) queue.push(c)
  let head = 0
  while (head < queue.length) {
    const course = queue[head++]
    for (const later of neededBy[course]) {
      waiting[later]--
      if (waiting[later] === 0) queue.push(later)
    }
  }
  return queue.length === numCourses
}
`,
    slow: {
      python: `def canFinish(numCourses, prerequisites):
    taken = set()
    while len(taken) < numCourses:
        blocked = set()
        for a, b in prerequisites:
            if b not in taken:
                blocked.add(a)
        took_one = False
        for c in range(numCourses):
            if c not in taken and c not in blocked:
                taken.add(c)
                took_one = True
        if not took_one:
            return False
    return True
`,
      javascript: `function canFinish(numCourses, prerequisites) {
  const taken = new Set()
  while (taken.size < numCourses) {
    const blocked = new Set()
    for (const [a, b] of prerequisites) {
      if (!taken.has(b)) blocked.add(a)
    }
    let tookOne = false
    for (let c = 0; c < numCourses; c++) {
      if (!taken.has(c) && !blocked.has(c)) {
        taken.add(c)
        tookOne = true
      }
    }
    if (!tookOne) return false
  }
  return true
}
`,
    },
  },
  subsets: {
    python: `def subsets(nums):
    out = []
    current = []

    def choose(i):
        if i == len(nums):
            out.append(current[:])
            return
        choose(i + 1)
        current.append(nums[i])
        choose(i + 1)
        current.pop()

    choose(0)
    return out
`,
    javascript: `function subsets(nums) {
  const out = []
  const current = []

  function choose(i) {
    if (i === nums.length) {
      out.push([...current])
      return
    }
    choose(i + 1)
    current.push(nums[i])
    choose(i + 1)
    current.pop()
  }

  choose(0)
  return out
}
`,
  },
  permutations: {
    python: `def permute(nums):
    out = []
    current = []
    used = set()

    def build():
        if len(current) == len(nums):
            out.append(current[:])
            return
        for n in nums:
            if n in used:
                continue
            current.append(n)
            used.add(n)
            build()
            current.pop()
            used.remove(n)

    build()
    return out
`,
    javascript: `function permute(nums) {
  const out = []
  const current = []
  const used = new Set()

  function build() {
    if (current.length === nums.length) {
      out.push([...current])
      return
    }
    for (const n of nums) {
      if (used.has(n)) continue
      current.push(n)
      used.add(n)
      build()
      current.pop()
      used.delete(n)
    }
  }

  build()
  return out
}
`,
  },
  'combination-sum': {
    python: `def combinationSum(candidates, target):
    candidates = sorted(candidates)
    out = []
    current = []

    def build(start, left):
        if left == 0:
            out.append(current[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > left:
                break
            current.append(candidates[i])
            build(i, left - candidates[i])
            current.pop()

    build(0, target)
    return out
`,
    javascript: `function combinationSum(candidates, target) {
  candidates = [...candidates].sort((a, b) => a - b)
  const out = []
  const current = []

  function build(start, left) {
    if (left === 0) {
      out.push([...current])
      return
    }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > left) break
      current.push(candidates[i])
      build(i, left - candidates[i])
      current.pop()
    }
  }

  build(0, target)
  return out
}
`,
  },
}
