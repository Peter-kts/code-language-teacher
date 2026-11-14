"""Writes src/problems/edgeCases.ts: extra edge-case tests for every problem.

Each case's expected answer comes from a simple brute-force answer written here, apart from
the worked answers in src/problems/reference, so the two check each other: reference.test.ts
fails if a worked answer (in Python or JavaScript) disagrees with these.

Run from the repository root:  python3 scripts/gen-edge-cases.py
Keep every input inside the problem's constraints, and keep inputs small: slow answers must
still pass every case (only the speed test should be too big for them).
"""
import json, itertools, math, heapq
from collections import Counter, deque
from functools import lru_cache

C = {}  # id -> list of (name, args, expected, unordered)
def add(pid, name, args, exp, unordered=False):
    C.setdefault(pid, []).append((name, args, exp, unordered))

# ---------- tree helpers ----------
class T:
    def __init__(s, v): s.v, s.l, s.r = v, None, None
def build(a):
    if not a: return None
    it = iter(a); root = T(next(it)); q = deque([root])
    while q:
        n = q.popleft()
        try: x = next(it)
        except StopIteration: break
        if x is not None: n.l = T(x); q.append(n.l)
        try: x = next(it)
        except StopIteration: break
        if x is not None: n.r = T(x); q.append(n.r)
    return root
def ser(root):
    out, q = [], deque([root])
    while q:
        n = q.popleft()
        if n is None: out.append(None); continue
        out.append(n.v); q.append(n.l); q.append(n.r)
    while out and out[-1] is None: out.pop()
    return out

# ---------- warm-ups ----------
def fb(n): return ["FizzBuzz" if i%15==0 else "Fizz" if i%3==0 else "Buzz" if i%5==0 else str(i) for i in range(1,n+1)]
for nm,n in [("smallest n: 1",1),("n = 2, no Fizz yet",2),("ends on Fizz",6),("ends on Buzz",10),("two FizzBuzzes",30),("one past FizzBuzz",16)]:
    add('fizzbuzz', nm, [n], fb(n))

for nm,a in [("all the same",[2,2,2]),("max is first",[9,1,2,3]),("max is last",[1,2,3,9]),("zero beats negatives",[-3,0,-1]),
             ("smallest allowed values",[-10000,-10000]),("largest allowed value",[-10000,10000,0]),("one negative",[-7]),
             ("a longer list",[(i*37)%101-50 for i in range(60)])]:
    add('find-max', nm, [a], max(a))

def rs(a): return list(itertools.accumulate(a))
for nm,a in [("one number",[5]),("negative numbers",[-1,-2,-3]),("zeros stay flat",[0,0,0]),("adds back to zero",[3,-3,4,-4]),
             ("largest allowed values",[10**6,10**6,10**6]),("smallest allowed values",[-10**6,-10**6]),("two numbers",[1,-1])]:
    add('running-sum', nm, [a], rs(a))

for nm,a in [("two numbers the same",[3,3]),("reads the same both ways",[1,2,3,2,1]),("negatives and zero",[-1,0,-2]),
             ("duplicates",[5,5,1,1]),("a longer list",list(range(30)))]:
    add('reverse-list', nm, [a], a[::-1])

def two(a,t):
    pairs=[[i,j] for i in range(len(a)) for j in range(i+1,len(a)) if a[i]+a[j]==t]
    assert len(pairs)==1,(a,t,pairs); return pairs[0]
for nm,a,t in [("negative numbers",[-3,4,3,90],0),("negative target",[-1,-2,-3,-4,-5],-8),("two zeros",[0,4,3,0],0),
               ("answer at both ends",[1,2,3,4,10],11),("largest allowed values",[10**9,-10**9,5,7],0),
               ("a number can't be used twice",[4,1,7,2],8),("only two numbers",[-5,5],0),("duplicate that isn't the answer",[2,2,9,11],20)]:
    add('two-sum', nm, [a,t], two(a,t), True)

for nm,s,t in [("different lengths","ab","a"),("one letter, same","a","a"),("one letter, different","a","b"),("identical words","abc","abc"),
               ("same letters, different counts","aabbcc","abcabc"),("one letter off in the count","aabbcc","aabbbc"),("all the same letter","aaaa","aaaa"),
               ("same length, different letters","abcd","abce")]:
    add('valid-anagram', nm, [s,t], sorted(s)==sorted(t))

