# Issue-Driven Development Protocol

> **⚠️ Kanban is deprecated.** The team no longer uses a Kanban board for dispatch or coordination. **All** work — product repos, core/infra work, cross-repo admin, and one-off tasks — now flows through GitHub Issues (or direct inter-agent dispatch for ephemeral coordination). Any mention of Kanban below is retained only as historical context; treat Issues as the single dispatch mechanism.

**Status:** Active
**Scope:** All repos (<your-org>/<your-repo> and any product/infra repo)
**Replaces:** Kanban dispatch (now fully deprecated)

## Overview

All implementation work flows through GitHub Issues. Issues are the spec, the dispatch mechanism, and the audit trail. No work starts without an issue. No PR merges without referencing an issue.

## Canonical Source of Truth — the Issue BODY is the spec 

**The GitHub Issue BODY is the canonical spec (SoT).** Local spec files (e.g. `specs/*.md` in a worktree) are the DEVELOPMENT TOOL the team uses to author and iterate — they are NOT canonical. If the Issue body and a local spec file differ, **the Issue body wins.** Full stop.

**Issue COMMENTS are NOT the spec.** Comments are the DISCUSSION that leads to the spec — spec audits, reviews (the Reviewer/the Coder/the Security agent), amendments, corrections, decision trails. They are how the spec gets debated and refined; they are not the artifact of record. **A fix that lands only in a comment has NOT changed the spec.** It MUST be promoted into the Issue BODY to become canonical. An amendment posted as a comment is a proposal to edit the body, not the edit itself.

- **The promotion step is mandatory and is the most-missed step:** discussion (comment) → ratified → **edit the Issue BODY to reflect it**. If the body still says the old thing, the old thing is still the spec, no matter how many comments corrected it. Real case (an earlier decision): every anti-abuse fix this session landed as comments + a branch, but the canonical bodies (an issue/an issue) still showed the the human-rejected copy — so the spec had NOT actually been fixed; only the discussion had.
- **Bidirectional linkage is MANDATORY:** every spec file references its Issue (e.g. header `Canonical: #<n>`); every Issue body references its spec file(s). No orphans either direction.
- **Sequence for any spec change:** discuss in comments if needed → ratify → **update the Issue BODY (canonical)** → align the local file → keep cross-references intact. Files and comments are both downstream of the body.
- Do NOT invent a competing "files are canonical, merge to main" model — proposed and REJECTED at an earlier decision. Issues are SoT, the BODY specifically; files and comments serve it.

## Agent Attribution on GitHub

All agents share the same GitHub account (`<your-org>`). Every issue body and comment MUST start with an attribution line:

```
Owner: the Spec writer
Owner: the Coder
Owner: the Hub
Owner: the Tester
```

Just `Owner: <Name>` on the first line, then a blank line, then content begins. Simple, matches a common attribution pattern.

## Issue Hierarchy

```
Epic (strategic goal, lives across waves)
└── Spec Issue (shippable slice, belongs to one wave)
 └── PR (implements one spec issue)
```

### Epics

An Epic is a strategic goal that decomposes into multiple shippable slices across waves.

- Filed when a body of work is identified (by the Hub or the human)
- Contains: goal, success criteria, decomposition table, architecture notes
- Updated as slices ship (decomposition table tracks status)
- Closed when all success criteria are met (not when all slices ship — some may be deferred)
- Label: `epic`
- Title: `[Epic] <goal>`

### Spec Issues (slices)

A Spec Issue is one shippable unit of work carved from an epic (or standalone).

- Title: `[Epic #N / Wave M] <description>` (or `[Wave M] <description>` for standalone)
- References parent epic in the body
- One PR per spec issue (no multi-issue PRs)
- Filed when the wave is being planned, not before

### Relationship rules

- An epic can span multiple waves
- A spec issue belongs to exactly one wave
- A wave can contain slices from multiple epics
- Standalone spec issues (no parent epic) are fine for small work

## Roles

- **the Hub** : files specs, audits completeness, reviews PRs, manages waves
- **Builders** (the Coder + future agents): claim issues, audit specs, implement, prove work
- **the human**: approves wave plans, makes scope decisions, merges PRs

## Issue Lifecycle

```
FILED → SPEC AUDIT → IN PROGRESS → PR OPEN → REVIEW → MERGED → CLOSED
```

