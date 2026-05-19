(function () {
  'use strict';

  const GRADE_MAP = {
    "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0
  };
  const GRADE_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

  function round2(x) {
    return Math.round(x * 1000) / 1000;
  }

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

  function computeBenchmarkPath({ basePoints, baseCredits, semCredits, target }) {
    const totalCredits = baseCredits + semCredits;
    const isFirstSemester = baseCredits <= 0;

    const neededSemPoints = target * totalCredits - basePoints;
    const neededGpaRaw = neededSemPoints / semCredits;

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

    if (neededGpaRaw <= 0) {
      return {
        state: 'A',
        neededGpa: round2(neededGpaRaw),
        plainEnglish: null,
        maxDropGpa: 0,
        isFirstSemester
      };
    }

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

    return {
      state: 'B',
      neededGpa: round2(neededGpaRaw),
      plainEnglish: gradeAverageBucket(neededGpaRaw),
      isFirstSemester
    };
  }

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
    if (idx <= 0) return grade;
    return GRADE_ORDER[idx - 1];
  }

  function countGradesToBump(courses, neededGpa) {
    if (!courses || courses.length === 0) return 0;
    const valid = courses.filter(c => GRADE_MAP[c.grade] !== undefined && c.credits > 0);
    if (valid.length === 0) return 0;

    if (weightedAvg(valid) >= neededGpa - 1e-9) return 0;

    const work = valid.map((c, i) => ({ ...c, _origIdx: i, _bumped: false }));
    work.sort((a, b) => GRADE_MAP[a.grade] - GRADE_MAP[b.grade]);

    while (weightedAvg(work) < neededGpa - 1e-9) {
      const idx = work.findIndex(c => GRADE_ORDER.indexOf(c.grade) > 0);
      if (idx === -1) return null;
      work[idx].grade = bumpGradeOneLetter(work[idx].grade);
      work[idx]._bumped = true;
      work.sort((a, b) => GRADE_MAP[a.grade] - GRADE_MAP[b.grade]);
    }
    return work.filter(c => c._bumped).length;
  }

  function findSteadyUniformGrade(neededGpa) {
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
      work.sort((a, b) => GRADE_MAP[a.grade] - GRADE_MAP[b.grade]);
      const idx = work.findIndex(c => GRADE_ORDER.indexOf(c.grade) > 0);
      if (idx === -1) return null;
      work[idx].grade = bumpGradeOneLetter(work[idx].grade);
    }
    return work.map(c => ({ name: c.name, grade: c.grade, credits: c.credits }));
  }

  function mixedScenario(courses, neededGpa) {
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

  window.BenchmarkPath = {
    GRADE_MAP,
    GRADE_ORDER,
    gradeAverageBucket,
    computeBenchmarkPath,
    countGradesToBump,
    generateScenarios
  };
})();
