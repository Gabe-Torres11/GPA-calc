# Path to the Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Path to the benchmark" card that tells students what semester GPA (and what specific grade combinations) they need to reach the 3.0 student-teaching benchmark.

**Architecture:** Extract pure benchmark-math helpers into a new `benchmark-path.js` module, exposed via a `window.BenchmarkPath` namespace. Add a tiny browser-based test runner (`test-benchmark.html`) for the pure logic. Keep DOM rendering inside `index.html` since the app is single-file vanilla JS with no build step.

**Tech Stack:** Vanilla JS (ES2017+), no build tools, no dependencies. Static files served from project root. Manual browser testing.

**Spec:** [docs/superpowers/specs/2026-05-19-benchmark-path-design.md](../specs/2026-05-19-benchmark-path-design.md)

---

## File Structure

- **Create:** `benchmark-path.js` — pure helpers, exported on `window.BenchmarkPath`. No DOM. Contains:
  - `gradeAverageBucket(gpa)` → plain-English string
  - `computeBenchmarkPath({ basePoints, baseCredits, semCredits, target })` → result object with state, neededGpa, plainEnglish, forwardPath
  - `generateScenarios(courses, neededGpa)` → up to 3 scenarios
  - `countGradesToBump(courses, neededGpa)` → integer heuristic
- **Create:** `test-benchmark.html` — opens in browser, runs inline assertions against `benchmark-path.js`, writes pass/fail to the page.
- **Modify:** `index.html` — add `<script src="benchmark-path.js">` tag, add a renderer `renderBenchmarkPath(...)`, hook into `calcManual()`, add credit-load override state.

The pure helpers stay in `benchmark-path.js` because they're the only part worth testing in isolation. DOM rendering lives where it always has — inside the `<script>` block in `index.html`.

---

## Task 1: Set up the test harness

**Files:**
- Create: `test-benchmark.html`
- Create: `benchmark-path.js` (empty stub for now)

- [ ] **Step 1: Create the empty module stub**

Create `benchmark-path.js`:

```js
(function () {
  'use strict';

  const GRADE_MAP = {
    "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0
  };
  const GRADE_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

  window.BenchmarkPath = {
    GRADE_MAP,
    GRADE_ORDER
  };
})();
```

- [ ] **Step 2: Create the test runner page**

