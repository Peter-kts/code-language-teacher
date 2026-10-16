import { seeded } from '../big'
import type { Problem, SpeedTest } from '../problems'

// Graphs and grids, then backtracking.

// --- Speed inputs ---

/**
 * A 50 × 50 grid with a few hundred small islands: land on every even row and column, joined
 * to its right neighbor half the time and to the row below now and then. Starting the search
 * over from the top-left corner after each island has to walk past most of the grid again.
 */
function islandGrid(size: number, seed: number): string[][] {
  const next = seeded(seed)
  const grid: string[][] = []
  for (let r = 0; r < size; r++) {
    const row: string[] = []
    for (let c = 0; c < size; c++) {
      let land: boolean
      if (r % 2 === 0) land = c % 2 === 0 || next() < 0.5
      else land = c % 2 === 0 && next() < 0.15
      row.push(land ? '1' : '0')
    }
    grid.push(row)
  }
  return grid
}

function countIslands(grid: string[][]): number {
  const seen = grid.map((row) => row.map((v) => v !== '1'))
  let count = 0
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (seen[r][c]) continue
      count++
      const stack = [[r, c]]
      seen[r][c] = true
      while (stack.length) {
        const [y, x] = stack.pop()!
        for (const [ny, nx] of [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]]) {
          if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length && !seen[ny][nx]) {
            seen[ny][nx] = true
            stack.push([ny, nx])
          }
        }
      }
    }
  }
  return count
}

const ISLANDS = islandGrid(50, 11)

const islandsSpeed: SpeedTest = {
  args: [ISLANDS],
  expected: countIslands(ISLANDS),
  maxSteps: 80_000,
  size: `grid is 50 × 50, with ${countIslands(ISLANDS)} small islands`,
}

/**
 * A chain of 600 courses (each needs the one before it), plus every third course also needing
 * the one two back. Only one new course becomes free at a time, so rescanning every pair to
 * find a free course takes 600 passes over all the pairs. The chain is short enough that a
 * recursive answer stays well inside Python's recursion limit.
 */
const COURSES = 600
const coursePairs: number[][] = []
for (let i = COURSES - 1; i >= 1; i--) {
  coursePairs.push([i, i - 1])
  if (i % 3 === 0 && i >= 2) coursePairs.push([i, i - 2])
}

const courseSpeed: SpeedTest = {
  args: [COURSES, coursePairs],
  expected: true,
  maxSteps: 50_000,
  size: `numCourses is ${COURSES}, with ${coursePairs.length} prerequisite pairs`,
}

// --- Problems ---

