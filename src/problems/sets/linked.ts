import type { Problem, SpeedTest } from '../problems'

// Linked lists and trees. Arguments and answers are written in the tests as arrays (see
// NodeIo in src/types.ts): a linked list as its values in order, a tree in LeetCode's level
// order with null gaps. The runners build the ListNode and TreeNode objects in both languages.

// LeetCode's class definitions, shown as comments above each function (the runner provides them).
const LIST_NODE = {
  python: `# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
`,
  javascript: `// class ListNode {
//   constructor(val = 0, next = null) {
//     this.val = val
//     this.next = next
//   }
// }
`,
}

const TREE_NODE = {
  python: `# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
`,
  javascript: `// class TreeNode {
//   constructor(val = 0, left = null, right = null) {
//     this.val = val
//     this.left = left
//     this.right = right
//   }
// }
`,
}

/** A tree where every node only has a right child: 1, 2, ..., n going down. Level order: [1, null, 2, null, 3, ...]. */
function rightChain(n: number): (number | null)[] {
  const out: (number | null)[] = [1]
  for (let v = 2; v <= n; v++) out.push(null, v)
  return out
}

// Long enough that checking every subtree again for each node runs out of steps, short
// enough that the recursion stays well under Python's depth limit.
const CHAIN = 600

const VALIDATE_SPEED: SpeedTest = {
  args: [rightChain(CHAIN)],
  expected: true,
  maxSteps: 20 * CHAIN,
  size: `the tree has ${CHAIN} nodes in one long line, each the right child of the one before`,
}

