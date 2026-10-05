export interface TestCase {
  args: unknown[]
  expected: unknown
  /** Accept the answer in any order (e.g. a pair of indexes). */
  unordered?: boolean
}

export interface Problem {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  /** Paragraphs of the problem statement. */
  statement: string[]
  functionName: string
  starter: string
  tests: TestCase[]
}

export const TWO_SUM: Problem = {
  id: 'two-sum',
  title: 'Two Sum',
  difficulty: 'Easy',
  statement: [
    'Given a list of integers nums and an integer target, return the indexes of the two numbers that add up to target.',
    'Each input has exactly one solution, and you may not use the same element twice. Return the two indexes in any order.',
    'Hint: for each number, the partner you need is target - num. A dict that remembers numbers you have already seen can find it in one pass.',
  ],
  functionName: 'twoSum',
  starter: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        # what number would pair with num?
        pass
`,
  tests: [
    { args: [[2, 7, 11, 15], 9], expected: [0, 1], unordered: true },
    { args: [[3, 2, 4], 6], expected: [1, 2], unordered: true },
    { args: [[3, 3], 6], expected: [0, 1], unordered: true },
    { args: [[1, 5, 8, 3, 9, 2], 14], expected: [1, 4], unordered: true },
  ],
}

export const PROBLEMS: Problem[] = [TWO_SUM]