Create `test-benchmark.html`:

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Benchmark Path Tests</title>
<style>
  body { font-family: monospace; padding: 1rem; line-height: 1.5; }
  .pass { color: green; }
  .fail { color: red; font-weight: bold; }
  .group { margin: 1rem 0; }
  .group-title { font-weight: bold; margin-bottom: 0.25rem; }
  pre { background: #f4f4f4; padding: 4px 8px; margin: 2px 0; font-size: 12px; }
</style>
</head>
<body>
<h1>Benchmark Path tests</h1>
<div id="results"></div>
<script src="benchmark-path.js"></script>
<script>
const out = document.getElementById('results');
let passed = 0, failed = 0;
let currentGroup = null;

function group(name) {
  currentGroup = document.createElement('div');
  currentGroup.className = 'group';
  currentGroup.innerHTML = `<div class="group-title">${name}</div>`;
  out.appendChild(currentGroup);
}

function approxEq(a, b, eps = 0.001) {
  if (a === null && b === null) return true;
  if (a === undefined && b === undefined) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < eps;
  return a === b;
}

function assertEq(actual, expected, label) {
  const ok = approxEq(actual, expected);
  const line = document.createElement('pre');
  line.className = ok ? 'pass' : 'fail';
  line.textContent = `${ok ? 'PASS' : 'FAIL'} — ${label} — actual: ${JSON.stringify(actual)} expected: ${JSON.stringify(expected)}`;
  (currentGroup || out).appendChild(line);
  ok ? passed++ : failed++;
}

function assertTrue(cond, label) {
  assertEq(!!cond, true, label);
}

window.addEventListener('load', () => {
  runTests();
  const summary = document.createElement('h2');
  summary.textContent = `${passed} passed, ${failed} failed`;
  summary.className = failed === 0 ? 'pass' : 'fail';
  out.prepend(summary);
});

function runTests() {
  // tasks below will fill this in
}
</script>
</body>
</html>
```

- [ ] **Step 3: Open the test page in a browser and verify it loads**

Open `test-benchmark.html` in a browser. Expected: page shows "Benchmark Path tests" heading and "0 passed, 0 failed" summary (because `runTests()` is empty).

- [ ] **Step 4: Commit**

```bash
git add benchmark-path.js test-benchmark.html
git commit -m "scaffold benchmark-path module + browser test runner"
```

---

## Task 2: `gradeAverageBucket(gpa)` — plain-English buckets

**Files:**
- Modify: `benchmark-path.js`
- Modify: `test-benchmark.html` (runTests body)

- [ ] **Step 1: Write the failing tests**

Replace the body of `runTests()` in `test-benchmark.html` with:

```js
group('gradeAverageBucket');
const b = window.BenchmarkPath.gradeAverageBucket;
assertEq(b(4.0),  "near-perfect — almost straight A's", "4.0");
assertEq(b(3.9),  "near-perfect — almost straight A's", "3.9 (upper edge)");
assertEq(b(3.85), "near-perfect — almost straight A's", "3.85 (boundary, inclusive)");
assertEq(b(3.84), "A- average", "3.84 (just below)");
assertEq(b(3.7),  "A- average", "3.7");
assertEq(b(3.55), "A- average", "3.55 boundary");
assertEq(b(3.3),  "B+ average", "3.3");
assertEq(b(3.0),  "B average", "3.0 exactly");
assertEq(b(2.7),  "B- average", "2.7");
assertEq(b(2.3),  "C+ average", "2.3");
assertEq(b(2.0),  "C average", "2.0");
assertEq(b(1.5),  "C- or lower", "1.5");
assertEq(b(0.0),  "C- or lower", "0.0");
```

- [ ] **Step 2: Run the tests and verify they fail**

Reload `test-benchmark.html`. Expected: 13 failures, all saying `actual: undefined` (function not defined yet).

- [ ] **Step 3: Implement `gradeAverageBucket`**

Add this inside the IIFE in `benchmark-path.js`, before the `window.BenchmarkPath = ...` line:

```js
function gradeAverageBucket(gpa) {
  if (gpa >= 3.85) return "near-perfect — almost straight A's";
  if (gpa >= 3.55) return "A- average";
  if (gpa >= 3.15) return "B+ average";
  if (gpa >= 2.85) return "B average";
  if (gpa >= 2.55) return "B- average";
  if (gpa >= 2.15) return "C+ average";
  if (gpa >= 1.85) return "C average";
  return "C- or lower";
}
```

Update the export object:

```js
window.BenchmarkPath = {
  GRADE_MAP,
  GRADE_ORDER,
  gradeAverageBucket
};
```

- [ ] **Step 4: Run the tests and verify they pass**

Reload `test-benchmark.html`. Expected: 13 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add benchmark-path.js test-benchmark.html
git commit -m "add gradeAverageBucket plain-English mapping"
```

---

## Task 3: `computeBenchmarkPath` core — three states

**Files:**
- Modify: `benchmark-path.js`
- Modify: `test-benchmark.html` (runTests body)

- [ ] **Step 1: Write the failing tests**

Append to `runTests()` in `test-benchmark.html`:

```js
group('computeBenchmarkPath — State B (reachable)');
const cbp = window.BenchmarkPath.computeBenchmarkPath;

// 2.74 GPA, 45 credits, 15 planned credits, target 3.0
// neededSemPoints = 3.0 * 60 - 2.74 * 45 = 180 - 123.3 = 56.7
// neededSemGpa = 56.7 / 15 = 3.78
let r = cbp({ basePoints: 2.74 * 45, baseCredits: 45, semCredits: 15, target: 3.0 });
assertEq(r.state, 'B', 'state is B');
assertEq(r.neededGpa, 3.78, 'needed semester GPA');
assertEq(r.plainEnglish, "A- average", 'plain English');

group('computeBenchmarkPath — State A (already at/above)');
// 3.5 GPA, 60 credits, 15 planned credits
// neededSemPoints = 3.0 * 75 - 3.5 * 60 = 225 - 210 = 15
// neededSemGpa = 15 / 15 = 1.0 → still positive but well below current
r = cbp({ basePoints: 3.5 * 60, baseCredits: 60, semCredits: 15, target: 3.0 });
assertEq(r.state, 'A', 'state is A (already above)');
assertEq(r.maxDropGpa, 1.0, 'floor allows dropping to 1.0');

// extreme above: 4.0 GPA, 60 credits, 15 planned
// neededSemPoints = 3.0 * 75 - 4.0 * 60 = 225 - 240 = -15 → floor at 0
r = cbp({ basePoints: 4.0 * 60, baseCredits: 60, semCredits: 15, target: 3.0 });
assertEq(r.state, 'A', 'state is A (way above)');
assertEq(r.maxDropGpa, 0, 'floor clamped at 0');

group('computeBenchmarkPath — State C (impossible)');
// 2.0 GPA, 90 credits, 15 planned credits
// neededSemPoints = 3.0 * 105 - 2.0 * 90 = 315 - 180 = 135
// neededSemGpa = 135 / 15 = 9.0 → impossible
r = cbp({ basePoints: 2.0 * 90, baseCredits: 90, semCredits: 15, target: 3.0 });
assertEq(r.state, 'C', 'state is C');
assertTrue(r.neededGpa > 4.0, 'needed > 4.0');

// max projected when this semester is 4.0:
// projected = (2.0 * 90 + 4.0 * 15) / 105 = (180 + 60) / 105 = 2.286
assertEq(r.maxProjectedThisTerm, 2.286, 'max projected with 4.0 this term');

group('computeBenchmarkPath — first semester (no prior credits)');
// basePoints 0, baseCredits 0, semCredits 15
// neededSemPoints = 3.0 * 15 - 0 = 45
// neededSemGpa = 45 / 15 = 3.0
r = cbp({ basePoints: 0, baseCredits: 0, semCredits: 15, target: 3.0 });
assertEq(r.state, 'B', 'first-semester state is B');
assertEq(r.neededGpa, 3.0, 'first-semester needs exactly 3.0');
assertTrue(r.isFirstSemester, 'first-semester flag set');
```

- [ ] **Step 2: Run the tests and verify they fail**

Reload `test-benchmark.html`. Expected: new tests fail with "actual: undefined" (function not defined).

- [ ] **Step 3: Implement `computeBenchmarkPath`**

Add to `benchmark-path.js` before the export object:

```js
function round2(x) {
  return Math.round(x * 1000) / 1000;
}

function computeBenchmarkPath({ basePoints, baseCredits, semCredits, target }) {
  const totalCredits = baseCredits + semCredits;
  const isFirstSemester = baseCredits <= 0;

  const neededSemPoints = target * totalCredits - basePoints;
  const neededGpaRaw = neededSemPoints / semCredits;

  // State C: impossible this term
  if (neededGpaRaw > 4.0 + 1e-9) {
    const maxProjectedThisTerm = round2((basePoints + 4.0 * semCredits) / totalCredits);
    return {
      state: 'C',
      neededGpa: round2(neededGpaRaw),
      plainEnglish: null,
      maxProjectedThisTerm,
      isFirstSemester
    };
  }

  // State A: needed value is at or below 0 → already met with room to spare
  if (neededGpaRaw <= 0) {
    return {
      state: 'A',
      neededGpa: round2(neededGpaRaw),
      plainEnglish: null,
      maxDropGpa: 0,
      isFirstSemester
    };
  }

  // Still State A if current cumulative already meets/exceeds target,
  // but the math allows them to drop to neededGpaRaw and still stay there.
  const currentCumGpa = baseCredits > 0 ? basePoints / baseCredits : null;
  if (currentCumGpa !== null && currentCumGpa >= target) {
    return {
      state: 'A',
      neededGpa: round2(neededGpaRaw),
      plainEnglish: gradeAverageBucket(neededGpaRaw),
      maxDropGpa: round2(neededGpaRaw),
      isFirstSemester
    };
  }

  // State B: reachable this semester
  return {
    state: 'B',
    neededGpa: round2(neededGpaRaw),
    plainEnglish: gradeAverageBucket(neededGpaRaw),
    isFirstSemester
  };
}
```

Update the export:

```js
window.BenchmarkPath = {
  GRADE_MAP,
  GRADE_ORDER,
  gradeAverageBucket,
  computeBenchmarkPath
};
```

- [ ] **Step 4: Run the tests and verify they pass**

Reload `test-benchmark.html`. Expected: all tests pass (including the previous 13).

- [ ] **Step 5: Commit**

```bash
git add benchmark-path.js test-benchmark.html
git commit -m "add computeBenchmarkPath with three-state logic"
```

---

## Task 4: Forward-path math for State C

**Files:**
- Modify: `benchmark-path.js`
- Modify: `test-benchmark.html` (runTests body)

- [ ] **Step 1: Write the failing tests**

Append to `runTests()`:

```js
group('computeBenchmarkPath — State C forward path');
// 2.0 GPA, 90 credits, 15 planned, target 3.0
// After this semester at 4.0: points = 180 + 60 = 240, credits = 105
// Need another 15-credit semester at X to reach 3.0 across 120 credits total:
// 3.0 * 120 = 360 quality points → need 360 - 240 = 120 in next 15 credits → 8.0/credit → impossible
r = cbp({ basePoints: 2.0 * 90, baseCredits: 90, semCredits: 15, target: 3.0 });
assertEq(r.forwardPath.kind, 'multiple', 'gap requires multiple semesters');

// 2.7 GPA, 30 credits, 15 planned
// neededSemPoints = 3.0 * 45 - 2.7 * 30 = 135 - 81 = 54 → neededGpa = 3.6 (State B!)
// not State C — skip.

// 2.5 GPA, 30 credits, 15 planned
// neededSemPoints = 3.0 * 45 - 75 = 60 → neededGpa = 4.0 exactly (State B edge)
// 2.4 GPA, 30 credits, 15 planned
// neededSemPoints = 3.0 * 45 - 72 = 63 → neededGpa = 4.2 (State C)
// After this term at 4.0: points = 72 + 60 = 132, credits = 45
// Followon needs: (3.0 * 60 - 132) / 15 = (180 - 132) / 15 = 48 / 15 = 3.2 → reachable
r = cbp({ basePoints: 2.4 * 30, baseCredits: 30, semCredits: 15, target: 3.0 });
assertEq(r.state, 'C', 'state C confirmed');
assertEq(r.forwardPath.kind, 'one-more-semester', 'one more semester suffices');
assertEq(r.forwardPath.followonGpa, 3.2, 'followon GPA');
assertEq(r.forwardPath.followonCredits, 15, 'default followon credit load');
```

- [ ] **Step 2: Run the tests and verify they fail**

Reload `test-benchmark.html`. Expected: forward-path tests fail (forwardPath is undefined on State C result).

- [ ] **Step 3: Extend `computeBenchmarkPath` to populate forwardPath in State C**

In `benchmark-path.js`, replace the State C return block with:

```js
  if (neededGpaRaw > 4.0 + 1e-9) {
    const FOLLOWON_CREDITS = 15;
    const pointsAfterThisTerm = basePoints + 4.0 * semCredits;
    const creditsAfterThisTerm = totalCredits;
    const followonNeededPoints = target * (creditsAfterThisTerm + FOLLOWON_CREDITS) - pointsAfterThisTerm;
    const followonGpa = followonNeededPoints / FOLLOWON_CREDITS;

    let forwardPath;
    if (followonGpa <= 4.0 + 1e-9) {
      forwardPath = {
        kind: 'one-more-semester',
        followonGpa: round2(followonGpa),
        followonCredits: FOLLOWON_CREDITS
      };
    } else {
      forwardPath = { kind: 'multiple' };
    }

    const maxProjectedThisTerm = round2((basePoints + 4.0 * semCredits) / totalCredits);
    return {
      state: 'C',
      neededGpa: round2(neededGpaRaw),
      plainEnglish: null,
      maxProjectedThisTerm,
      forwardPath,
      isFirstSemester
    };
  }
```

- [ ] **Step 4: Run the tests and verify they pass**

Reload `test-benchmark.html`. Expected: all forward-path tests pass.

- [ ] **Step 5: Commit**

```bash
git add benchmark-path.js test-benchmark.html
git commit -m "add State C forward-path projection"
```

---

## Task 5: `countGradesToBump` heuristic

**Files:**
- Modify: `benchmark-path.js`
- Modify: `test-benchmark.html` (runTests body)

- [ ] **Step 1: Write the failing tests**

Append to `runTests()`:

```js
group('countGradesToBump');
const cgtb = window.BenchmarkPath.countGradesToBump;

// 4 courses, all B (3.0), 3 credits each = avg 3.0, target 3.0 → 0 to bump
assertEq(
  cgtb([{grade:'B', credits:3}, {grade:'B', credits:3}, {grade:'B', credits:3}, {grade:'B', credits:3}], 3.0),
  0,
  '4xB at target → 0 bumps'
);

// 4 courses all B (avg 3.0), target 3.25 → bump enough to clear
// Bumping one B to B+: (3 * 3.0 + 1 * 3.3) / 4 = (9 + 3.3) / 4 = 3.075 (still short)
// Bumping two B to B+: (2 * 3.0 + 2 * 3.3) / 4 = (6 + 6.6) / 4 = 3.15 (still short)
// Bumping three B to B+: (1 * 3.0 + 3 * 3.3) / 4 = 3.225 (still short)
// Bumping all four: avg 3.3 ≥ 3.25 → 4 bumps
assertEq(
  cgtb([{grade:'B', credits:3}, {grade:'B', credits:3}, {grade:'B', credits:3}, {grade:'B', credits:3}], 3.25),
  4,
  '4xB needs 4 bumps to hit 3.25'
);

// 4 courses all B, target 3.05 → 1 bump suffices
assertEq(
  cgtb([{grade:'B', credits:3}, {grade:'B', credits:3}, {grade:'B', credits:3}, {grade:'B', credits:3}], 3.05),
  1,
  '4xB needs 1 bump for 3.05'
);

// Already at A — can't bump higher; if target above current avg, return null (impossible)
assertEq(
  cgtb([{grade:'A', credits:3}, {grade:'A', credits:3}], 4.5),
  null,
  'all A and target unreachable → null'
);

// No courses
assertEq(cgtb([], 3.0), 0, 'empty list → 0');
```

- [ ] **Step 2: Run the tests and verify they fail**

Reload `test-benchmark.html`. Expected: all `countGradesToBump` tests fail.

- [ ] **Step 3: Implement `countGradesToBump`**

Add to `benchmark-path.js` before the export object:

```js
function weightedAvg(courses) {
  let pts = 0, cr = 0;
  courses.forEach(c => {
    const g = GRADE_MAP[c.grade];
    if (g === undefined) return;
    pts += g * c.credits;
    cr += c.credits;
  });
  return cr > 0 ? pts / cr : 0;
}

function bumpGradeOneLetter(grade) {
  const idx = GRADE_ORDER.indexOf(grade);
  if (idx <= 0) return grade; // already at top or unknown
  return GRADE_ORDER[idx - 1];
}

function countGradesToBump(courses, neededGpa) {
  if (!courses || courses.length === 0) return 0;
  const valid = courses.filter(c => GRADE_MAP[c.grade] !== undefined && c.credits > 0);
  if (valid.length === 0) return 0;

  if (weightedAvg(valid) >= neededGpa - 1e-9) return 0;

  // Sort by current GPA value ascending — lowest grades first benefit most from bumps
  const work = valid.map(c => ({ ...c }));
  work.sort((a, b) => GRADE_MAP[a.grade] - GRADE_MAP[b.grade]);

  let bumps = 0;
  while (weightedAvg(work) < neededGpa - 1e-9) {
    // find lowest-grade course that can still be bumped
    const idx = work.findIndex(c => GRADE_ORDER.indexOf(c.grade) > 0);
    if (idx === -1) return null; // every course is already A; target unreachable
    work[idx].grade = bumpGradeOneLetter(work[idx].grade);
    bumps++;
    // re-sort so the next bump targets the new lowest
    work.sort((a, b) => GRADE_MAP[a.grade] - GRADE_MAP[b.grade]);
  }
  return bumps;
}
```

Update the export:

```js
window.BenchmarkPath = {
  GRADE_MAP,
  GRADE_ORDER,
  gradeAverageBucket,
  computeBenchmarkPath,
  countGradesToBump
};
```

- [ ] **Step 4: Run the tests and verify they pass**

Reload `test-benchmark.html`. Expected: all 5 `countGradesToBump` tests pass.

- [ ] **Step 5: Commit**

```bash
git add benchmark-path.js test-benchmark.html
git commit -m "add countGradesToBump heuristic"
```

---

## Task 6: `generateScenarios` for State B

**Files:**
- Modify: `benchmark-path.js`
- Modify: `test-benchmark.html` (runTests body)

- [ ] **Step 1: Write the failing tests**

Append to `runTests()`:

```js
group('generateScenarios');
const gs = window.BenchmarkPath.generateScenarios;

// 4 courses, 3 credits each, target 3.25
// Steady scenario: smallest uniform grade ≥ 3.25 is B+ (3.3)
const scenarios = gs([
  {name:'Math', grade:'B', credits:3},
  {name:'English', grade:'B', credits:3},
  {name:'Bio', grade:'B-', credits:3},
  {name:'Hist', grade:'B', credits:3}
], 3.25);

assertTrue(Array.isArray(scenarios), 'returns an array');
assertTrue(scenarios.length >= 1 && scenarios.length <= 3, '1-3 scenarios');

const steady = scenarios.find(s => s.kind === 'steady');
assertTrue(!!steady, 'has steady scenario');
assertEq(steady.uniformGrade, 'B+', 'steady uniform grade is B+');
assertTrue(steady.grades.every(g => g.grade === 'B+'), 'all grades are B+');
assertEq(steady.grades.length, 4, 'one grade per course');

const bump = scenarios.find(s => s.kind === 'bump-current');
assertTrue(!!bump, 'has bump-current scenario');
assertTrue(bump.grades.length === 4, 'bump scenario has 4 grades');

// Fewer than 2 courses → no scenarios
assertEq(gs([{name:'Solo', grade:'B', credits:3}], 3.0).length, 0, '<2 courses → no scenarios');

// Empty list
assertEq(gs([], 3.0).length, 0, 'empty → no scenarios');

// Impossible target (above 4.0) → no scenarios
assertEq(gs([
  {name:'X', grade:'B', credits:3},
  {name:'Y', grade:'B', credits:3}
], 4.5).length, 0, 'unreachable target → no scenarios');
```

- [ ] **Step 2: Run the tests and verify they fail**

Reload `test-benchmark.html`. Expected: scenario tests fail.

- [ ] **Step 3: Implement `generateScenarios`**

Add to `benchmark-path.js` before the export object:

```js
function findSteadyUniformGrade(neededGpa) {
  // Walk grades from F up; return first whose value >= neededGpa
  for (let i = GRADE_ORDER.length - 1; i >= 0; i--) {
    const g = GRADE_ORDER[i];
    if (GRADE_MAP[g] >= neededGpa - 1e-9) return g;
  }
  return null;
}

function bumpScenario(courses, neededGpa) {
  const work = courses.map(c => ({ ...c }));
  if (weightedAvg(work) >= neededGpa - 1e-9) {
    return work.map(c => ({ name: c.name, grade: c.grade, credits: c.credits }));
  }
  let safety = 200;
  while (weightedAvg(work) < neededGpa - 1e-9 && safety-- > 0) {
    // sort ascending by GPA, bump the lowest
    work.sort((a, b) => GRADE_MAP[a.grade] - GRADE_MAP[b.grade]);
    const idx = work.findIndex(c => GRADE_ORDER.indexOf(c.grade) > 0);
    if (idx === -1) return null;
    work[idx].grade = bumpGradeOneLetter(work[idx].grade);
  }
  return work.map(c => ({ name: c.name, grade: c.grade, credits: c.credits }));
}

function mixedScenario(courses, neededGpa) {
  // Half above target, half at target. Sort by credits desc to bias the higher grade
  // toward higher-credit courses.
  if (courses.length < 2) return null;
  const upper = findSteadyUniformGrade(neededGpa);
  if (!upper) return null;
  const upperIdx = GRADE_ORDER.indexOf(upper);
  const lower = upperIdx + 1 < GRADE_ORDER.length ? GRADE_ORDER[upperIdx + 1] : upper;

  const sorted = [...courses].sort((a, b) => b.credits - a.credits);
  const half = Math.ceil(sorted.length / 2);

  const assignments = sorted.map((c, i) => ({
    name: c.name,
    credits: c.credits,
    grade: i < half ? upper : lower
  }));

  // If this combo doesn't actually hit the target, fall back to all-upper
  if (weightedAvg(assignments) < neededGpa - 1e-9) {
    return sorted.map(c => ({ name: c.name, grade: upper, credits: c.credits }));
  }
  return assignments;
}

function generateScenarios(courses, neededGpa) {
  if (!courses || courses.length < 2) return [];
  if (neededGpa > 4.0 + 1e-9) return [];
  const valid = courses.filter(c => GRADE_MAP[c.grade] !== undefined && c.credits > 0);
  if (valid.length < 2) return [];

  const scenarios = [];

  const uniform = findSteadyUniformGrade(neededGpa);
  if (uniform) {
    scenarios.push({
      kind: 'steady',
      label: `All ${uniform}'s`,
      uniformGrade: uniform,
      grades: valid.map(c => ({ name: c.name, grade: uniform, credits: c.credits }))
    });
  }

  const mixed = mixedScenario(valid, neededGpa);
  if (mixed) {
    scenarios.push({
      kind: 'mixed',
      label: 'Strong/weak mix',
      grades: mixed
    });
  }

  const bump = bumpScenario(valid, neededGpa);
  if (bump) {
    scenarios.push({
      kind: 'bump-current',
      label: 'Smallest bump to your current plan',
      grades: bump
    });
  }

  // Dedupe: if two scenarios produce the same grade list, keep the first.
  const seen = new Set();
  const unique = [];
  scenarios.forEach(s => {
    const key = s.grades.map(g => g.grade).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  });

  return unique.slice(0, 3);
}
```

Update the export:

```js
window.BenchmarkPath = {
  GRADE_MAP,
  GRADE_ORDER,
  gradeAverageBucket,
  computeBenchmarkPath,
  countGradesToBump,
  generateScenarios
};
```

- [ ] **Step 4: Run the tests and verify they pass**

Reload `test-benchmark.html`. Expected: scenario tests pass.

- [ ] **Step 5: Commit**

```bash
git add benchmark-path.js test-benchmark.html
git commit -m "add generateScenarios with steady/mixed/bump variants"
```

---

## Task 7: Wire `benchmark-path.js` into `index.html`

**Files:**
- Modify: `index.html` (head, just before `</body>` closing script block)

- [ ] **Step 1: Add the script tag**

In `index.html`, find the `<script>` tag that begins the inline JS (around line 417: `<script>`). Add a script reference *immediately before* it:

```html
<script src="benchmark-path.js"></script>
<script>
```

So the sequence becomes:

```html
  </div>