def valid(s):
    st=[]; pair={')':'(',']':'[','}':'{'}
    for ch in s:
        if ch in pair:
            if not st or st.pop()!=pair[ch]: return False
        else: st.append(ch)
    return not st
for nm,s in [("one opener","("),("one closer",")"),("closer comes first",")("),("deep nesting","(((([[{{}}]]))))"),("nested and side by side","{[()()]}"),
             ("an extra opener","(()"),("an extra closer","())"),("right count, wrong kind","([}}"),("closes only the last one","[({})](]")]:
    add('valid-parentheses', nm, [s], valid(s))

def prof(p): return max([0]+[p[j]-p[i] for i in range(len(p)) for j in range(i+1,len(p))])
for nm,p in [("one day",[5]),("flat prices",[3,3,3]),("cheapest day is last",[5,4,3,1]),("best sale is the last day",[3,2,6,1,9]),
             ("free stock",[0,6]),("largest allowed prices",[0,10000]),("two days, price drops",[2,1]),("a dip after the low",[2,10,1,5])]:
    add('best-time-stock', nm, [p], prof(p))

def mz(a): return [x for x in a if x!=0]+[0]*a.count(0)
for nm,a in [("no zeros",[1,2,3]),("all zeros",[0,0,0]),("zeros already at the end",[1,2,0,0]),("zeros at the start",[0,0,1,2]),
             ("negatives keep their order",[-1,0,-2,0,3]),("one number",[5])]:
    add('move-zeroes', nm, [a], mz(a))

def bs(a,t): return a.index(t) if t in a else -1
for nm,a,t in [("target is first",[1,3,5,7],1),("target is last",[1,3,5,7],7),("smaller than everything",[1,3,5,7],-5),("bigger than everything",[1,3,5,7],99),
               ("one number, not there",[5],3),("two numbers",[2,8],8),("negative numbers",[-9,-5,-2,-1],-5),("falls in a gap",[10,20,30,40,50],35)]:
    add('binary-search', nm, [a,t], bs(a,t))

for nm,a,b in [("both empty",[],[]),("second is empty",[1,2],[]),("first all bigger",[7,8],[1,2,3]),("take turns",[1,3,5],[2,4,6]),
               ("negative numbers",[-5,0],[-3,-1]),("equal numbers on both sides",[2,2],[2,2]),("one number each",[4],[1])]:
    add('merge-sorted', nm, [a,b], sorted(a+b))

def stairs(n):
    a,b=1,1
    for _ in range(n): a,b=b,a+b
    return a
for nm,n in [("four stairs",4),("ten stairs",10),("twenty stairs",20)]:
    add('climbing-stairs', nm, [n], stairs(n))

def msa(a): return max(sum(a[i:j]) for i in range(len(a)) for j in range(i+1,len(a)+1))
for nm,a in [("all positive: take everything",[1,2,3]),("one negative number",[-5]),("zeros and negatives",[-2,0,-1]),
             ("one positive among negatives",[-3,-4,5,-1,-2]),("best part is at the end",[-1,-2,3,4]),("smallest allowed values",[-10000,-10000]),
             ("dip worth crossing",[5,-1,5]),("dip not worth crossing",[5,-6,5])]:
    add('max-subarray', nm, [a], msa(a))

def lls(s): return max([0]+[j-i for i in range(len(s)) for j in range(i+1,len(s)+1) if len(set(s[i:j]))==j-i])
for nm,s in [("a single space"," "),("one character","x"),("repeat isn't next door","dvdf"),("two different","au"),("symbols","!@#!"),
             ("digits and letters","a1b2a1"),("repeat in the middle","tmmzuxt"),("all different","abcdefg"),("spaces count too","a b c a")]:
    add('longest-substring', nm, [s], lls(s))

def ga(ws):
    d={}
    for w in ws: d.setdefault(''.join(sorted(w)),[]).append(w)
    return list(d.values())
for nm,ws in [("no anagrams",["abc","def","ghi"]),("all anagrams",["abc","bca","cab"]),("the same word twice",["ab","ab","ba"]),
              ("several empty words",["","",""]),("one-letter words",["a","b","a"]),("same letters, different counts",["aab","aba","abb"])]:
    add('group-anagrams', nm, [ws], ga(ws), True)