**PR-on-branch-creation:** the PR opens as a DRAFT the moment the branch is cut, NOT
at the end. The draft PR is the home for code-level conversation (line comments, design questions, review
notes) throughout the build — many teams run this way precisely so the discussion has a durable locus
instead of arriving all at once with the final diff. It flips to "ready for review" only when the full DoD
is met and Working Code Proof is in the body.

### 1. Filing (the Hub)

Use the repo's issue template. Every spec issue MUST have:
- **Owner** (assigned builder agent)
- **Wave** label (batch number)
- **File Scope** (explicit paths that will change)
- **Acceptance Criteria** (Gherkin or checklist)
- **Anti-patterns** (what NOT to do)
- **Rollback** plan

Quality bar: a builder should be able to implement from the issue alone, without asking clarifying questions. If the spec requires questions, it's not ready to file.

### 2. Spec Audit (Builder, FIRST action)

Before writing any code, the assigned builder posts a comment:

```markdown
## Spec Audit

- [x] All file paths verified against HEAD @ `<sha>`
- [x] Referenced APIs/components exist
- [ ] MISMATCH: `<path>` does not exist, actual location is `<path>`
- [x] Acceptance criteria are testable

### Corrections (if any)
- Line N says X, but actual state is Y. Proceeding with Y.

### Implementation Plan
1....
2....
3....

ETA: <estimate>
```

If mismatches are found, the builder posts corrections and waits for the Hub to confirm before proceeding. This prevents building against a hallucinated spec.

### 3. Implementation

Builder works on a feature branch named: `<agent>/<issue-number>-<slug>`
Example: `coder/41-script-badge`

Commits reference the issue: `feat(cron): render script badge on no_agent rows (an issue)`

**Open the DRAFT PR immediately at branch creation** (before real implementation), so the PR exists as the
conversation locus from the start:
1. Cut the branch off current `main`: `git checkout -b <agent>/<issue>-<slug> origin/main`
2. Seed it so a PR can open (a branch with zero commits ahead of base cannot): `git commit --allow-empty -m "chore(<NNN>): scaffold <slug> (#<issue>) [<Agent>]"`
3. Push and open the draft: `git push -u origin <branch>` then `gh pr create --draft --base main --title "..." --body "Closes #<issue>..."`
4. The PR body references the issue with `Closes #N` so the merge auto-closes it.

All code-level discussion happens on this draft PR while the work proceeds. Commits land on it normally.

### 4. Mark PR Ready + Working Code Proof

The draft PR (opened at branch creation, step 3) flips to ready-for-review only when the work is DoD-complete:
`gh pr ready <number>`. The PR body uses the repo template; the "Working Code Proof" section is MANDATORY:
- Test output (copy-pasted, not summarized)
- Screenshots/Playwright captures for UI work
- curl + response for API work

A draft marked ready without proof is rejected back to draft.

**Definition of Done — UNCONDITIONAL. Green CI is a self-check, NOT Done.**
- **ALL code is Done only after a Tester (the Tester/a second Tester) has tested it.** No exceptions by lane — backend, harness, scripts, glue, and UI all require an independent Tester pass. A coder's own 100%-coverage + green CI is necessary but NOT sufficient; it is a self-report, and self-reports do not close the Done gate.
- **A PR is deployment-Done only after: (a) a Tester (the Tester/a second Tester) pass — ALWAYS — AND (b) a the Designer review ONLY IF the PR carries a UI/UX component or a user-facing surface/contract it owns.** the Designer is the design/UX-fidelity gate, NOT a second technical-QA pass. When the code has no surface for that authority to rule on — shell/build/harness scripts, internal glue, pure backend logic with no user-facing contract — she is NOT dispatched; the Tester alone is the complete QA gate. Routing the Designer onto surfaceless code duplicates the Tester's technical review and burns tokens for nothing.
- For a UI feature the same DoD reads concretely: self-test → browser-verify → the Tester QA → the Designer sign-off. The general rule above is the parent; the UI chain is one instance of it.
- **the Hub must never offer a PR as "merge-ready" on green CI alone.** Green CI → route to Tester (and to the Designer ONLY when the PR has a UI/UX surface it owns) → only then is merge a live option for the human.

### 5. Review + Merge