export const LINKED: Problem[] = [
  {
    id: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    topic: 'linked-lists',
    statement: [
      {
        python: 'Given head, the first node of a singly linked list, reverse the list and return the first node of the reversed list.',
        javascript: 'Given head, the first node of a chain of linked nodes, reverse the chain and return its new first node.',
      },
      {
        python: 'For 1 → 2 → 3 → 4 → 5 the answer is 5 → 4 → 3 → 2 → 1. An empty list (head is None) stays empty.',
        javascript: 'For 1 → 2 → 3 → 4 → 5 the answer is 5 → 4 → 3 → 2 → 1. An empty chain (head is null) stays empty.',
      },
    ],
    constraints: ['0 to 5,000 nodes', '-5,000 ≤ Node.val ≤ 5,000'],
    hints: [
      {
        python: 'Simplest: walk the list, append every value to a Python list, then build new nodes in reverse order. That is O(n) time but O(n) extra space.',
        javascript: 'Simplest: walk the nodes, push every value into an array, then build new nodes in reverse order. That is O(n) time but O(n) extra space.',
      },
      'Faster on memory: turn the arrows around as you walk. Each node should point at the node that came before it.',
      'Before changing cur.next, save it in a variable (nxt), or you lose the rest of the nodes. Then move prev to cur and cur to nxt.',
      'When cur runs off the end, prev is the old last node, which is the new first node.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'Each node is visited once, and only prev, cur and nxt are kept, however many nodes there are.' },
    io: { args: ['list'], result: 'list' },
    concepts: { python: ['linked-list', 'while', 'classes'], javascript: ['linked-list', 'while', 'classes'] },
    functionName: 'reverseLinkedList',
    starters: {
      python: `${LIST_NODE.python}
def reverseLinkedList(head):
    prev = None
    cur = head
    while cur:
        # point cur back at prev, then move prev and cur one step forward
        break
    return prev
`,
      javascript: `${LIST_NODE.javascript}
function reverseLinkedList(head) {
  let prev = null
  let cur = head
  while (cur) {
    // point cur back at prev, then move prev and cur one step forward
    break
  }
  return prev
}
`,
    },
    tests: [
      { args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { args: [[1, 2]], expected: [2, 1] },
      { args: [[7]], expected: [7] },
      { args: [[]], expected: [] },
    ],
  },
  {
    id: 'merge-two-linked',
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    topic: 'linked-lists',
    statement: [
      {
        python: 'You are given list1 and list2, the first nodes of two sorted linked lists. Merge them into one sorted list by joining their nodes together, and return its first node.',
        javascript: 'You are given list1 and list2, the first nodes of two sorted chains of linked nodes. Merge them into one sorted chain by joining their nodes together, and return its first node.',
      },
      'For 1 → 2 → 4 and 1 → 3 → 4 the answer is 1 → 1 → 2 → 3 → 4 → 4.',
    ],
    constraints: ['Each side has 0 to 50 nodes', '-100 ≤ Node.val ≤ 100', 'Both are sorted from smallest to largest.'],
    hints: [
      'Look at the first node of each side. The smaller one comes first in the answer.',
      {
        python: 'A dummy node saves you from special-casing the first node: keep a tail that starts at dummy, attach the smaller node to tail.next, and move tail forward. The answer is dummy.next.',
        javascript: 'A dummy node saves you from special-casing the first node: keep a tail that starts at dummy, attach the smaller node to tail.next, and move tail forward. The answer is dummy.next.',
      },
      {
        python: 'When one side runs out, the other is already sorted: attach all of it at once with tail.next = list1 or list2.',
        javascript: 'When one side runs out, the other is already sorted: attach all of it at once with tail.next = list1 || list2.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: 'n is the number of nodes on both sides together. Each step moves one node into place, and the nodes are reused, so only dummy and tail are extra.',
    },
    io: { args: ['list', 'list'], result: 'list' },
    concepts: { python: ['linked-list', 'dummy-node', 'while'], javascript: ['linked-list', 'dummy-node', 'while'] },
    functionName: 'mergeTwoLists',
    starters: {
      python: `${LIST_NODE.python}
def mergeTwoLists(list1, list2):
    dummy = ListNode()
    tail = dummy
    while list1 and list2:
        # attach the smaller node to tail, then move forward
        break
    # attach whatever is left
    return dummy.next
`,
      javascript: `${LIST_NODE.javascript}
function mergeTwoLists(list1, list2) {
  const dummy = new ListNode()
  let tail = dummy
  while (list1 && list2) {
    // attach the smaller node to tail, then move forward
    break
  }
  // attach whatever is left
  return dummy.next
}
`,
    },
    tests: [
      { args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { args: [[], []], expected: [] },
      { args: [[], [0]], expected: [0] },
      { args: [[5], [1, 2, 3]], expected: [1, 2, 3, 5] },
      { args: [[-3, 0, 7], [-1, 8]], expected: [-3, -1, 0, 7, 8] },
    ],
  },
  {
    id: 'linked-list-cycle',
    title: 'Linked List Cycle',
    difficulty: 'Easy',
    topic: 'linked-lists',
    statement: [
      {
        python: 'Given head, the first node of a linked list, return True if the list has a cycle: following next from some node eventually leads back to that same node. Return False if the list ends (some node.next is None).',
        javascript: 'Given head, the first node of a chain of linked nodes, return true if it has a cycle: following next from some node eventually leads back to that same node. Return false if the chain ends (some node.next is null).',
      },
      {
        python: 'The tests write each list as its values and pos, the index of the node the last node links back to (-1 for no cycle). pos is not passed to your function: it only says how the list is built. For values [3, 2, 0, -4] and pos 1, the node -4 points back at the node 2.',
        javascript: 'The tests write each chain as its values and pos, the index of the node the last node links back to (-1 for no cycle). pos is not passed to your function: it only says how the chain is built. For values [3, 2, 0, -4] and pos 1, the node -4 points back at the node 2.',
      },
    ],
    constraints: ['0 to 10⁴ nodes', '-10⁵ ≤ Node.val ≤ 10⁵', 'pos is -1 or a valid index.'],
    hints: [
      {
        python: 'Simplest: walk the list and keep a set of the nodes you have visited. If you reach one that is already in the set, there is a cycle. That is O(n) time, but O(n) extra space.',
        javascript: 'Simplest: walk the nodes and keep a Set of the nodes you have visited. If you reach one that is already in the Set, there is a cycle. That is O(n) time, but O(n) extra space.',
      },
      'Faster on memory: use two pointers. slow moves one step at a time, fast moves two.',
      'If there is no cycle, fast reaches the end. If there is one, fast laps around and lands on the same node as slow.',
      {
        python: 'Compare nodes with slow is fast, not their values: two different nodes can hold the same value.',
        javascript: 'Compare the nodes themselves with slow === fast, not their values: two different nodes can hold the same value.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: 'n is the number of nodes. Once both pointers are inside the cycle, fast gains one node on slow every step, so it catches up in fewer steps than the cycle has nodes. Only two pointers are kept.',
    },
    io: { args: ['cycle'] },
    concepts: { python: ['linked-list', 'slow-fast', 'while'], javascript: ['linked-list', 'slow-fast', 'while'] },
    functionName: 'hasCycle',
    starters: {
      python: `${LIST_NODE.python}
def hasCycle(head):
    slow = head
    fast = head
    while fast and fast.next:
        # move slow one step and fast two steps, then check if they met
        break
    return False
`,
      javascript: `${LIST_NODE.javascript}
function hasCycle(head) {
  let slow = head
  let fast = head
  while (fast && fast.next) {
    // move slow one step and fast two steps, then check if they met
    break
  }
  return false
}
`,
    },
    tests: [
      { args: [{ values: [3, 2, 0, -4], pos: 1 }], expected: true },
      { args: [{ values: [1, 2], pos: 0 }], expected: true },
      { args: [{ values: [1], pos: -1 }], expected: false },
      { args: [{ values: [1, 2, 3, 4, 5], pos: -1 }], expected: false },
      { args: [{ values: [7], pos: 0 }], expected: true },
      { args: [{ values: [], pos: -1 }], expected: false },
    ],
  },
  {
    id: 'remove-nth-from-end',
    title: 'Remove Nth Node From End of List',
    difficulty: 'Medium',
    topic: 'linked-lists',
    statement: [
      {
        python: 'Given head, the first node of a linked list, remove the n-th node from the end of the list and return its first node.',
        javascript: 'Given head, the first node of a chain of linked nodes, remove the n-th node from the end and return the first node of what is left.',
      },
      'For 1 → 2 → 3 → 4 → 5 and n = 2, the node 4 goes: 1 → 2 → 3 → 5.',
    ],
    constraints: ['1 to 30 nodes', '0 ≤ Node.val ≤ 100', '1 ≤ n ≤ the number of nodes'],
    hints: [
      'Simplest: walk once to count the nodes, then walk again to the node just before the one to remove. Two passes, still O(n).',
      'One pass: start two pointers together and move the front one n steps ahead. Then move both until the front one reaches the end. The back one is now just before the node to remove.',
      'Removing the first node is the awkward case. Start both pointers at a dummy node whose next is head, and return dummy.next at the end.',
      'To remove the node after back, skip over it: back.next = back.next.next.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'n here is the number of nodes. Each pointer walks the nodes at most once, and only two pointers and a dummy node are extra.' },
    io: { args: ['list', null], result: 'list' },
    concepts: { python: ['linked-list', 'dummy-node', 'two-pointers'], javascript: ['linked-list', 'dummy-node', 'two-pointers'] },
    functionName: 'removeNthFromEnd',
    starters: {
      python: `${LIST_NODE.python}
def removeNthFromEnd(head, n):
    pass
`,
      javascript: `${LIST_NODE.javascript}
function removeNthFromEnd(head, n) {

}
`,
    },
    tests: [
      { args: [[1, 2, 3, 4, 5], 2], expected: [1, 2, 3, 5] },
      { args: [[1], 1], expected: [] },
      { args: [[1, 2], 1], expected: [1] },
      { args: [[1, 2], 2], expected: [2] },
      { args: [[4, 8, 15, 16, 23, 42], 6], expected: [8, 15, 16, 23, 42] },
    ],
  },
  {
    id: 'max-depth',
    title: 'Maximum Depth of Binary Tree',
    difficulty: 'Easy',
    topic: 'trees',
    statement: [
      'Given root, the root of a binary tree, return its maximum depth: the number of nodes on the longest path from the root down to a leaf.',
      {
        python: 'The tests write a tree level by level, left to right, with None where a child is missing: [3, 9, 20, None, None, 15, 7] is 3 with children 9 and 20, and 20 has children 15 and 7. Its depth is 3. An empty tree has depth 0.',
        javascript: 'The tests write a tree level by level, left to right, with null where a child is missing: [3, 9, 20, null, null, 15, 7] is 3 with children 9 and 20, and 20 has children 15 and 7. Its depth is 3. An empty tree has depth 0.',
      },
    ],
    constraints: ['0 to 10⁴ nodes', '-100 ≤ Node.val ≤ 100'],
    hints: [
      "Think recursively: a tree's depth is 1 (for the root) plus the depth of its deeper side.",
      {
        python: 'The base case is an empty tree: if root is None, the depth is 0.',
        javascript: 'The base case is an empty tree: if root is null, the depth is 0.',
      },
      {
        python: 'Call maxDepth on root.left and root.right, and use max() to pick the bigger answer.',
        javascript: 'Call maxDepth on root.left and root.right, and use Math.max() to pick the bigger answer.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(h)',
      why: 'n is the number of nodes, and each is visited once. The calls waiting on each other go as deep as the tree, h: about log n for a balanced tree, up to n for one long line.',
      extra: ['O(h)'],
    },
    io: { args: ['tree'] },
    concepts: { python: ['tree-recursion', 'recursion', 'min-max-sum'], javascript: ['tree-recursion', 'recursion', 'min-max-sum'] },
    functionName: 'maxDepth',
    starters: {
      python: `${TREE_NODE.python}
def maxDepth(root):
    if root is None:
        # base case: an empty tree has depth 0
        return 0
    # ask each side for its depth, then count this node too
    pass
`,
      javascript: `${TREE_NODE.javascript}
function maxDepth(root) {
  if (root === null) {
    // base case: an empty tree has depth 0
    return 0
  }
  // ask each side for its depth, then count this node too
}
`,
    },
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: 3 },
      { args: [[1, null, 2]], expected: 2 },
      { args: [[1]], expected: 1 },
      { args: [[]], expected: 0 },
      { args: [[1, 2, 3, 4, null, null, 5, 6]], expected: 4 },
    ],
  },
  {
    id: 'invert-tree',
    title: 'Invert Binary Tree',
    difficulty: 'Easy',
    topic: 'trees',
    statement: [
      'Given root, the root of a binary tree, invert it: swap the left and right child of every node, so the tree becomes its own mirror image. Return the root.',
      {
        python: '[4, 2, 7, 1, 3, 6, 9] becomes [4, 7, 2, 9, 6, 3, 1]. Trees are written level by level, with None where a child is missing.',
        javascript: '[4, 2, 7, 1, 3, 6, 9] becomes [4, 7, 2, 9, 6, 3, 1]. Trees are written level by level, with null where a child is missing.',
      },
    ],
    constraints: ['0 to 100 nodes', '-100 ≤ Node.val ≤ 100'],
    hints: [
      'Swapping only the root\'s two children is not enough: each side has to be mirrored inside too.',
      {
        python: 'Recursively: swap root.left and root.right (root.left, root.right = root.right, root.left), then invert each side.',
        javascript: 'Recursively: swap root.left and root.right ([root.left, root.right] = [root.right, root.left]), then invert each side.',
      },
      {
        python: 'The base case is an empty tree: if root is None, there is nothing to swap.',
        javascript: 'The base case is an empty tree: if root is null, there is nothing to swap.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(h)',
      why: 'n is the number of nodes, and each one is swapped once. The recursion goes as deep as the tree\'s height h.',
      extra: ['O(h)'],
    },
    io: { args: ['tree'], result: 'tree' },
    concepts: { python: ['tree-recursion', 'recursion', 'tuples'], javascript: ['tree-recursion', 'recursion', 'destructuring'] },
    functionName: 'invertTree',
    starters: {
      python: `${TREE_NODE.python}
def invertTree(root):
    if root is None:
        return None
    # swap root's two children, then invert each side
    return root
`,
      javascript: `${TREE_NODE.javascript}
function invertTree(root) {
  if (root === null) return null
  // swap root's two children, then invert each side
  return root
}
`,
    },
    tests: [
      { args: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] },
      { args: [[2, 1, 3]], expected: [2, 3, 1] },
      { args: [[1, 2]], expected: [1, null, 2] },
      { args: [[]], expected: [] },
    ],
  },
  {
    id: 'same-tree',
    title: 'Same Tree',
    difficulty: 'Easy',
    topic: 'trees',
    statement: [
      {
        python: 'Given p and q, the roots of two binary trees, return True if they are the same: the same shape, with the same value in every matching node. Return False otherwise.',
        javascript: 'Given p and q, the roots of two binary trees, return true if they are the same: the same shape, with the same value in every matching node. Return false otherwise.',
      },
      {
        python: '[1, 2] and [1, None, 2] hold the same values, but 2 is a left child in one and a right child in the other, so they are not the same.',
        javascript: '[1, 2] and [1, null, 2] hold the same values, but 2 is a left child in one and a right child in the other, so they are not the same.',
      },
    ],
    constraints: ['Each tree has 0 to 100 nodes', '-10⁴ ≤ Node.val ≤ 10⁴'],
    hints: [
      {
        python: 'Two empty trees are the same. If only one of p and q is None, they are not.',
        javascript: 'Two empty trees are the same. If only one of p and q is null, they are not.',
      },
      'If both exist, their values must match, and then their left sides must be the same and their right sides must be the same.',
      {
        python: 'Return isSameTree(p.left, q.left) and isSameTree(p.right, q.right): and stops at the first difference.',
        javascript: 'Return isSameTree(p.left, q.left) && isSameTree(p.right, q.right): && stops at the first difference.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(h)',
      why: 'n is the number of nodes in the smaller tree: each pair of nodes is compared once. The recursion goes as deep as the tree\'s height h.',
      extra: ['O(h)'],
    },
    io: { args: ['tree', 'tree'] },
    concepts: { python: ['tree-recursion', 'recursion', 'early-return'], javascript: ['tree-recursion', 'recursion', 'early-return'] },
    functionName: 'isSameTree',
    starters: {
      python: `${TREE_NODE.python}
def isSameTree(p, q):
    if p is None and q is None:
        return True
    # is only one of them empty? do the values differ?
    # then compare the left sides and the right sides
    pass
`,
      javascript: `${TREE_NODE.javascript}
function isSameTree(p, q) {
  if (p === null && q === null) return true
  // is only one of them empty? do the values differ?
  // then compare the left sides and the right sides
}
`,
    },
    tests: [
      { args: [[1, 2, 3], [1, 2, 3]], expected: true },
      { args: [[1, 2], [1, null, 2]], expected: false },
      { args: [[1, 2, 1], [1, 1, 2]], expected: false },
      { args: [[], []], expected: true },
      { args: [[1], []], expected: false },
    ],
  },
  {
    id: 'level-order',
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'Medium',
    topic: 'trees',
    statement: [
      {
        python: 'Given root, the root of a binary tree, return its values level by level: a list for each level, from the top down, with each level read left to right.',
        javascript: 'Given root, the root of a binary tree, return its values level by level: an array for each level, from the top down, with each level read left to right.',
      },
      {
        python: 'For [3, 9, 20, None, None, 15, 7] the answer is [[3], [9, 20], [15, 7]]. An empty tree gives [].',
        javascript: 'For [3, 9, 20, null, null, 15, 7] the answer is [[3], [9, 20], [15, 7]]. An empty tree gives [].',
      },
    ],
    constraints: ['0 to 2,000 nodes', '-1,000 ≤ Node.val ≤ 1,000'],
    hints: [
      'This is breadth-first search: visit nodes in the order they were found, using a queue. Start with just the root in it.',
      {
        python: 'collections.deque is a good queue: append adds to the back, and popleft takes from the front quickly.',
        javascript: 'An array works as a queue if you keep a head index for the front instead of using shift(), which has to move every item.',
      },
      'To keep the levels apart, look at how many nodes are in the queue when a level starts. Take exactly that many, and add their children for the next level.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(n)',
      why: 'n is the number of nodes, and each one goes in and out of the queue once. The queue can hold a whole level, which is about n / 2 nodes at the bottom of a full tree.',
    },
    io: { args: ['tree'] },
    concepts: { python: ['bfs', 'deque', 'lists'], javascript: ['bfs', 'deque', 'lists'] },
    functionName: 'levelOrder',
    starters: {
      python: `${TREE_NODE.python}
def levelOrder(root):
    pass
`,
      javascript: `${TREE_NODE.javascript}
function levelOrder(root) {

}
`,
    },
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: [[3], [9, 20], [15, 7]] },
      { args: [[1]], expected: [[1]] },
      { args: [[]], expected: [] },
      { args: [[1, 2, 3, 4, null, null, 5]], expected: [[1], [2, 3], [4, 5]] },
      { args: [[1, 2, null, 3, null, 4]], expected: [[1], [2], [3], [4]] },
    ],
  },
  {
    id: 'validate-bst',
    title: 'Validate Binary Search Tree',
    difficulty: 'Medium',
    topic: 'trees',
    statement: [
      {
        python: 'Given root, the root of a binary tree, return True if it is a valid binary search tree, and False otherwise.',
        javascript: 'Given root, the root of a binary tree, return true if it is a valid binary search tree, and false otherwise.',
      },
      "In a valid binary search tree, every value in a node's left subtree is smaller than the node's value, every value in its right subtree is bigger, and both subtrees are valid binary search trees too. Equal values are not allowed.",
      {
        python: '[5, 4, 6, None, None, 3, 7] is not valid: 3 sits below 6 correctly, but it is in the right subtree of 5, so it would have to be bigger than 5.',
        javascript: '[5, 4, 6, null, null, 3, 7] is not valid: 3 sits below 6 correctly, but it is in the right subtree of 5, so it would have to be bigger than 5.',
      },
    ],
    constraints: ['1 to 10⁴ nodes', '-2³¹ ≤ Node.val ≤ 2³¹ - 1'],
    hints: [
      "Simplest: for every node, find the largest value in its left subtree and the smallest in its right subtree, and compare them with the node. That walks each subtree again for every node above it: O(n²) when the tree is one long line.",
      'Faster: walk down once, passing along the range of values the node is allowed to have.',
      {
        python: "Going left, the node's value becomes the new upper limit. Going right, it becomes the new lower limit. Start with no limits at all: float('-inf') and float('inf').",
        javascript: "Going left, the node's value becomes the new upper limit. Going right, it becomes the new lower limit. Start with no limits at all: -Infinity and Infinity.",
      },
      'A helper function with the limits as extra arguments makes this easy to write recursively.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(h)',
      why: "n is the number of nodes, and each is checked once against its range. The recursion goes as deep as the tree's height h.",
      extra: ['O(h)'],
    },
    speed: VALIDATE_SPEED,
    io: { args: ['tree'] },
    concepts: { python: ['bst', 'tree-recursion', 'recursion'], javascript: ['bst', 'tree-recursion', 'recursion'] },
    functionName: 'isValidBST',
    starters: {
      python: `${TREE_NODE.python}
def isValidBST(root):
    pass
`,
      javascript: `${TREE_NODE.javascript}
function isValidBST(root) {

}
`,
    },
    tests: [
      { args: [[2, 1, 3]], expected: true },
      { args: [[5, 1, 4, null, null, 3, 6]], expected: false },
      { args: [[5, 4, 6, null, null, 3, 7]], expected: false },
      { args: [[1, 1]], expected: false },
      { args: [[1]], expected: true },
      { args: [[8, 4, 10, 2, 6, null, 12]], expected: true },
    ],
  },
  {
    id: 'lca-bst',
    title: 'Lowest Common Ancestor of a BST',
    difficulty: 'Medium',
    topic: 'trees',
    statement: [
      'Given root, the root of a binary search tree, and two values p and q that are both in the tree, find their lowest common ancestor: the lowest node that has both p and q below it (a node counts as being below itself).',
      'LeetCode passes the nodes p and q and expects a node back. Here p and q are the values of those nodes, and you return the value of the ancestor.',
      {
        python: 'In [6, 2, 8, 0, 4, 7, 9, None, None, 3, 5], the answer for 2 and 8 is 6, and for 2 and 4 it is 2, since 2 is above 4.',
        javascript: 'In [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], the answer for 2 and 8 is 6, and for 2 and 4 it is 2, since 2 is above 4.',
      },
    ],
    constraints: ['2 to 10⁵ nodes', '-10⁹ ≤ Node.val ≤ 10⁹', 'All values are different.', 'p ≠ q, and both are in the tree.'],
    hints: [
      'Simplest: find the path from the root to p and the path to q, then take the last node the two paths share. That works for any tree, but a search tree tells you which way to go.',
      'Faster: start at the root. If p and q are both smaller than the node, the answer is on its left. If both are bigger, it is on the right.',
      'Otherwise they split here (or one of them is this node), so this node is the answer. A loop walking down is enough; no recursion needed.',
    ],
    complexity: {
      time: 'O(h)',
      space: 'O(1)',
      why: "h is the tree's height: each step goes one level down, and only the current node is kept. That is about log n for a balanced tree.",
      extra: ['O(h)'],
    },
    io: { args: ['tree', null, null] },
    concepts: { python: ['bst', 'while', 'comparisons'], javascript: ['bst', 'while', 'comparisons'] },
    functionName: 'lowestCommonAncestor',
    starters: {
      python: `${TREE_NODE.python}
def lowestCommonAncestor(root, p, q):
    pass
`,
      javascript: `${TREE_NODE.javascript}
function lowestCommonAncestor(root, p, q) {

}
`,
    },
    tests: [
      { args: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8], expected: 6 },
      { args: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4], expected: 2 },
      { args: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 3, 5], expected: 4 },
      { args: [[2, 1], 2, 1], expected: 2 },
      { args: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 7, 9], expected: 8 },
    ],
  },
]