for nm,a in [("two the same",[4,4]),("two different",[4,5]),("negatives and zero",[0,-1,1,-1]),("largest allowed values",[10**9,-10**9,10**9]),
             ("repeat at both ends",[9,1,2,3,9]),("zero once",[0,1,2])]:
    add('contains-duplicate', nm, [a], len(set(a))<len(a))

def pes(a):
    return [math.prod(a[:i]+a[i+1:]) for i in range(len(a))]
for nm,a in [("one zero",[1,2,0,4]),("two zeros",[0,2,0]),("all negative",[-1,-2,-3]),("all ones",[1,1,1,1]),
             ("two numbers with a zero",[0,5]),("minus ones",[-1,-1,-1,-1,-1]),("largest allowed values",[30,30,30,-30])]:
    add('product-except-self', nm, [a], pes(a))

def ma(h): return max(min(h[i],h[j])*(j-i) for i in range(len(h)) for j in range(i+1,len(h)))
for nm,h in [("heights go up",[1,2,3,4,5]),("heights go down",[5,4,3,2,1]),("all the same",[3,3,3,3]),("all zero",[0,0]),
             ("tallest at both ends",[9,1,1,1,9]),("largest allowed heights",[10000,10000]),("tall pair in the middle",[1,8,8,1])]:
    add('container-water', nm, [h], ma(h))

def ts(a):
    s=set()
    for i,j,k in itertools.combinations(range(len(a)),3):
        if a[i]+a[j]+a[k]==0: s.add(tuple(sorted((a[i],a[j],a[k]))))
    return [list(t) for t in sorted(s)]
for nm,a in [("exactly three zeros",[0,0,0]),("all positive",[1,2,3,4]),("all negative",[-1,-2,-3]),("many repeats",[-1,-1,-1,2,2,2,0,0,1,1]),
             ("only three numbers",[-5,2,3]),("largest allowed values",[100000,-100000,0,50000,-50000]),("one triple among repeats",[-4,2,2,2,2])]:
    add('three-sum', nm, [a], ts(a), True)

def msl(t,a):
    best=0
    for i in range(len(a)):
        s=0
        for j in range(i,len(a)):
            s+=a[j]
            if s>=t:
                if best==0 or j-i+1<best: best=j-i+1
                break
    return best
for nm,t,a in [("needs the whole list",6,[1,2,3]),("one number is enough",5,[1,5,1]),("one number, not enough",6,[5]),
               ("best part is at the end",8,[1,1,1,4,4]),("largest allowed target",10**9,[10000,10000]),("bigger than needed is fine",3,[1,10,1])]:
    add('min-subarray-sum', nm, [t,a], msl(t,a))

def cr(s,k):
    best=0
    for i in range(len(s)):
        for j in range(i+1,len(s)+1):
            w=s[i:j]
            if len(w)-max(Counter(w).values())<=k: best=max(best,len(w))
    return best
for nm,s,k in [("k covers the whole string","ABCD",4),("all the same letter","AAAA",0),("k = 0, letters take turns","ABABAB",0),
               ("best window is at the end","ABCDDDD",1),("one letter, k = 1","Z",1),("two letters, k = 1","AB",1),("best window in the middle","ABBBBCA",1)]:
    add('char-replacement', nm, [s,k], cr(s,k))

def dt(t): return [next((j-i for j in range(i+1,len(t)) if t[j]>t[i]),0) for i in range(len(t))]
for nm,t in [("always colder",[90,80,70]),("all the same",[50,50,50]),("warms up only at the end",[60,50,40,99]),
             ("lowest and highest allowed",[30,100,30]),("two days",[40,41])]:
    add('daily-temperatures', nm, [t], dt(t))

for nm,a,t in [("not turned at all",[1,2,3,4,5],4),("turned at the last spot",[5,1,2,3,4],5),("target is the smallest",[3,4,5,1,2],1),
               ("one number, found",[1],1),("two numbers, turned",[3,1],1),("missing from a turned list",[6,7,1,2,3],5),("negative numbers",[-1,3,-9,-5],-5)]:
    add('search-rotated', nm, [a,t], bs(a,t))

def mi(iv):
    out=[]
    for s,e in sorted(iv):
        if out and s<=out[-1][1]: out[-1][1]=max(out[-1][1],e)
        else: out.append([s,e])
    return out