**Merge is gated on Done. Done is ALWAYS a Tester pass, PLUS a the Designer review when — and only when — the PR carries a UI/UX component or user-facing surface it owns.** Before a PR is presented to the human as merge-ready it MUST have: (a) an independent Tester (the Tester/a second Tester) pass; and (b) the Designer's review IF it has a UI/UX surface. Surfaceless code — scripts, harness/build tooling, internal glue, pure backend with no user-facing contract — is Done on the Tester pass alone; do NOT route it to the Designer (that duplicates technical QA). A PR with any user-facing surface still requires both. Never treat green CI as merge-ready: green CI + coder self-coverage is a self-check, not Done. The Hub routes green PRs to the Tester first (and to the Designer only when a surface exists); only after the required gate(s) clear does he surface the merge decision to the human.

The operator reviews and merges. PR closes the issue automatically via `Closes #N`.

**Pre-merge intent comment (MANDATORY —).** Before ANY merge of a PR to `main`, whoever runs the merge MUST first post a PR comment that reads exactly:

```
Merging to main [AgentName]
```

(e.g. `Merging to main [the Hub]`). The comment goes on the PR, then the merge command runs. This is non-negotiable and binds everyone — the Hub included.

**Why:** every agent commits and merges under the single shared GitHub account (`<your-org>`), so GitHub's own merge attribution (`mergedBy`) is useless for telling who actually ran it. When an unexplained merge to main appears, there is no way to trace which agent (or which session) did it. The intent comment is the ONLY durable, human-readable record of *who chose to merge and when* — it makes the actor accountable where the platform cannot. Real case: a PR merged to main with no operator intent; `mergedBy` showed only the shared account, agent logs couldn't cheaply attribute it, and the human had to ask "who merged this?" with no answer available. The comment closes that gap permanently.

**Rules:**
- The comment is posted BEFORE the merge command, not after — it records intent to merge, and survives even if the merge then fails.
- Exact format: `Merging to main [AgentName]` with the agent's real name in brackets. No variations, so it's greppable across PRs.
- Applies to every merge path: `gh pr merge`, the GitHub web UI, or any script. If you are about to put a commit on `main`, the comment goes first.
- Merge authority is unchanged: the human authorizes merges. An agent merges only on the human's explicit say-so for that PR, and still posts the intent comment naming itself as the actor.
- A merge to main with no preceding `Merging to main [AgentName]` comment is a process violation — surface it, find the actor, and reinforce the rule.

## Wave System

A **wave** is a batch of related issues that ship together.

### Rules

1. All issues in a wave are filed before work starts
2. Builders work in parallel on different issues within the same wave
3. A wave is "closed" when all its issues are merged or explicitly deferred
4. The next wave cannot start until the current wave closes (exceptions: hotfix bugs)
5. Each wave has a tracking comment or project board column showing progress

### Numbering

Waves are sequential integers: Wave 1, Wave 2, etc.
Labels: `wave:1`, `wave:2`, etc.

### Wave Planning

