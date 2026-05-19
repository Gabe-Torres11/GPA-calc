# Path to the Benchmark — Design Spec

**Date:** 2026-05-19
**Requestor:** Meghan (advisor/educator using the GPA calculator)
**Status:** Approved for planning

## Background

The current GPA calculator (in [index.html](../../../index.html)) projects a student's GPA based on their cumulative standing and a planned semester of courses. It then compares the projection to a **3.0 student-teaching benchmark** with a colored progress bar and a short message like *"0.15 GPA points below the 3.0 student teaching benchmark."*

Meghan's feedback:

> "Love the results. Would it be possible to add in functionality so that it also calculates what needs to happen in the current semester to reach the benchmark?"

In her words: the benchmark tells students *where they need to be* but doesn't tell them *what to do* to get there. This spec adds the actionable layer — telling them what semester GPA they need, in plain English, with multiple paths to get there.

## Goals

1. Tell students/advisors **exactly what semester GPA** is needed this term to reach (or maintain) the 3.0 benchmark.
2. Translate that number into **plain-English grade equivalents** so non-numeric users can act on it.
3. Provide **multiple paths** — specific grade combinations, credit-load adjustments — rather than a single static recommendation.
4. Handle the **impossible case** gracefully: when 3.0 can't be reached in one semester, show what's possible and what the multi-semester path looks like.
5. Handle the **already-met case**: show how much "headroom" the student has so they know what's safe to drop.

## Non-Goals

- Multi-semester forecasting beyond the immediate impossible-case fallback.
- Saving/loading plans across sessions.
- Changing the AI extraction flow or upload pipeline — this is additive to the results card only.
- Changing the benchmark value (stays hardcoded at 3.0).
- Per-course difficulty weighting or letter-grade plus-minus optimization beyond the standard 4.0 scale.

## Where it lives

A new card titled **"Path to the benchmark"** renders directly below the existing projected-results card on the **manual** tab. The upload tab reaches it via the existing "Plan next semester →" button, which switches to the manual tab with fields pre-filled. We do not duplicate the card inside the upload-results card — the manual tab is the canonical surface for semester planning.

Visibility rules:
- Appears whenever the manual results card appears AND there is at least one credit's worth of planned semester work (either entered courses or a credit-load override).
- Updates live alongside `calcManual()` — no separate compute trigger.

## Three states

The card renders one of three states based on the math. State is computed every render.

### State A — Already at or above 3.0

The student's projected GPA is ≥ 3.0. Show how much margin they have.

```
✅ You're at the benchmark.
You can score as low as a 2.40 semester GPA across your 15 planned credits and still stay at 3.0.
```

If the floor falls below 0.0, clamp the message to: *"Even a 0.0 this semester keeps you at the benchmark."*

### State B — Reachable this semester

The student needs a semester GPA between 0.0 and 4.0 inclusive to hit 3.0.

```
You need a 3.25 semester GPA to reach 3.0
— about a B+ average across your 15 credits.

Your current plan averages 2.85 — that's 0.40 short.
Bump 2 grades up by one letter to get there.
```

The "bump N grades" line only appears if there are entered courses with grades and the gap is positive.

### State C — Impossible this semester

The needed semester GPA exceeds 4.0.

```
3.0 isn't reachable this semester.
Even with straight A's (4.0 semester GPA), you'd finish at 2.92.

Forward path: this semester at 4.0, then one more semester at ≥ 3.30 to reach 3.0.
```

The forward path assumes a typical 15-credit follow-on semester unless the user adjusts (see flexibility section).

## Flexibility controls

Below the headline, two interactive controls let advisors/students explore options:

### Control 1 — Grade-combo scenarios

A collapsible section: *"Show grade combinations that hit this target →"*

Only renders in **State B**. State A has no shortfall to address; State C has no reachable combination by definition.

When expanded, shows up to 3 scenarios. Each scenario is a list of per-course grade assignments that meet (or just exceed) the target semester GPA. Scenarios are generated only when there are at least 2 entered courses with non-zero credits.

- **Scenario 1 — Steady:** every course gets the same grade (rounded up to the next letter that hits the target). If the target is 3.25 and uniform B+ (3.3) clears it, show "All B+'s."
- **Scenario 2 — Strong/weak mix:** half the courses get a grade one notch above target, half one notch below, weighted by credits so the average lands at or above target.
- **Scenario 3 — Bump current plan:** start from the grades the user has entered, then incrementally raise the lowest-grade course by one letter until the target is met. This is the "smallest change to current plan" scenario.

If a scenario can't be generated (e.g., target unreachable even at all-A's, or fewer than 2 courses), skip it silently.

### Control 2 — Credit-load override

A small inline input: *"What if you take ___ credits this semester?"* — defaults to the sum of entered course credits. Changing this value re-runs the needed-GPA math against the override instead of the entered total. Editing it does **not** modify the entered courses themselves.

Reset button next to the input restores the value to the entered-courses total.

## The math