for nm,iv in [("all overlap",[[1,4],[2,5],[3,6]]),("chain of touching",[[1,2],[2,3],[3,4]]),("the same interval twice",[[2,3],[2,3]]),
              ("zero-length inside another",[[1,5],[3,3]]),("starts at 0",[[0,0],[0,2]]),("no overlaps, unsorted",[[9,10],[0,1],[5,6]]),
              ("one big one covers all",[[2,3],[0,100],[50,60]])]:
    add('merge-intervals', nm, [iv], mi(iv))

def ii(iv,n): return mi(iv+[n])
for nm,iv,n in [("goes at the end",[[1,2],[3,4]],[6,7]),("goes at the start",[[3,4],[6,7]],[0,1]),("covers them all",[[1,2],[3,4],[5,6]],[0,10]),
                ("touches both neighbors",[[1,3],[5,7]],[3,5]),("fits in a gap",[[1,2],[8,9]],[4,5]),("zero-length",[[1,5]],[0,0]),
                ("ends where the next starts",[[4,6]],[1,4])]:
    add('insert-interval', nm, [iv,n], ii(iv,n))

def rob(a):
    @lru_cache(None)
    def f(i): return 0 if i>=len(a) else max(f(i+1),a[i]+f(i+2))
    return f(0)
for nm,a in [("two houses",[1,9]),("all zeros",[0,0,0,0]),("every other house",[5,1,5,1,5]),("largest allowed values",[400,400,400]),
             ("skip two in a row",[9,1,1,9]),("one big house in the middle",[1,50,1])]:
    add('house-robber', nm, [a], rob(a))

def cc(coins,amt):
    INF=float('inf'); dp=[0]+[INF]*amt
    for x in range(1,amt+1):
        for c in coins:
            if c<=x and dp[x-c]+1<dp[x]: dp[x]=dp[x-c]+1
    return -1 if dp[amt]==INF else dp[amt]
for nm,co,amt in [("amount 0 with several coins",[2,5],0),("biggest coin first is wrong",[1,5,6,9],11),("one coin is exact",[3,7],7),
                  ("a coin bigger than the amount",[2147483647],3),("only 1s",[1],12),("can't make an odd amount",[2,4,6],9),
                  ("needs many coins",[3,7],25)]:
    add('coin-change', nm, [co,amt], cc(co,amt))

# ---------- linked lists ----------
for nm,a in [("two the same",[4,4]),("negative values",[-1,-5000,5000]),("a longer list",list(range(20)))]:
    add('reverse-linked-list', nm, [a], a[::-1])
for nm,a,b in [("first empty",[],[1,2]),("one side all smaller",[1,2,3],[7,8]),("duplicates across sides",[1,1],[1,1]),
               ("negative values",[-100,-50],[-75,100]),("identical lists",[2,4],[2,4]),("one node each",[5],[3])]:
    add('merge-two-linked', nm, [a,b], sorted(a+b))
for nm,v,p in [("last node points to itself",[1,2,3],2),("last points back to the first",[1,2,3,4,5,6],0),("two nodes, no loop",[1,2],-1),
               ("repeated values, no loop",[1,1,1],-1),("loop into the middle",[1,2,3,4,5],2)]:
    add('linked-list-cycle', nm, [{"values":v,"pos":p}], p!=-1)
for nm,a,n in [("remove the head",[1,2,3],3),("remove the tail",[1,2,3],1),("remove the middle",[1,2,3],2),("two nodes, same value",[7,7],1),
               ("values at the limits",[0,100,0],2)]:
    add('remove-nth-from-end', nm, [a,n], a[:len(a)-n]+a[len(a)-n+1:])

# ---------- trees ----------
def depth(n): return 0 if not n else 1+max(depth(n.l),depth(n.r))
for nm,a in [("leans all the way left",[1,2,None,3,None,4]),("leans all the way right",[1,None,2,None,3]),("full tree",[1,2,3,4,5,6,7]),
             ("negative values",[-100,-50]),("deep on one side only",[1,2,3,None,None,4,None,5])]:
    add('max-depth', nm, [a], depth(build(a)))
def inv(n):
    if n: n.l,n.r=inv(n.r),inv(n.l)
    return n
for nm,a in [("one node",[1]),("left children only",[1,2,None,3]),("right children only",[1,None,2,None,3]),("negative values",[-1,-2,-3]),
             ("uneven tree",[1,2,3,None,4])]:
    add('invert-tree', nm, [a], ser(inv(build(a))))