export const GRAPHS: Problem[] = [
  {
    id: 'flood-fill',
    title: 'Flood Fill',
    difficulty: 'Easy',
    topic: 'graphs',
    statement: [
      {
        python: 'image is a grid of numbers (a list of rows, each a list of numbers), where each number is a color. You are given a starting cell image[sr][sc] and a new color.',
        javascript: 'image is a grid of numbers (an array of rows, each an array of numbers), where each number is a color. You are given a starting cell image[sr][sc] and a new color.',
      },
      'Paint the starting cell with color, and also every cell connected to it through cells of the same starting color, moving up, down, left or right (not diagonally). Return the changed image.',
    ],
    constraints: ['image has 1 to 50 rows and 1 to 50 columns', '0 ≤ image[i][j], color < 2¹⁶', 'sr and sc are inside the grid.'],
    hints: [
      'Remember the starting color first. If it is already equal to color, there is nothing to paint, so return right away (otherwise painting would never finish).',
      'fill(r, c) should stop at once if (r, c) is off the grid, or if that cell is not the starting color.',
      'Otherwise paint the cell, then call fill on its four neighbors: (r + 1, c), (r - 1, c), (r, c + 1) and (r, c - 1). Painting first is what stops it from coming back.',
    ],
    complexity: {
      time: 'O(m·n)',
      space: 'O(m·n)',
      extra: ['O(m·n)'],
      why: 'm is the number of rows and n the number of columns. Each cell is painted at most once and checked from at most four neighbors. The chain of calls can be as deep as the number of cells painted.',
    },
    concepts: { python: ['grid-dfs', 'recursion', 'lists'], javascript: ['grid-dfs', 'recursion', 'lists'] },
    functionName: 'floodFill',
    starters: {
      python: `def floodFill(image, sr, sc, color):
    start = image[sr][sc]
    if start == color:
        return image

    def fill(r, c):
        # stop if (r, c) is off the grid or not the start color,
        # otherwise paint it and fill its four neighbors
        pass

    fill(sr, sc)
    return image
`,
      javascript: `function floodFill(image, sr, sc, color) {
  const start = image[sr][sc]
  if (start === color) return image

  function fill(r, c) {
    // stop if (r, c) is off the grid or not the start color,
    // otherwise paint it and fill its four neighbors
  }

  fill(sr, sc)
  return image
}
`,
    },
    tests: [
      { args: [[[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2], expected: [[2, 2, 2], [2, 2, 0], [2, 0, 1]] },
      { args: [[[0, 0, 0], [0, 0, 0]], 0, 0, 0], expected: [[0, 0, 0], [0, 0, 0]] },
      { args: [[[1, 2, 1], [1, 2, 1], [1, 1, 1]], 0, 2, 3], expected: [[3, 2, 3], [3, 2, 3], [3, 3, 3]] },
      { args: [[[0, 1], [1, 0]], 0, 0, 7], expected: [[7, 1], [1, 0]] },
      { args: [[[4]], 0, 0, 5], expected: [[5]] },
    ],
  },
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium',
    topic: 'graphs',
    statement: [
      'grid is a map of "1" (land) and "0" (water). An island is a group of land cells joined up, down, left or right (not diagonally), with water all around it. Everything outside the grid counts as water.',
      'Return how many islands there are.',
    ],
    constraints: ['grid has 1 to 300 rows and 1 to 300 columns', 'Each cell is "0" or "1".'],
    hints: [
      'Simplest: find any "1" by scanning from the top-left corner, sink its whole island (turn all of its land into "0"), count it, and start scanning from the top-left again. Each new scan can walk past most of the grid: O((m·n)²) when there are many small islands.',
      'Faster: walk the grid just once. Each "1" you step on is a new island: count it, sink it right away, and carry on from where you were.',
      'Sinking is a search from that cell: turn it into "0", then sink its four neighbors, stopping at the edge of the grid or at water. Because sunk land is water now, no island is counted twice.',
    ],
    complexity: {
      time: 'O(m·n)',
      space: 'O(m·n)',
      extra: ['O(m·n)'],
      why: 'm is the number of rows and n the number of columns. The scan looks at every cell once, and each land cell is sunk once. Sinking one big island can go as deep as its size, which can be the whole grid.',
    },
    speed: islandsSpeed,
    concepts: { python: ['grid-dfs', 'nested-loops', 'recursion'], javascript: ['grid-dfs', 'nested-loops', 'recursion'] },
    functionName: 'numIslands',
    starters: {
      python: `def numIslands(grid):
    pass
`,
      javascript: `function numIslands(grid) {

}
`,
    },
    tests: [
      {
        args: [[['1', '1', '1', '1', '0'], ['1', '1', '0', '1', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '0', '0', '0']]],
        expected: 1,
      },
      {
        args: [[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]],
        expected: 3,
      },
      { args: [[['0']]], expected: 0 },
      { args: [[['1', '0', '1'], ['0', '1', '0'], ['1', '0', '1']]], expected: 5 },
      { args: [[['1', '1', '1'], ['0', '1', '0'], ['1', '1', '1']]], expected: 1 },
    ],
  },
  {
    id: 'rotting-oranges',
    title: 'Rotting Oranges',
    difficulty: 'Medium',
    topic: 'graphs',
    statement: [
      'Each cell of grid is 0 (empty), 1 (a fresh orange) or 2 (a rotten orange).',
      'Every minute, each fresh orange next to a rotten one (up, down, left or right) turns rotten. Return the number of minutes until no fresh orange is left, or -1 if some can never rot.',
    ],
    constraints: ['grid has 1 to 10 rows and 1 to 10 columns', 'Each cell is 0, 1 or 2.'],
    hints: [
      'Simplest: each minute, scan the whole grid for fresh oranges next to a rotten one and rot them all together (collect them first, so a just-rotted orange waits a minute). Stop when a minute changes nothing. That can be m·n minutes of m·n cells each: O((m·n)²), which is fine for a 10 × 10 grid.',
      {
        python: 'Faster: put every rotten orange into a queue (a deque) at the start, and count the fresh ones. This is a breadth-first search that starts from many places at once.',
        javascript: 'Faster: put every rotten orange into a queue (an array works) at the start, and count the fresh ones. This is a breadth-first search that starts from many places at once.',
      },
      'Work one minute at a time: take exactly the oranges that are in the queue now, rot their fresh neighbors, and add those to the queue. One round is one minute.',
      'Stop when the queue is empty or nothing fresh is left. Return the minutes if the fresh count is 0, otherwise -1. Count a minute only for a round that rotted something.',
    ],
    complexity: {
      time: 'O(m·n)',
      space: 'O(m·n)',
      extra: ['O(m·n)'],
      why: 'm is the number of rows and n the number of columns. Each orange joins the queue once and checks its four neighbors once. The queue can hold most of the grid at the same time.',
    },
    concepts: { python: ['bfs', 'deque', 'nested-loops'], javascript: ['bfs', 'deque', 'nested-loops'] },
    functionName: 'orangesRotting',
    starters: {
      python: `def orangesRotting(grid):
    pass
`,
      javascript: `function orangesRotting(grid) {

}
`,
    },
    tests: [
      { args: [[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], expected: 4 },
      { args: [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], expected: -1 },
      { args: [[[0, 2]]], expected: 0 },
      { args: [[[0]]], expected: 0 },
      { args: [[[1]]], expected: -1 },
      { args: [[[2, 1, 1, 1, 2]]], expected: 2 },
    ],
  },
  {
    id: 'course-schedule',
    title: 'Course Schedule',
    difficulty: 'Medium',
    topic: 'graphs',
    statement: [
      'There are numCourses courses, numbered 0 to numCourses - 1. Each pair [a, b] in prerequisites means you must take course b before course a.',
      {
        python: 'Return True if you can take every course, and False otherwise.',
        javascript: 'Return true if you can take every course, and false otherwise.',
      },
    ],
    constraints: ['1 ≤ numCourses ≤ 2000', 'prerequisites has 0 to 5000 pairs', '0 ≤ a, b < numCourses', 'Every pair is different.'],
    hints: [
      'Simplest: again and again, read through every pair to find a course whose prerequisites are all taken, and take it. If a whole pass takes nothing new, you are stuck. With V courses and E pairs that is up to V passes over E pairs: O(V·E).',
      {
        python: 'Faster: read the pairs once to build a graph. For each course b, keep a list of the courses that need it, and count how many prerequisites each course is still waiting for.',
        javascript: 'Faster: read the pairs once to build a graph. For each course b, keep an array of the courses that need it, and count how many prerequisites each course is still waiting for.',
      },
      'Start a queue with every course that waits for nothing. Each time you take a course, lower the count of every course that needs it; any course whose count reaches 0 joins the queue.',
      'You can finish exactly when the number of courses you took equals numCourses. A course that never got taken is stuck in a cycle.',
    ],
    complexity: {
      time: 'O(V + E)',
      space: 'O(V + E)',
      extra: ['O(V + E)', 'O(V·E)'],
      why: 'V is numCourses and E the number of pairs. Each pair is read once to build the graph and followed once when its course is taken. The graph stores every pair, plus one count per course.',
    },
    speed: courseSpeed,
    concepts: { python: ['graph-adjacency', 'topological-sort', 'deque'], javascript: ['graph-adjacency', 'topological-sort', 'deque'] },
    functionName: 'canFinish',
    starters: {
      python: `def canFinish(numCourses, prerequisites):
    pass
`,
      javascript: `function canFinish(numCourses, prerequisites) {

}
`,
    },
    tests: [
      { args: [2, [[1, 0]]], expected: true },
      { args: [2, [[1, 0], [0, 1]]], expected: false },
      { args: [1, []], expected: true },
      { args: [5, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3]]], expected: true },
      { args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false },
      { args: [4, [[1, 0], [3, 2], [2, 3]]], expected: false },
    ],
  },
  {
    id: 'subsets',
    title: 'Subsets',
    difficulty: 'Medium',
    topic: 'backtracking',
    statement: [
      'nums holds different integers. Return every subset of nums, including the empty one and nums itself.',
      'Keep the numbers inside each subset in the same order as they are in nums. The subsets themselves can come in any order.',
    ],
    constraints: ['nums has 1 to 10 numbers', '-10 ≤ nums[i] ≤ 10', 'All the numbers are different.'],
    hints: [
      'Each number is either left out or put in. Two choices for each of n numbers make 2ⁿ subsets.',
      'Write a helper that decides about nums[i]: try once without it, and once with it added to current. When i reaches the end, save current.',
      {
        python: 'Save a copy (current[:]), not current itself, because you keep changing current afterwards. After trying with nums[i], pop it off again so the next choice starts clean.',
        javascript: 'Save a copy ([...current]), not current itself, because you keep changing current afterwards. After trying with nums[i], pop it off again so the next choice starts clean.',
      },
    ],
    complexity: {
      time: 'O(n·2ⁿ)',
      space: 'O(n)',
      extra: ['O(n·2ⁿ)'],
      why: 'There are 2ⁿ subsets, and copying each one takes up to n steps. Besides the answer, only current and the chain of calls are kept, each at most n deep.',
    },
    concepts: { python: ['backtracking', 'recursion', 'lists'], javascript: ['backtracking', 'recursion', 'lists'] },
    functionName: 'subsets',
    starters: {
      python: `def subsets(nums):
    pass
`,
      javascript: `function subsets(nums) {

}
`,
    },
    tests: [
      { args: [[1, 2, 3]], expected: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]], unordered: true },
      { args: [[0]], expected: [[], [0]], unordered: true },
      { args: [[3, 1]], expected: [[], [3], [1], [3, 1]], unordered: true },
      { args: [[4, -1, 2]], expected: [[], [4], [-1], [2], [4, -1], [4, 2], [-1, 2], [4, -1, 2]], unordered: true },
    ],
  },
  {
    id: 'permutations',
    title: 'Permutations',
    difficulty: 'Medium',
    topic: 'backtracking',
    statement: [
      'nums holds different integers. Return every possible ordering of them (every permutation), in any order.',
    ],
    constraints: ['nums has 1 to 6 numbers', '-10 ≤ nums[i] ≤ 10', 'All the numbers are different.'],
    hints: [
      'Build one ordering a position at a time: pick any number you have not used yet, then fill the rest the same way.',
      {
        python: 'Keep current and a set of the numbers already in it. When current holds all n numbers, save a copy.',
        javascript: 'Keep current and a Set of the numbers already in it. When current holds all n numbers, save a copy.',
      },
      'After the recursive call comes back, undo your choice: take the number off current and mark it unused, so the next choice starts clean. That undo step is what backtracking means.',
    ],
    complexity: {
      time: 'O(n · n!)',
      space: 'O(n)',
      extra: ['O(n · n!)'],
      why: 'There are n! orderings (n × (n - 1) × ... × 1), and copying each one takes n steps. Besides the answer, current, the used numbers and the chain of calls are each at most n long.',
    },
    concepts: { python: ['backtracking', 'recursion', 'sets'], javascript: ['backtracking', 'recursion', 'sets'] },
    functionName: 'permute',
    starters: {
      python: `def permute(nums):
    pass
`,
      javascript: `function permute(nums) {

}
`,
    },
    tests: [
      { args: [[1, 2, 3]], expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]], unordered: true },
      { args: [[0, 1]], expected: [[0, 1], [1, 0]], unordered: true },
      { args: [[1]], expected: [[1]], unordered: true },
      { args: [[5, -2, 0]], expected: [[5, -2, 0], [5, 0, -2], [-2, 5, 0], [-2, 0, 5], [0, 5, -2], [0, -2, 5]], unordered: true },
    ],
  },
  {
    id: 'combination-sum',
    title: 'Combination Sum',
    difficulty: 'Medium',
    topic: 'backtracking',
    statement: [
      'candidates holds different positive integers. Return every combination of them that adds up to target. You may use the same number as many times as you like.',
      'Write each combination from smallest to largest, and include each one only once. The combinations themselves can come in any order.',
    ],
    constraints: ['candidates has 1 to 30 numbers', '2 ≤ candidates[i] ≤ 40', 'All the candidates are different.', '1 ≤ target ≤ 40'],
    hints: [
      'Sort candidates first. Then a combination built by picking numbers left to right comes out smallest to largest.',
      'Write a helper with a start index, current, and what is left of target. Only try candidates from start onward: going back to earlier ones would make the same combination in another order.',
      'A number can be used again, so the recursive call gets the same index i, not i + 1. Save a copy when what is left reaches 0, and stop the loop once a candidate is bigger than what is left (the rest are bigger still).',
    ],
    complexity: {
      time: 'O(n^(t/m))',
      space: 'O(t/m)',
      extra: ['O(n^(t/m))', 'O(t/m)'],
      why: 'n is the number of candidates, t the target and m the smallest candidate. A combination holds at most t / m numbers, and at each of those steps you can branch n ways. current and the chain of calls are at most t / m deep.',
    },
    concepts: { python: ['backtracking', 'recursion', 'sort-first'], javascript: ['backtracking', 'recursion', 'sort-first'] },
    functionName: 'combinationSum',
    starters: {
      python: `def combinationSum(candidates, target):
    pass
`,
      javascript: `function combinationSum(candidates, target) {

}
`,
    },
    tests: [
      { args: [[2, 3, 6, 7], 7], expected: [[2, 2, 3], [7]], unordered: true },
      { args: [[2, 3, 5], 8], expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]], unordered: true },
      { args: [[2], 1], expected: [], unordered: true },
      { args: [[7, 3, 2], 7], expected: [[2, 2, 3], [7]], unordered: true },
      { args: [[5, 10], 15], expected: [[5, 5, 5], [5, 10]], unordered: true },
    ],
  },
]