The Hub decomposes a body of work into waves during planning. Each wave should:
- Be completable in 1-3 days of parallel work
- Have clear boundaries (no cross-wave dependencies within the wave)
- Be shippable independently (wave N doesn't break without wave N+1)

## Pipelined Wave Flow

**The bottleneck is the Coder (one coder).** Pipeline around him: while the Coder builds feature N, the
spec/design/review chain works feature N+1 in parallel. This is safe — and the reason it's safe is an
asymmetry: **spec rework is cheap, code rework is expensive.** Run the cheap-to-redo work ahead; keep the
expensive-to-redo work single-threaded on landed main.

### The cycle
```
The Coder builds N ───────────────► full DoD ──► PR ──► MERGE to main
 │ (in parallel, no code branch yet) │
 └─► the Spec writer specs N+1 (issue) │
 The Designer designs N+1 (her design worktree) │
 The Reviewer reviews the spec ▼
 The Coder's spec-review slots into N's QA dead-time
 cut coder/<N+1> off the NOW-current main ──► build N+1
```

### Hard rules
1. **One CODE branch in flight at a time.** Spec-ahead is allowed precisely because a spec/design is NOT a
 code branch. Do NOT cut feature N+1's code branch until feature N merges — building on a base that's
 about to move is the exact stranding that broke an earlier decision/a feature (foundation hadn't landed yet).
2. **Spec exactly ONE feature ahead, never two.** Spec inventory that sits goes stale. "Velocity != value."
3. **the Coder's review fits N's dead-time.** the Coder is in the pipeline twice (coder on N, required reviewer on
 N+1's spec). His spec-review slots into the QA/verify window when the Coder-the-builder is idle (waiting on
 The Tester + the Designer) — do NOT fragment his build focus mid-N.
4. **Pick N+1 to be NON-OVERLAPPING with N's file footprint.** Before choosing the next feature, diff N's
 branch against main (`git diff --name-only origin/main...<branch>`) and pick a feature whose files are
 disjoint. If the cleanest-value feature overlaps, defer it and come back on a clean main — do NOT cut a
 colliding branch in parallel. (Bonus: also avoid features that entangle a deferred decision's change
 class, e.g. agent-name-leak surfaces while an earlier decision is pending.)

 **WHY non-overlap is the root requirement :** the spec/design chain specs against the
 code that's on main *right now*. For a non-overlapping feature that foundation is **STATIC** — N never
 touches those files, so the Spec writer's spec + the Designer's design written today stay valid against post-N main, zero
 rework. For an overlapping feature the foundation **MOVES** — the Coder is concurrently rewriting the very
 files being specced against, so the instant N merges the spec references code that no longer exists. The
 spec goes stale *before a line of N+1 is written.* This is the an earlier decision/a feature stranding bug at SPEC time, not
 build time. The merge-conflict avoidance is just the downstream symptom; the real win is a frozen
 foundation for the parallel spec work.
5. **Rebase N+1 onto post-N main** the moment N merges, before building. Verify the foundation N+1 reads
 actually exists on the new main (this is the builder's spec-audit, the FIRST action — already mandated).
6. **"Tested and verified" for a UI feature = the FULL DoD**, not just green units: the Coder self-test →
 browser-verify → the Tester adversarial QA → the Designer pixel sign-off. "Done" only after ALL.

### the Hub's standing ownership
Enforce rule 1 (don't dispatch a build whose foundation isn't merged) and rule 4 (verify file-footprint
disjointness before greenlighting the parallel spec). Naming the next feature is a routing call the Hub
makes without escalation; only genuine scope/product calls go to the human.

## Revision Counting & the Pause-and-Review Ceiling

**Not all "revisions" are iteration.** A spec revised N times because it sat on a **misaligned foundation** (a proxy fixture, a phantom dataset, wrong source data) is NOT N iterations — it is ONE unresolved root cause manifesting repeatedly. Going to the canonical source and locking the real foundation effectively **resets the count**: genuine spec iteration only begins once everyone works from the same verified data.

- **Collapse same-root revisions to 1.** a feature was "revised 13 times," but all 13 traced to the single misalignment of design/spec/build each validating against a different hand-authored fixture. That is 1 root cause, not 13 loops. After the canonical-snapshot fix, only the genuine iterations count — which was ~2.
- **Count real iterations only.** A revision that addresses a NEW, verified defect against a LOCKED foundation is a real iteration. Count those.

**The ceiling (hard rule):** when GENUINE revisions hit a bright-line cap, that is looping, and looping MUST trigger a **mandatory pause-and-review** — not another fix. The pause is not "keep iterating"; it is "STOP, re-found the approach, question whether the spec/process itself is broken." For a feature, set the ceiling at a concrete number (e.g. 16 total revisions) as the tripwire. For future work the principle holds: set a bright-line revision ceiling and honor it.

**Why the bright line is non-negotiable:** the hub (the Hub) will ALWAYS be able to justify "one more verified fix" — and each individual catch may genuinely be real. But per-revision local justification **cannot detect a global loop**. The ceiling exists precisely because "each fix was justified" stays true right up until the process is visibly broken. When the count hits the cap, the hub does not get to argue the next fix is fine. It pauses.

## Comment Structure

### Builder status update (mid-flight):
```markdown
## Status — <timestamp>

**Progress:** 3/5 acceptance criteria passing
**Blocker:** <description, if any>
**ETA:** <revised if needed>
```

### Builder handoff (work complete):
```markdown
## Complete — <timestamp>

**PR:** #<number>
**All acceptance criteria:** PASS
**Tests:** <count> pass / <count> fail
**Coverage:** <percentage if applicable>
**Working Code Proof:** in PR body
```

## Bug Handling

Bugs bypass the wave system. They are:
1. Filed with the bug template
2. Triaged by the Hub (severity + owner)
3. Fixed in a single PR (max +50 LOC)
4. If larger than +50 LOC, promoted to a spec issue in the next wave

## No Broken Windows — Prod Bugs Preempt Features

**Everything that reaches production must work. If a bug is found in prod, fixing it takes priority over new features.** A known-broken production surface is a broken window: left unfixed it signals that "shipped but wrong" is acceptable, and quality erodes from there.

**The ratchet — the core invariant this whole rule serves:** Every merge to main must leave production **as correct as, or more correct than, the prior merge to main.** Correctness only ratchets up, never down. This is the Boy Scout rule: leave the forest in as good a condition or better than you found it.
- **Blame-agnostic.** It does not matter when the window was broken or who broke it. If you're touching a surface and you can see a defect, it gets fixed (or filed + sequenced) — "it was already broken before my change" is NOT a pass. Pre-existing ≠ acceptable.
- **A merge that exposes a latent defect owns surfacing it.** Real case: a PR made a live status view honest (live data) while adjacent hardcoded panels still showed a fake stalled agent — the contradiction was pre-existing but newly *visible* because of an issue. Under the ratchet, an issue doesn't get blocked for exposing it (the merge is still net-more-correct), but the exposed defect gets filed (an issue) and fixed, not waved off as "not my regression."
- **Test:** before any merge, ask "is prod strictly more correct after this than before?" If yes → merge. If it introduces ANY new wrongness → it does not merge until fixed, even if it also fixes other things. Net-positive is necessary but a *new* broken window in the same merge fails the ratchet.

**Commit granularity within a multi-issue branch:** There is NO "one branch per issue" rule — a single branch/PR may fix multiple issues, and SHOULD when they share a file footprint (the only hard constraint is file-collision non-overlap with other in-flight branches, per single-coder discipline). BUT each issue/bug fixed on that branch gets **at least one discrete, issue-tagged commit** (e.g. `fix(live): name unreachable+unknown in legend (an issue) [the Coder]` and a separate `fix(live): mark fixture panels as demo data (an issue) [the Coder]`). Never collapse multiple issues into one mixed commit — history must map fix→issue so each bug's change is independently reviewable, revertable, and traceable. One branch, many issues, but commits stay per-issue.

Hard rules:
1. **Prod bug > new feature.** When a production defect is confirmed, it preempts the current/next feature slot. Do not start or continue feature work that would leave a known prod bug standing, unless the human explicitly defers the bug.
2. **"In production" means trusted.** the human expects to act on what prod shows him. A surface that misreports state (e.g. a monitoring dashboard showing false status) is HIGH severity even with no data-loss/security impact — it corrupts decisions. Severity is judged by *trust damage*, not just blast radius.
3. **Triage immediately, file the issue, sequence to the front.** the Hub triages on discovery (severity + owner), files the bug issue, and slots it ahead of feature work. The single-code-branch rule still holds — land or pause in-flight feature work cleanly; do not open a colliding branch.
4. **Root-cause, don't paper over.** Fix the actual cause (and any paired upstream/infra root), not just the visible symptom. A symptom-only patch that leaves the root is not "fixed."
5. **Verify against ground truth before declaring fixed.** Working Code Proof must show the real corrected behavior (curl/screenshot/test output), never a self-report that it "should" work.

## Anti-patterns

- Do NOT start coding without a spec audit comment
- Do NOT file vague issues ("improve the dashboard")
- Do NOT combine multiple unrelated changes in one PR
- Do NOT skip Working Code Proof ("tests pass, trust me")
- Do NOT let issues sit unworked for >48h without a status comment
- Do NOT close issues without a merged PR (unless explicitly cancelled)

## Kanban (Deprecated)

The Kanban board has been **fully deprecated** and is no longer used for anything — not dispatch, not cross-repo coordination, not one-off admin. GitHub Issues are the single dispatch mechanism for all repos; ephemeral coordination that doesn't warrant an issue goes through direct inter-agent dispatch. If you find a lingering reference to a Kanban board or a `kanban_*` tool anywhere, treat it as stale and route the work through Issues instead.