def same(p,q): return (not p and not q) or (bool(p) and bool(q) and p.v==q.v and same(p.l,q.l) and same(p.r,q.r))
for nm,a,b in [("one node each, same",[1],[1]),("one node each, different",[1],[2]),("first one empty",[],[1]),
               ("same shape, one value differs",[1,2,3],[1,2,4]),("deep and identical",[1,2,None,3,None,4],[1,2,None,3,None,4]),
               ("same values, mirrored",[1,2,3],[1,3,2]),("one is longer",[1,2],[1,2,None,3])]:
    add('same-tree', nm, [a,b], same(build(a),build(b)))
def lvl(r):
    out=[]; q=[r] if r else []
    while q:
        out.append([n.v for n in q]); q=[c for n in q for c in (n.l,n.r) if c]
    return out
for nm,a in [("leans right",[1,None,2,None,3]),("full tree",[1,2,3,4,5,6,7]),("negative values",[-1,-2,-3]),("gaps on the left",[1,None,2,3,4])]:
    add('level-order', nm, [a], lvl(build(a)))
def vbst(n,lo=-math.inf,hi=math.inf): return not n or (lo<n.v<hi and vbst(n.l,lo,n.v) and vbst(n.r,n.v,hi))
for nm,a in [("equal value on the right",[1,None,1]),("smallest allowed value",[-2**31]),("largest allowed value",[2**31-1]),
             ("both limits at once",[0,-2**31,2**31-1]),("deep value breaks the root's rule",[10,5,15,None,None,6,20]),
             ("two nodes, valid",[2,1]),("right child smaller",[2,None,1]),("long valid chain",[1,None,2,None,3,None,4])]:
    add('validate-bst', nm, [a], vbst(build(a)))
def lca(r,p,q):
    while r:
        if p<r.v and q<r.v: r=r.l
        elif p>r.v and q>r.v: r=r.r
        else: return r.v
BIG=[6,2,8,0,4,7,9,None,None,3,5]
for nm,a,p,q in [("p is the root",BIG,6,3),("q is the root",BIG,0,6),("one sits under the other",BIG,4,3),("a leaf and a deeper leaf",BIG,0,5),
                 ("negative values",[-5,-10,0,-15,-7],-15,-7),("very large values",[0,-10**9,10**9],-10**9,10**9),("two nodes, right child",[1,None,2],2,1)]:
    add('lca-bst', nm, [a,p,q], lca(build(a),p,q))

# ---------- grids ----------
def ff(img,r,c,col):
    g=[row[:] for row in img]; old=g[r][c]
    if old==col: return g
    st=[(r,c)]
    while st:
        i,j=st.pop()
        if 0<=i<len(g) and 0<=j<len(g[0]) and g[i][j]==old:
            g[i][j]=col; st+= [(i+1,j),(i-1,j),(i,j+1),(i,j-1)]
    return g
for nm,img,r,c,col in [("new color is the old color",[[1,1],[1,0]],0,0,1),("corners don't connect",[[1,0],[0,1]],0,0,9),
                       ("fills the whole grid",[[3,3,3],[3,3,3]],1,2,4),("one row",[[1,1,0,1]],0,0,2),("one column",[[5],[5],[6]],2,0,7),
                       ("largest allowed color",[[0,0]],0,1,65535)]:
    add('flood-fill', nm, [img,r,c,col], ff(img,r,c,col))
def isl(g):
    g=[list(r) for r in g]; n=0
    for i in range(len(g)):
        for j in range(len(g[0])):
            if g[i][j]=="1":
                n+=1; st=[(i,j)]
                while st:
                    a,b=st.pop()
                    if 0<=a<len(g) and 0<=b<len(g[0]) and g[a][b]=="1":
                        g[a][b]="0"; st+=[(a+1,b),(a-1,b),(a,b+1),(a,b-1)]
    return n
S=lambda *rows:[list(r) for r in rows]
for nm,g in [("all water",S("000","000")),("all land",S("111","111")),("one land cell",S("1")),("one row",S("10101")),
             ("one column",S("1","1","0","1")),("a winding snake",S("11111","00001","11111","10000","11111")),("ring around a lake",S("111","101","111"))]:
    add('number-of-islands', nm, [g], isl(g))
def rot(g):
    g=[r[:] for r in g]; q=[(i,j) for i in range(len(g)) for j in range(len(g[0])) if g[i][j]==2]; t=0
    while True:
        nq=[]
        for i,j in q:
            for a,b in ((i+1,j),(i-1,j),(i,j+1),(i,j-1)):
                if 0<=a<len(g) and 0<=b<len(g[0]) and g[a][b]==1: g[a][b]=2; nq.append((a,b))
        if not nq: break
        q=nq; t+=1
    return -1 if any(1 in r for r in g) else t
