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

    const work = valid.map(c => ({ ...c }));
    work.sort((a, b) => GRADE_MAP[a.grade] - GRADE_MAP[b.grade]);

    let bumps = 0;
    while (weightedAvg(work) < neededGpa - 1e-9) {
      const idx = work.findIndex(c => GRADE_ORDER.indexOf(c.grade) > 0);
      if (idx === -1) return null;
      work[idx].grade = bumpGradeOneLetter(work[idx].grade);
      bumps++;
      work.sort((a, b) => GRADE_MAP[a.grade] - GRADE_MAP[b.grade]);
    }
    return bumps;
  }

  window.BenchmarkPath = {
    GRADE_MAP,
    GRADE_ORDER,
    gradeAverageBucket,
    computeBenchmarkPath,
    countGradesToBump
  };
})();
