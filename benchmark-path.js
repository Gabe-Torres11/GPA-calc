(function () {
  'use strict';

  const GRADE_MAP = {
    "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0
  };
  const GRADE_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

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

  window.BenchmarkPath = {
    GRADE_MAP,
    GRADE_ORDER,
    gradeAverageBucket
  };
})();