for nm,g in [("no fresh oranges",[[2,0,2]]),("fresh but nothing rotten",[[1,1]]),("all rotten",[[2,2],[2,2]]),("rot spreads from both sides",[[2,1,1,1,1,1,2]]),
             ("a fresh one cut off by empty cells",[[2,1,0,1]]),("one column",[[2],[1],[1]]),("a full 10 by 10",[[2]+[1]*9]+[[1]*10 for _ in range(9)])]:
    add('rotting-oranges', nm, [g], rot(g))
def cf(n,pre):
    g=[[] for _ in range(n)]; indeg=[0]*n
    for a,b in pre: g[b].append(a); indeg[a]+=1
    q=[i for i in range(n) if indeg[i]==0]; done=0
    while q:
        x=q.pop(); done+=1
        for y in g[x]:
            indeg[y]-=1
            if indeg[y]==0: q.append(y)
    return done==n
for nm,n,pre in [("many courses, no rules",6,[]),("a course needs itself",2,[[1,1]]),("one long chain",5,[[1,0],[2,1],[3,2],[4,3]]),
                 ("a loop off to the side",5,[[1,0],[3,4],[4,3]]),("two paths meet again",4,[[1,0],[2,0],[3,1],[3,2]]),
                 ("loop through the last course",3,[[0,2],[2,1],[1,2]])]:
    add('course-schedule', nm, [n,pre], cf(n,pre))

# ---------- backtracking ----------
def subs(a): return [[a[i] for i in range(len(a)) if m>>i&1] for m in range(1<<len(a))]
for nm,a in [("one negative number",[-10]),("two numbers",[10,-10]),("four numbers",[1,2,3,4])]:
    add('subsets', nm, [a], subs(a), True)
for nm,a in [("two negative numbers",[-1,-2]),("four numbers",[1,2,3,4]),("limits of the range",[-10,10])]:
    add('permutations', nm, [a], [list(p) for p in itertools.permutations(a)], True)
def cs(c,t):
    c=sorted(c); out=[]
    def go(i,t,path):
        if t==0: out.append(path[:]); return
        for j in range(i,len(c)):
            if c[j]>t: break
            path.append(c[j]); go(j,t-c[j],path); path.pop()
    go(0,t,[]); return out
for nm,c,t in [("target is one candidate",[3,8],8),("target smaller than every candidate",[5,6],4),("one candidate, many times",[2],40),
               ("unsorted candidates",[8,2,4],8),("largest allowed numbers",[40,20],40)]:
    add('combination-sum', nm, [c,t], cs(c,t), True)

# ---------- heaps ----------
def lsw(s):
    s=sorted(s)
    while len(s)>1:
        a=s.pop(); b=s.pop()
        if a!=b: s.append(a-b); s.sort()
    return s[0] if s else 0
for nm,s in [("two different stones",[2,9]),("all equal, even count",[4,4,4,4]),("all equal, odd count",[4,4,4]),("largest allowed stones",[1000,1000,1]),
             ("smashes all the way down",[1,3,5])]:
    add('last-stone-weight', nm, [s], lsw(s))
for nm,a,k in [("k = 1 is the biggest",[4,1,9,3],1),("k = length is the smallest",[4,1,9,3],4),("all the same",[5,5,5],2),
               ("negatives and zero",[-1,0,-2],2),("limits of the range",[10000,-10000],2),("repeats count separately",[3,3,1],2)]:
    add('kth-largest', nm, [a,k], sorted(a,reverse=True)[k-1])
def tk(a,k):
    c=Counter(a).most_common(); assert k==len(c) or c[k-1][1]>c[k][1]; return [x for x,_ in c[:k]]
for nm,a,k in [("k is every value",[1,2,2,3,3,3],3),("negative values",[-3,-3,-3,-1,-2,-2],2),("a single value repeated",[7,7,7],1),
               ("limits of the range",[10000,-10000,10000],1),("winner shows up last",[1,2,3,4,4],1)]:
    add('top-k-frequent', nm, [a,k], tk(a,k), True)