</div>

<script src="benchmark-path.js"></script>
<script>
const GRADE_MAP = {
  ...
```

- [ ] **Step 2: Verify the page still loads in a browser**

Open `index.html` in a browser. Expected: page renders normally; no console errors. Open DevTools console and type `BenchmarkPath` — expected output: object with `computeBenchmarkPath`, `gradeAverageBucket`, `generateScenarios`, `countGradesToBump`, `GRADE_MAP`, `GRADE_ORDER`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "include benchmark-path.js in index.html"
```

---

## Task 8: Add credit-load override state and mount point

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the override state variable**

In `index.html`, find the line declaring `let manualCourses = [...]` (around line 424). Add directly after it:

```js
let creditOverride = null; // null = use entered courses' total
```

- [ ] **Step 2: Add a mount point for the benchmark-path card**

The card will be appended to `#manual-results` dynamically from `calcManual()`. No HTML change needed yet — `#manual-results` already exists.

- [ ] **Step 3: Verify nothing broke**

Reload `index.html`. Expected: page still renders, no console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "add creditOverride state for benchmark-path"
```

---

## Task 9: Implement `renderBenchmarkPath` and hook into `calcManual`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the renderer function**

In `index.html`, find the closing `</script>` of the main inline block (near the end of the file). Just *above* the `renderManualCourses();` line that bootstraps the app, add the renderer:

```js
function renderBenchmarkPath(opts) {
  // opts: { basePoints, baseCredits, semCredits, courses, target = 3.0 }
  const target = opts.target || 3.0;
  const effectiveSemCredits = creditOverride !== null ? creditOverride : opts.semCredits;
  if (effectiveSemCredits <= 0) return '';

  const result = BenchmarkPath.computeBenchmarkPath({
    basePoints: opts.basePoints,
    baseCredits: opts.baseCredits,
    semCredits: effectiveSemCredits,
    target
  });

  const courses = opts.courses || [];
  let bodyHtml = '';

  // Headline by state
  if (result.state === 'A') {
    const floorTxt = result.maxDropGpa <= 0
      ? `Even a 0.0 this semester keeps you at ${target.toFixed(1)}.`
      : `You can score as low as a ${result.maxDropGpa.toFixed(2)} semester GPA across your ${effectiveSemCredits} planned credits and still stay at ${target.toFixed(1)}.`;
    bodyHtml = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span class="status-pill green">✅ at the benchmark</span>
      </div>
      <p style="font-size:14px;color:var(--text);">${floorTxt}</p>
    `;
  } else if (result.state === 'B') {
    const intro = result.isFirstSemester
      ? `Your first semester at <strong>${target.toFixed(1)}</strong> is the benchmark.`
      : `You need a <strong style="font-family:'DM Mono',monospace;color:var(--accent);">${result.neededGpa.toFixed(2)}</strong> semester GPA to reach ${target.toFixed(1)} — about a <strong>${result.plainEnglish}</strong> across your ${effectiveSemCredits} credits.`;

    let gapLine = '';
    if (!result.isFirstSemester && courses.length > 0) {
      const currentSem = courses.reduce((acc, c) => {
        const g = BenchmarkPath.GRADE_MAP[c.grade];
        if (g === undefined) return acc;
        acc.pts += g * c.credits;
        acc.cr += c.credits;
        return acc;
      }, { pts: 0, cr: 0 });
      if (currentSem.cr > 0) {
        const planAvg = currentSem.pts / currentSem.cr;
        const gap = result.neededGpa - planAvg;
        if (gap > 0.001) {
          const bumps = BenchmarkPath.countGradesToBump(courses, result.neededGpa);
          const bumpsLine = (bumps && bumps > 0)
            ? ` Bump ${bumps} grade${bumps === 1 ? '' : 's'} up by one letter to get there.`
            : '';
          gapLine = `<p style="font-size:13px;color:var(--text2);margin-top:8px;">Your current plan averages ${planAvg.toFixed(2)} — that's ${gap.toFixed(2)} short.${bumpsLine}</p>`;
        }
      }
    }

    // Scenarios
    let scenariosHtml = '';
    const scenarios = BenchmarkPath.generateScenarios(courses, result.neededGpa);
    if (scenarios.length > 0) {
      const items = scenarios.map(s => {
        const rows = s.grades.map(g => `
          <div class="course-row" style="margin-bottom:4px;">
            <span style="font-size:13px;color:var(--text);">${g.name || 'Course'}</span>
            <span style="font-size:13px;font-family:'DM Mono',monospace;">${g.grade}</span>
            <span style="font-size:13px;color:var(--text2);">${g.credits} cr</span>
            <span></span>
          </div>`).join('');
        return `
          <div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border);">
            <div style="font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">${s.label}</div>
            ${rows}
          </div>`;
      }).join('');
      scenariosHtml = `
        <details style="margin-top:12px;">
          <summary style="cursor:pointer;font-size:13px;color:var(--accent);font-weight:500;">Show grade combinations that hit this target →</summary>
          ${items}
        </details>`;
    }

    bodyHtml = `<p style="font-size:14px;color:var(--text);">${intro}</p>${gapLine}${scenariosHtml}`;
  } else {
    // State C
    const fp = result.forwardPath;
    let forwardTxt;
    if (fp && fp.kind === 'one-more-semester') {
      forwardTxt = `Forward path: this semester at 4.0, then one more semester at <strong>≥ ${fp.followonGpa.toFixed(2)}</strong> (assuming ~${fp.followonCredits} credits) to reach ${target.toFixed(1)}.`;
    } else {
      forwardTxt = `Reaching ${target.toFixed(1)} would require multiple additional semesters at high GPAs.`;
    }
    bodyHtml = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span class="status-pill red">not reachable this semester</span>
      </div>
      <p style="font-size:14px;color:var(--text);">${target.toFixed(1)} isn't reachable this semester. Even with straight A's (4.0 semester GPA), you'd finish at <strong style="font-family:'DM Mono',monospace;">${result.maxProjectedThisTerm.toFixed(2)}</strong>.</p>
      <p style="font-size:13px;color:var(--text2);margin-top:8px;">${forwardTxt}</p>
    `;
  }

  // Credit-load override input (shown in all states with semester courses)
  const totalEntered = courses.reduce((s, c) => s + (c.credits > 0 ? c.credits : 0), 0);
  const overrideValue = creditOverride !== null ? creditOverride : totalEntered;
  const resetVisible = creditOverride !== null && creditOverride !== totalEntered ? '' : 'display:none;';
  const overrideHtml = `
    <div style="margin-top:14px;padding-top:12px;border-top:0.5px solid var(--border);">
      <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">What if you take a different credit load this semester?</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="number" min="1" max="30" value="${overrideValue}" id="bp-credit-override" style="width:80px;padding:7px 8px;border:0.5px solid var(--border2);border-radius:6px;font-family:'DM Sans',sans-serif;font-size:13px;background:var(--bg);" oninput="creditOverride = this.value === '' ? null : +this.value; calcManual();" />
        <span style="font-size:13px;color:var(--text2);">credits</span>
        <button class="btn btn-sm btn-ghost" style="${resetVisible}" onclick="creditOverride = null; calcManual();">reset</button>
      </div>
    </div>`;

  return `
    <div class="card results-section">
      <div class="card-label">Path to the benchmark</div>
      ${bodyHtml}
      ${overrideHtml}
    </div>`;
}
```

- [ ] **Step 2: Hook the renderer into `calcManual()`**

In `index.html`, find the end of `calcManual()` — specifically the final `resultsEl.innerHTML = ...` template literal that closes around line 797. Right after that assignment, append the benchmark-path card:

```js
  // Append the benchmark-path card (only when we have planned semester credits)
  if (semCredits > 0 || (creditOverride !== null && creditOverride > 0)) {
    const cardHtml = renderBenchmarkPath({
      basePoints,
      baseCredits,
      semCredits,
      courses: manualCourses
    });
    if (cardHtml) {
      resultsEl.insertAdjacentHTML('beforeend', cardHtml);
    }
  }
```

Place this just before the closing `}` of `calcManual()`.

- [ ] **Step 3: Verify visually in a browser**

Open `index.html`, click "Enter manually". Test these cases:

1. **State B (reachable):** Set current GPA = 2.74, credits = 45. Courses default to B, B+, both 3 cr. Expected card: "You need a 3.78 semester GPA to reach 3.0 — about an A- average across your 6 credits." Gap line says "Your current plan averages 3.15 — that's 0.63 short." Click "Show grade combinations" → see steady/mixed/bump scenarios.

2. **State A (already above):** Set current GPA = 3.5, credits = 60. Expected: green pill, "You can score as low as a X.XX semester GPA across your 6 planned credits and still stay at 3.0."

3. **State C (impossible):** Set current GPA = 2.0, credits = 90. Expected: red pill, "3.0 isn't reachable this semester. Even with straight A's (4.0 semester GPA), you'd finish at 2.13." Forward path mentions multiple semesters.

4. **Credit-load override:** Change "What if you take a different credit load?" from 6 to 15. Verify the needed semester GPA recomputes. Click "reset" → returns to 6.

5. **First semester:** Clear current GPA and credits. Expected card: "Your first semester at 3.0 is the benchmark."

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "render Path to the benchmark card in calcManual"
```

---

## Task 10: End-to-end verification with the upload flow

**Files:** none (manual verification)

- [ ] **Step 1: Test the upload → plan handoff**

Open `index.html`. Upload a transcript or skip and use a known cumulative GPA. Click "Plan next semester →". Expected: switches to manual tab with GPA and credits pre-filled. The "Path to the benchmark" card appears below the projected-results card with the appropriate state.

- [ ] **Step 2: Test edge: grade replacement interaction**

On the manual tab: enter GPA 2.74, credits 45. Pick a course like "Repeating a course" → Old grade C (2.0), 3 credits. Verify the benchmark-path card reflects the post-replacement baseline (basePoints and baseCredits are reduced before being passed in).

- [ ] **Step 3: Test edge: removing all courses**

Remove every course from "This semester's courses". Expected: no benchmark-path card renders (no `manual-results` content).

- [ ] **Step 4: Test edge: invalid input**

Type negative numbers or GPA > 4.0 — existing validation hides the results card, so benchmark-path card also disappears. Verify.

- [ ] **Step 5: Run the test suite one more time**

Open `test-benchmark.html`. Expected: all tests pass.

- [ ] **Step 6: Commit any small fixes**

If verification surfaces issues, fix them in a follow-up commit referencing this task.

---

## Task 11: Final review and cleanup

**Files:**
- Modify: `README.md` (if it documents features — check first)
- Optionally remove: `test-benchmark.html` (decision below)

- [ ] **Step 1: Decide whether to keep `test-benchmark.html`**

Open `README.md`. If the project documents the file structure or has a "development" section, add a short note: *"Open `test-benchmark.html` in a browser to run the pure-helper tests."* If README doesn't reference any dev workflow, the file can stay as-is for future maintainers (or be removed — at the implementer's discretion).

- [ ] **Step 2: Visual polish check**

Open `index.html` at narrow viewport (~400 px wide). The benchmark-path card should remain readable. The credit-override input should not break layout. The scenarios `<details>` should expand correctly.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "wrap up benchmark-path: docs + polish"
```

---

## Self-review notes

**Spec coverage check:**

- ✅ State A (already at/above): Task 9 renders green pill + max-drop GPA. `computeBenchmarkPath` computes `maxDropGpa` in Task 3.
- ✅ State B (reachable): Tasks 3 + 9. Plain English from Task 2. Bump-count from Task 5.
- ✅ State C (impossible): Tasks 3 + 4 + 9. Forward path from Task 4.
- ✅ Grade-combo scenarios: Task 6.
- ✅ Credit-load override: Tasks 8 + 9.
- ✅ Math from spec: implemented in Task 3 with the exact formula.
- ✅ Plain-English buckets: Task 2.
- ✅ Edge cases (first semester, no courses, replacement, invalid input, single course): covered in Task 9 verification + State B branching in renderer.
- ✅ Manual-tab only (no duplicate card on upload tab): Task 9 hooks only `calcManual()`.
- ✅ Reuses existing CSS tokens (no new colors/fonts): renderer in Task 9 uses `.card`, `.card-label`, `.status-pill`, `.course-row`, `var(--*)`.

**Type/name consistency:** `computeBenchmarkPath` returns `{state, neededGpa, plainEnglish, maxDropGpa, maxProjectedThisTerm, forwardPath, isFirstSemester}` consistently. `forwardPath.kind` is `'one-more-semester'` or `'multiple'`. `generateScenarios` returns `{kind, label, grades, uniformGrade?}` consistently. Renderer references match.

**Open trade-off:** The `mixedScenario` heuristic puts the higher grade on higher-credit courses to bias toward hitting target; for unusual credit distributions it may fall back to the all-upper combo (deduped against the steady scenario). That's acceptable — three scenarios isn't a contract.