Let:
- `Gc` = current cumulative GPA (0 if first semester)
- `Cc` = current credits earned (0 if first semester)
- `Cs` = planned semester credits (from entered courses, or the override)
- `T` = benchmark target = 3.0
- `Pc` = current quality points = `Gc × Cc` (post-replacement, if applicable)
- `Cc'` = current credits after replacement
- `Pc'` = current points after replacement

Needed semester GPA:

```
needed_sem_gpa = (T × (Cc' + Cs) − Pc') / Cs
```

State selection:
- `needed_sem_gpa <= 0` → State A; recompute `max_drop_sem_gpa` as the floor.
- `0 < needed_sem_gpa <= 4.0` → State B.
- `needed_sem_gpa > 4.0` → State C.

State A floor:
```
max_drop_sem_gpa = max(0, (T × (Cc' + Cs) − Pc') / Cs)
```
(Negative result means even 0.0 this semester keeps them at 3.0; show that case.)

State C forward path — assume a follow-on semester of 15 credits, then solve for the GPA needed in that semester given a 4.0 this term:
```
followon_needed = (T × (Cc' + Cs + 15) − Pc' − 4.0 × Cs) / 15
```
If `followon_needed > 4.0`, escalate: report "would require multiple additional semesters" without a specific number (multi-semester rolling math is out of scope).

State B "bump N grades" — compare each entered course's GPA points to the target needed per course (= `needed_sem_gpa × c_credits`). Sort courses by deficit. Count how many courses need their grade raised by ≥ 1 letter (0.3–0.4 on the GPA scale) for the weighted average to hit target. This is a heuristic, not exact — it's there to give students a tangible "two of your grades need to come up" framing.

### Plain-English grade-average buckets

| Semester GPA needed | Plain English |
|---|---|
| 3.85 – 4.00 | "near-perfect — almost straight A's" |
| 3.55 – 3.85 | "A- average" |
| 3.15 – 3.55 | "B+ average" |
| 2.85 – 3.15 | "B average" |
| 2.55 – 2.85 | "B- average" |
| 2.15 – 2.55 | "C+ average" |
| 1.85 – 2.15 | "C average" |
| 0.00 – 1.85 | "C- or lower" |

## Edge cases

- **No current GPA entered (first semester):** `Gc = 0, Cc = 0`. Needed semester GPA collapses to exactly 3.0. State B always; show *"Your first semester at 3.0 is the benchmark."* No prior-credit baseline to weigh against.
- **No planned courses entered:** card does not render.
- **Grade replacement active:** uses `Cc'` and `Pc'` (post-replacement values) consistently — the existing `calcManual()` already computes these via `basePoints` / `baseCredits`.
- **Cumulative GPA already above 4.0 or negative:** existing validation in `calcManual()` blocks the render; card never appears in invalid state.
- **Single course in semester:** scenarios collapse to "you need this one course to be a ___" — show just the headline, skip scenario 2 and 3.
- **Credit-load override = 0:** treat the same as no planned courses — hide card.

## Architectural fit

This is a single-file vanilla-JS app ([index.html](../../../index.html)). All logic lives in the existing `<script>` block. The new code adds:

1. A helper `computeBenchmarkPath(basePoints, baseCredits, semCredits, target=3.0)` that returns `{ state, neededGpa, plainEnglish, gap, scenarios, forwardPath }`.
2. A renderer `renderBenchmarkPath(result, manualCourses, creditsOverride)` that produces the card HTML.
3. A hook in `calcManual()` to call the renderer after the projected-results card renders.
4. A small piece of state for the credit-load override (defaults to `null` meaning "use entered courses total").
5. Mirror integration in `renderUploadResults()` for upload-derived results: after upload extraction, the path card appears only after the user clicks "Plan next semester →" (i.e., it lives in the manual-tab card flow). No separate upload-tab implementation needed.

Keep the helper pure (input → output) so it's testable by eye and reusable if the app gains a real test harness later.

## Visual treatment

Reuse existing CSS tokens — no new colors or radii:
- Card uses `.card` and the existing `.card-label` for the title.
- Headline uses `.metric-value` styling for the needed-GPA number, with the existing `green` / `amber` / `red` color classes based on state.
- Scenarios use `.course-row` styling for grade lists.
- Credit-load override uses `.field input` styling.
- Collapse/expand uses a plain `<details>/<summary>` element with `summary` styled to match a `.btn-ghost`.

No new dependencies, no new fonts, no new icons beyond plain unicode (✅ for State A).

## Success criteria

- Card appears live on the manual tab whenever results appear and at least one planned credit exists.
- All three states render correctly across realistic input ranges (verified manually with several test cases — e.g., 2.74 GPA / 45 credits / 15 planned credits, 2.0 GPA / 90 credits / 15 planned, 3.5 GPA / 60 credits / 12 planned).
- Credit-load override updates the needed GPA without mutating entered courses.
- Scenarios are generated only when ≥ 2 courses are entered and the target is mathematically reachable.
- Plain-English bucket maps correctly across all ranges in the table above.
- Impossible case shows a coherent forward path (one follow-on semester at a reasonable GPA, OR "multiple semesters" escalation).
- No regressions in existing projected-results, upload, or grade-replacement flows.