# ---------- 2D DP ----------
for nm,m,n in [("one row, 100 wide",1,100),("one column, 100 tall",100,1),("two by two",2,2),("ten by ten",10,10),("long and thin",3,15)]:
    add('unique-paths', nm, [m,n], math.comb(m+n-2,m-1))
def lcs(a,b):
    @lru_cache(None)
    def f(i,j): return 0 if i==len(a) or j==len(b) else (1+f(i+1,j+1) if a[i]==b[j] else max(f(i+1,j),f(i,j+1)))
    return f(0,0)
for nm,a,b in [("one letter, different","a","b"),("one word inside the other","xaybz","ab"),("one is the other reversed","abcd","dcba"),
               ("repeated letters","aaaa","aa"),("all the letters, out of order","abc","cab"),("longer words","programming","gaming")]:
    add('longest-common-subsequence', nm, [a,b], lcs(a,b))
def ed(a,b):
    @lru_cache(None)
    def f(i,j):
        if i==len(a): return len(b)-j
        if j==len(b): return len(a)-i
        if a[i]==b[j]: return f(i+1,j+1)
        return 1+min(f(i+1,j),f(i,j+1),f(i+1,j+1))
    return f(0,0)
for nm,a,b in [("both empty","",""),("delete everything","abc",""),("one letter swapped","cat","cut"),("reversed","abc","cba"),
               ("one extra letter","abc","abxc"),("nothing in common","aaa","bbbb")]:
    add('edit-distance', nm, [a,b], ed(a,b))

# ---------- hard ----------
def trap(h): return sum(max(0,min(max(h[:i+1]),max(h[i:]))-h[i]) for i in range(len(h)))
for nm,h in [("two bars",[3,5]),("heights go down",[4,3,2,1]),("two valleys",[3,0,2,0,4]),("flat ground",[2,2,2]),("tallest allowed walls",[100000,0,100000]),
             ("all zero",[0,0,0]),("a lower right wall",[5,0,0,2])]:
    add('trapping-rain-water', nm, [h], trap(h))
def lra(h): return max(min(h[i:j])*(j-i) for i in range(len(h)) for j in range(i+1,len(h)+1))
for nm,h in [("heights go down",[5,4,3,2,1]),("one bar of 0",[0]),("all zero",[0,0,0]),("tall and thin beats wide and low",[1,1,10,1]),
             ("wide and low beats tall",[2,2,2,2,5]),("largest allowed heights",[10000,10000]),("a valley",[4,1,4])]:
    add('largest-rectangle', nm, [h], lra(h))
for nm,ls in [("only empty lists",[[],[],[]]),("one list among empties",[[],[1,2],[]]),("duplicates across lists",[[1,1],[1],[1,2]]),
              ("negative values",[[-10000,0],[-5,10000]]),("many one-node lists",[[5],[3],[4],[1],[2]])]:
    add('merge-k-sorted', nm, [ls], sorted(x for l in ls for x in l))

# ---------- sorting ----------
SORT=[("already sorted",[-3,0,2,8,9]),("reversed",[9,8,2,0,-3]),("all equal",[3,3,3]),("two numbers",[1,-1]),("limits of the range",[100000,-100000,0]),
      ("lots of repeats",[2,1,2,1,2,1])]
for pid in ['bubble-sort','selection-sort','insertion-sort','merge-sort','quick-sort']:
    for nm,a in SORT: add(pid, nm, [a], sorted(a))
for nm,a in [("all 0",[0,0,0]),("all 2",[2,2]),("already sorted",[0,1,2]),("reversed",[2,2,1,1,0,0]),("one 1",[1]),("two numbers",[1,0])]:
    add('sort-colors', nm, [a], sorted(a))

import bisect
for nm,a,t in [("before the first",[2,4,6],1),("after the last",[2,4,6],9),("between two",[2,4,6],5),("one number, target bigger",[3],5),
               ("one number, target smaller",[3],1),("negative numbers",[-8,-3,0],-4),("equal to the last",[1,2,3],3)]:
    add('search-insert', nm, [a,t], bisect.bisect_left(a,t))
def sr(a,t): return [a.index(t), len(a)-1-a[::-1].index(t)] if t in a else [-1,-1]
for nm,a,t in [("target is the first",[1,1,2,3],1),("target is the last",[1,2,3,3],3),("one number, matches",[4],4),("one number, no match",[4],5),
               ("smaller than everything",[2,3,4],1),("very large values",[-10**9,10**9,10**9],10**9),("all the same, not the target",[7,7,7],8)]:
    add('search-range', nm, [a,t], sr(a,t))
