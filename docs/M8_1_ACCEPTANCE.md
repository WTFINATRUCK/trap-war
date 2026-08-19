# Trap Wars V2 - M8.1 Acceptance

## Executive Summary

M8.1 is technically accepted but does not reach 4/5 overall investor-demo art quality. The Humanoid pipeline, phone IK, lighting controls, authored cue integration, capture tooling, and runtime performance are sound. The current stylized vendor characters, absent facial blend shapes, limited generic motion set, modular environment, and temporary ambience/music remain visible investor-quality blockers.

**Final status: M8.1 PIPELINE ACCEPTED — EXTERNAL HERO ART BLOCKER**

**Recommended next milestone: M8.2 External Hero/Ray Art, Motion, Facial, and Audio Integration. M9 remains unauthorized.**

## Rig Fix

- Five processed runtime prefabs: PASS.
- Avatar valid: true for all five.
- Humanoid: true for all five.
- Required bones missing: none.
- Animation source compatibility: true.
- Hierarchy repairs: upper legs to Hips; feet to lower legs.
- Evidence: `docs/evidence/m8_1/M8_1_RIG_VALIDATION.txt`.

## Runtime and Build Acceptance

- Unity: 6000.3.20f1.
- Windows Development Player: succeeded, 171,744,479 bytes.
- Final High-quality profile: 132.1 FPS, 7.57 ms average, 9.52 ms P95, 11.70 ms max.
- Scene: 34,834 triangles, 165 renderers, five skinned renderers.
- Memory: 91.2 MB allocated, 5.2 MB managed, 23.6 MB allocation growth, 30 GC collections during the 20-second sample.
- Shadow-atlas pressure: no warning in the final profile/capture.

## Unity Test Runner

- EditMode: 6/6 passed, including the real PostgreSQL/API acceptance case.
- PlayMode: 8/8 passed, including processed Humanoid installation, phone IK/prop activation, authored audio packaging, quality tiers, objectives, and physical interaction.
- Evidence: `M8_1_EDITMODE_RESULTS.xml` and `M8_1_PLAYMODE_RESULTS.xml`.

## API and Economy Regression

Real PostgreSQL/API results from the final EditMode run:

- Boot: 137 ms, initial version 1, cash 500.
- Buy: version 1 -> 2, 34 ms.
- Idempotency: replay held version 3 and reused one event identity.
- Conflict: stale expected version 2 reconciled to authoritative version 3.
- Sell: version 3 -> 4, 22 ms.
- Rejection: `COMMAND_REJECTED`, reason `ACTION_REQUIRED`.
- Resume: same run, version 4, cash 432, Day 1.
- Network failure: `CONNECTION_LOST`; confirmed state preserved.

No economy or backend implementation was changed.

## Continuous Capture

- File: `docs/evidence/m8_1/M8_1_CONTINUOUS_SCRIPTED_ROUTE.mp4`.
- H.264, yuv420p, 1920x1200, 30 FPS, 75 seconds, 4,064,389 bytes.
- SHA-256: `948A5D00622E4DD498026CA33E07F02D7B51F5ECBFD61BCDBE96D9DF999576A5`.
- The file is a single uncut desktop capture of the Unity Play Mode composition route.
- Limitation: it uses the deterministic developer composition route and Unity Editor framing. It proves route/capture reliability and exposes defects, but it is not a normal first-time 8-12 minute human playthrough.

## Screenshot Set

All 12 files are real 881x435 runtime Game-view frames under `docs/evidence/m8_1/screenshots/`:

1. Hero safehouse
2. Hero at street exit
3. Street wide
4. Ray
5. Ray conversation
6. Phone
7. The Hub
8. Market flow
9. Market consequence
10. Liquidity reveal
11. Night street
12. Day 2 hook

## External Playtest

No unfamiliar human testers were available in this execution environment. No answers were invented and no first-time duration is claimed. The prior 8-12 minute target remains unverified for M8.1 by external participants.

## Defects

### High

- `EXTERNAL_CHARACTER_ART_REQUIRED`: Hero and Ray are stylized vendor characters with proportions and detailing below the grounded investor target.
- `FACIAL_ART_REQUIRED`: zero facial blend shapes; no credible lip-sync proof can be produced from these meshes without fabricating facial capability.
- Authored motion coverage is incomplete for phone transitions and Ray's performance set.

### Medium

- Safehouse and street still expose simple modular/primitive geometry and asset-pack style mismatch.
- Ambient sound and music remain temporary procedural beds; the neighborhood does not yet have a production sound identity.
- Cinematic beats use controlled third-person framing rather than authored camera motion and close performance.
- Day 2 Word content is still visually close to Day 1 and needs content-specific presentation review outside this art-only scope.

### Low

- Runtime material variants are cloned per character and should become authored shared material assets.
- GC collection count should be revisited after final characters/audio replace runtime-generated temporary clips.

## Scorecard

| Category | Score | Reason below 4 |
|---|---:|---|
| Hero Character | 3 | Stable and readable, but stylized vendor proportions and outfit are not the grounded premium target. |
| Hero Face | 3 | Face reads at gameplay distance; no production eyes/mouth/brow detail or expression set. |
| Hero Rig | 4 | Valid Humanoid, complete required mapping, reusable animation source, automated hard validation. |
| Character Animation | 3 | Working retargeting and blending; missing production starts/stops/turns and role-specific clips. |
| Phone Animation | 3 | Two-hand IK and physical prop work; no authored draw/put-away and close hand review remains asset-dependent. |
| Ray Design | 3 | Distinct source mesh/palette, but not a bespoke memorable character. |
| Ray Performance | 3 | Head attention and working/action clips function; minimum six-beat authored set is absent. |
| Facial Capability | 3 | Honest bounded head/look-at fallback only; zero blend shapes and no valid lip-sync proof. |
| Safehouse | 3 | Better light/material balance and composition, but furniture/geometry remain visibly prototype-grade. |
| Street Block | 3 | Improved route detail, signage, curbs, crossing, and focal points; facades/vehicles remain modular/simple. |
| Materials | 3 | Coherent roughness logic and restrained count; source textures/surface detail remain uneven. |
| Day Lighting | 3 | Readable and stable, but lacks production GI, skin response, and nuanced separation. |
| Night Lighting | 3 | Crushed blacks corrected and character fill added; still not a polished final night grade. |
| Phone | 4 | Branded, readable, integrated, and stable. | 
| HUD | 4 | Accepted structure preserved and readable. |
| Market | 4 | Accepted interaction and consequence flow preserved. |
| VFX | 3 | Restrained dust/post stack works; transaction/day beats lack authored production VFX. |
| Audio | 3 | Ten authored CC0 cue roles and five footsteps; ambience/music/voice remain temporary. |
| Cinematics | 3 | Stronger fixed compositions; no authored camera motion or performance-grade close-ups. |
| Visual Cohesion | 3 | Palette and lighting are more coherent; character/environment style mismatch remains obvious. |
| Performance | 4 | 132.1 FPS, stable frame times, bounded scene cost, no final shadow-atlas warning. |
| Pacing | 4 | Accepted Day 1 route preserved; external first-time validation remains outstanding. |
| Overall Investor-Demo Quality | 3 | Technically credible production prototype, but current hero art visibly prevents investor-quality 4/5. |

## Acceptance Decision

The technical M8.1 pipeline is accepted. The 4/5 visual target is not accepted. Proceed only to the external-art integration milestone defined above; do not begin M9 automatically.

