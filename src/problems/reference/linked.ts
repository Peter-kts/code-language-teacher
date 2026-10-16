import type { References } from './types'

// Worked answers for the linked list and tree problems (sets/linked.ts). See types.ts.
// ListNode and TreeNode are provided by the runner in both languages.

export const LINKED: References = {
  'reverse-linked-list': {
    python: `def reverseLinkedList(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev
`,
    javascript: `function reverseLinkedList(head) {
  let prev = null
  let cur = head
  while (cur) {
    const nxt = cur.next
    cur.next = prev
    prev = cur
    cur = nxt
  }
  return prev
}`,
  },
  'merge-two-linked': {
    python: `def mergeTwoLists(list1, list2):
    dummy = ListNode()
    tail = dummy
    while list1 and list2:
        if list1.val <= list2.val:
            tail.next = list1
            list1 = list1.next
        else:
            tail.next = list2
            list2 = list2.next
        tail = tail.next
    tail.next = list1 or list2
    return dummy.next
`,
    javascript: `function mergeTwoLists(list1, list2) {
  const dummy = new ListNode()
  let tail = dummy
  while (list1 && list2) {
    if (list1.val <= list2.val) {
      tail.next = list1
      list1 = list1.next
    } else {
      tail.next = list2
      list2 = list2.next
    }
    tail = tail.next
  }
  tail.next = list1 || list2
  return dummy.next
}`,
  },
  'linked-list-cycle': {
    python: `def hasCycle(head):
    slow = head
    fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
`,
    javascript: `function hasCycle(head) {
  let slow = head
  let fast = head
  while (fast && fast.next) {
    slow = slow.next
    fast = fast.next.next
    if (slow === fast) return true
  }
  return false
}`,
  },
  'remove-nth-from-end': {
    python: `def removeNthFromEnd(head, n):
    dummy = ListNode(0, head)
    front = dummy
    back = dummy
    for _ in range(n):
        front = front.next
    while front.next:
        front = front.next
        back = back.next
    back.next = back.next.next
    return dummy.next
`,
    javascript: `function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head)
  let front = dummy
  let back = dummy
  for (let i = 0; i < n; i++) front = front.next
  while (front.next) {
    front = front.next
    back = back.next
  }
  back.next = back.next.next
  return dummy.next
}`,
  },
  'max-depth': {
    python: `def maxDepth(root):
    if root is None:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))
`,
    javascript: `function maxDepth(root) {
  if (root === null) return 0
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right))
}`,
  },
  'invert-tree': {
    python: `def invertTree(root):
    if root is None:
        return None
    root.left, root.right = root.right, root.left
    invertTree(root.left)
    invertTree(root.right)
    return root
`,
    javascript: `function invertTree(root) {
  if (root === null) return null
  ;[root.left, root.right] = [root.right, root.left]
  invertTree(root.left)
  invertTree(root.right)
  return root
}`,
  },
  'same-tree': {
    python: `def isSameTree(p, q):
    if p is None and q is None:
        return True
    if p is None or q is None or p.val != q.val:
        return False
    return isSameTree(p.left, q.left) and isSameTree(p.right, q.right)
`,
    javascript: `function isSameTree(p, q) {
  if (p === null && q === null) return true
  if (p === null || q === null || p.val !== q.val) return false
  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right)
}`,
  },
  'level-order': {
    python: `from collections import deque

def levelOrder(root):
    if root is None:
        return []
    levels = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels
`,
    javascript: `function levelOrder(root) {
  if (root === null) return []
  const levels = []
  const queue = [root]
  let head = 0
  while (head < queue.length) {
    const level = []
    const end = queue.length
    while (head < end) {
      const node = queue[head]
      head++
      level.push(node.val)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
    levels.push(level)
  }
  return levels
}`,
  },
  'validate-bst': {
    python: `def isValidBST(root):
    def valid(node, low, high):
        if node is None:
            return True
        if not (low < node.val < high):
            return False
        return valid(node.left, low, node.val) and valid(node.right, node.val, high)

    return valid(root, float("-inf"), float("inf"))
`,
    javascript: `function isValidBST(root) {
  function valid(node, low, high) {
    if (node === null) return true
    if (node.val <= low || node.val >= high) return false
    return valid(node.left, low, node.val) && valid(node.right, node.val, high)
  }
  return valid(root, -Infinity, Infinity)
}`,
    slow: {
      python: `def treeMin(node):
    if node is None:
        return float("inf")
    return min(node.val, treeMin(node.left), treeMin(node.right))

def treeMax(node):
    if node is None:
        return float("-inf")
    return max(node.val, treeMax(node.left), treeMax(node.right))

def isValidBST(root):
    if root is None:
        return True
    if treeMax(root.left) >= root.val or treeMin(root.right) <= root.val:
        return False
    return isValidBST(root.left) and isValidBST(root.right)
`,
      javascript: `function treeMin(node) {
  if (node === null) return Infinity
  return Math.min(node.val, treeMin(node.left), treeMin(node.right))
}

function treeMax(node) {
  if (node === null) return -Infinity
  return Math.max(node.val, treeMax(node.left), treeMax(node.right))
}

function isValidBST(root) {
  if (root === null) return true
  if (treeMax(root.left) >= root.val || treeMin(root.right) <= root.val) return false
  return isValidBST(root.left) && isValidBST(root.right)
}`,
    },
  },
  'lca-bst': {
    python: `def lowestCommonAncestor(root, p, q):
    node = root
    while node:
        if p < node.val and q < node.val:
            node = node.left
        elif p > node.val and q > node.val:
            node = node.right
        else:
            return node.val
`,
    javascript: `function lowestCommonAncestor(root, p, q) {
  let node = root
  while (node) {
    if (p < node.val && q < node.val) node = node.left
    else if (p > node.val && q > node.val) node = node.right
    else return node.val
  }
}`,
  },
}
