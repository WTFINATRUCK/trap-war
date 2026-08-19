# Trap Wars V2 - M8.2 Acceptance

> Superseded for current zero-budget milestone status by `M8_2B_ACCEPTANCE.md`. The owner selected the zero-budget path on 2026-08-18; M9 remains unauthorized.

## Executive Summary

The accepted M8.1 technical pipeline and authoritative runtime remain healthy, but M8.2 cannot be accepted because no available external Hero/Ray pair met the required 4/5 visual, identity, facial, rig, and licensing standard. Weak generic substitutions were deliberately rejected.

**Final status: M8.2 EXTERNAL PROCUREMENT BLOCKED**

**Recommended next milestone: M8.2A External Character Procurement and Art-Vendor Handoff. M9 remains unauthorized.**

## External Integration

- New runtime assets integrated: none.
- Existing assets promoted to FINAL-QUALITY: none.
- Existing M8.1 assets removed: none.
- Gameplay/backend changes: none.

## Unity Test Runner

- Unity: 6000.3.20f1.
- EditMode: 6/6 passed on 2026-08-18.
- PlayMode: 8/8 passed on 2026-08-18.
- Evidence: `docs/evidence/m8_2/M8_2_EDITMODE_RESULTS.xml` and `docs/evidence/m8_2/M8_2_PLAYMODE_RESULTS.xml`.
- Unity's first licensing connection reported transient handshake/access-token messages, then resolved the assigned Unity Personal entitlement and completed both suites successfully.

## API And Economy Regression

The fresh EditMode real-backend test used the live API on `127.0.0.1:8787` and PostgreSQL 17.

- Boot: 397 ms; initial version 1; cash 500.
- Buy: version 1 to 2 in 61 ms.
- Idempotency: replay held version 3 and reused the event identity.
- Conflict: stale expected version 2 reconciled to authoritative version 3.
- Sell: version 3 to 4 in 35 ms.
- Rejection: `COMMAND_REJECTED`, reason `ACTION_REQUIRED`.
- Resume: same run at version 4, cash 444, Day 1.
- Network failure: `CONNECTION_LOST`; confirmed state preserved.

No backend or economy implementation changed.

## Performance

No runtime asset changed, so a new Development Player/profile would measure the same M8.1 content and was not represented as M8.2 character-cost evidence. Preserved accepted baseline: 132.1 FPS, 7.57 ms average, 9.52 ms P95, 11.70 ms maximum, 34,834 triangles, 165 renderers, five skinned renderers, and no final shadow-atlas warning.

Character blend-shape, lip-sync, facial Animator, eye, LOD, and new skinned-mesh costs remain unmeasured because no qualifying character files were acquired.

## External Playtest And Capture

- Unfamiliar testers: 0; no answers fabricated.
- Normal 8-12 minute first-time run: not measured.
- M8.2 continuous video: not captured.
- M8.2 13-frame screenshot set: not captured.
- Reason: there is no M8.2 visual integration build to validate. Prior M8.1 evidence was not relabeled.

## Scorecard

Scores remain the honest M8.1 baseline because no replacement art was integrated.

| Category | Score | Reason below 4 |
|---|---:|---|
| Hero Character | 3 | Current stylized vendor character misses grounded premium identity. |
| Hero Face | 3 | Readable only at gameplay distance; no production expression/viseme set. |
| Hero Rig | 4 | Valid tested Humanoid and replaceable pipeline. |
| Hero Materials | 3 | Source skin/cloth response is not production-grade. |
| Character Animation | 3 | Generic set lacks production starts, stops, turns, phone, and role-specific acting. |
| Phone Animation | 3 | Working two-hand IK; authored draw/put-away is absent. |
| Ray Design | 3 | Distinct color/source mesh, but not a bespoke memorable person. |
| Ray Face | 3 | No production facial shapes or facial material detail. |
| Ray Performance | 3 | Head attention works; varied six-beat authored acting is absent. |
| Lip-Sync | 2 | No real runtime lip-sync proof and zero suitable facial blend shapes. |
| Safehouse | 3 | Composition is readable; hero props and surfaces remain prototype-grade. |
| Street | 3 | Improved route detail; facades, road, and vehicles remain visibly modular/simple. |
| Materials | 3 | Coherent but shallow source texture/surface detail. |
| Day Lighting | 3 | Stable/readable; lacks production skin response and nuanced separation. |
| Night Lighting | 3 | Readable; not a final character-aware night grade. |
| Audio | 3 | Authored cues exist; ambience/music/voice remain temporary or absent. |
| Voice Test | 2 | No legally acquired Ray voice performance. |
| VFX | 3 | Functional restrained proof effects; no production hero-beat pass. |
| Cinematics | 3 | Controlled framing without authored character-performance coverage. |
| Visual Cohesion | 3 | Palette is coherent; current character/environment asset-pack mismatch remains. |
| Performance | 4 | Accepted M8.1 baseline remains healthy; new character cost is unmeasured. |
| Pacing | 4 | Accepted Day 1 route preserved; external first-time timing remains open. |
| Overall Investor-Demo Quality | 3 | Technically credible, but visible character and environment quality remains below 4/5. |

## Defects And Blockers

### Blocking

- `HERO_ART_NOT_ACQUIRED`: no qualifying 4/5 Hero delivery.
- `RAY_ART_NOT_ACQUIRED`: no qualifying 4/5 Ray delivery.
- `FACIAL_LIPSYNC_SOURCE_MISSING`: no approved facial/viseme meshes or Ray voice proof.
- `AUTHORED_MOTION_PACKAGE_MISSING`: required Hero/Ray role-specific clips are not acquired.

### Open After Character Procurement

- Character-dependent lighting/material/cohesion tuning.
- Safehouse/street hero asset replacement.
- Layered production ambience/music and voice integration.
- Fresh Development Player profile, continuous capture, screenshots, and unfamiliar-human playtest.

## Acceptance Decision

M8.2 acceptance thresholds are not met. This is a procurement/art-delivery block, not a technical repair finding. Do not begin M9.