for nm,a in [("turned by one",[2,3,4,5,1]),("smallest is first after a big turn",[5,1,2,3,4]),("two numbers, not turned",[1,2]),
             ("negative numbers",[-1,0,-9,-5]),("limits of the range",[5000,-5000]),("not turned, longer",[1,2,3,4,5,6,7])]:
    add('find-min-rotated', nm, [a], min(a))
def koko(p,h):
    lo,hi=1,max(p)
    while lo<hi:
        m=(lo+hi)//2
        if sum(-(-x//m) for x in p)<=h: hi=m
        else: lo=m+1
    return lo
for nm,p,h in [("one hour per pile",[3,8,5],3),("lots of spare time",[3,8,5],100),("one pile, one hour",[7],1),("all piles the same",[4,4,4,4],8),
               ("one hour to spare",[2,2,2],4)]:
    add('koko-bananas', nm, [p,h], koko(p,h))
def mcs(c):
    a,b=0,0
    for i in range(2,len(c)+1): a,b=b,min(b+c[i-1],a+c[i-2])
    return b
for nm,c in [("all zero",[0,0,0,0]),("two equal stairs",[7,7]),("big and small take turns",[1,999,1,999,1]),("largest allowed costs",[999,999,999]),
             ("cheap at the very end",[10,10,10,0])]:
    add('min-cost-stairs', nm, [c], mcs(c))
def lis(a):
    d=[1]*len(a)
    for i in range(len(a)):
        for j in range(i):
            if a[j]<a[i]: d[i]=max(d[i],d[j]+1)
    return max(d)
for nm,a in [("always going down",[5,4,3,2,1]),("always going up",[1,2,3,4,5]),("repeats don't count",[1,1,2,2,3,3]),
             ("negative numbers",[-5,-10,-3,-1]),("two numbers, going down",[2,1]),("limits of the range",[-10000,10000])]:
    add('longest-increasing-subsequence', nm, [a], lis(a))
def wb(s,ws):
    ok=[True]+[False]*len(s)
    for i in range(1,len(s)+1):
        ok[i]=any(ok[i-len(w)] and s[i-len(w):i]==w for w in ws if len(w)<=i)
    return ok[-1]
for nm,s,ws in [("a word used many times","abababab",["ab"]),("the whole string is one word","dog",["dog","cat"]),("one letter left over","aaaab",["a","aa"]),
                ("the first split isn't the right one","cars",["car","ca","rs"]),("one letter, matches","a",["a"]),("words longer than the string","ab",["abc"])]:
    add('word-break', nm, [s,ws], wb(s,ws))
def cp(a):
    s=sum(a)
    if s%2: return False
    reach={0}
    for x in a: reach|={r+x for r in reach}
    return s//2 in reach
for nm,a in [("two different numbers",[1,2]),("odd total",[1,2,4]),("two equal numbers",[100,100]),("one big number vs many small",[1,1,1,1,4]),
             ("even total, still no split",[2,3,7]),("one large number",[100]),("many ones",[1]*10)]:
    add('partition-equal-subset', nm, [a], cp(a))

# ---------- emit ----------
def js(v): return json.dumps(v, ensure_ascii=False)
lines=['import type { TestCase } from \'./problems\'','',
'/**',
' * Edge cases for every problem, added after its main cases: the empty, smallest and largest',
' * inputs the constraints allow, repeats, negatives, answers at the very start or end, and',
' * "no answer" inputs. They run in both languages (reference.test.ts checks each worked answer',
' * passes them), and their names show on the case buttons so a failing one says what it tests.',
' * Generated by scripts/gen-edge-cases.py, which works out each expected value with a simple',
' * brute-force answer, apart from the worked answers in src/problems/reference. Edit that script, not this file.',
' */',
'export const EDGE_CASES: Record<string, TestCase[]> = {']
for pid,cases in C.items():
    lines.append(f"  '{pid}': [")
    for nm,args,exp,un in cases:
        u=', unordered: true' if un else ''
        lines.append(f"    {{ name: {js(nm)}, args: {js(args)}, expected: {js(exp)}{u} }},")
    lines.append('  ],')
lines.append('}')
open('src/problems/edgeCases.ts','w').write('\n'.join(lines)+'\n')
print(f'{len(C)} problems, {sum(len(v) for v in C.values())} edge cases')
