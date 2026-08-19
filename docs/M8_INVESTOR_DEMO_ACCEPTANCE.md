# M8 Investor Demo Acceptance

## Executive result

M8 establishes a working visual production pipeline and applies it to the full Day 1 slice without changing frozen economy/backend behavior. Real Play Mode evidence, Unity tests, a PostgreSQL/API round trip, and a clean Development Player profile pass. Presentation is visibly stronger than M7.5 but does not reach the directive's investor-quality threshold.

Final recommendation: **M8.x VISUAL POLISH REQUIRED**. M9 was not started.

## Gate results

- M8A: PASS technically. Import, provenance, naming, source/runtime, character, animation, environment, quality, LFS, QA, and build pipelines exist.
- M8B: PASS technically. Applied to hero, Ray, safehouse, street, phone, market, day/night, audio buses, VFX, and all 12 real hero frames.
- M8C: PARTIAL. Technical acceptance passes. Investor visual score and external/human capture requirements remain below target.

## Runtime and regression evidence

- Unity EditMode: 6/6 passed.
- Unity PlayMode: 7/7 passed.
- Real PostgreSQL/API test passed buy, sell, rejection, conflict replacement, idempotent replay, network failure handling, and save/resume.
- Development Player built successfully at 170,072,459 bytes and completed a clean 20-second sample.
- Automated hero route obeyed objectives, submitted a real buy, received server confirmation, ended Day 1, displayed liquidity education, and reached Day 2.
- No Blocker or High technical defects were found.

## Visual scorecard

| Category | Score | Reason below 4 |
| --- | ---: | --- |
| Hero Character | 3 | Generic stylized CC0 candidate; not narrative-authentic final design |
| Character Animation | 3 | Authored locomotion source works; phone/dialogue mappings remain substitutes |
| Facial Capability | 3 | Pluggable blink/look architecture, but current meshes have zero facial blend shapes |
| Ray | 3 | Distinct skinned candidate and look-at behavior, but generic design/performance |
| Safehouse | 3 | Better identity, clutter, materials, and practical light; still modular/blockout-heavy |
| Street Block | 3 | Dense and differentiated, but silhouette/material craft is not final environment art |
| Environment Density | 4 | Props, pedestrians, vehicles, signage, decals, and routes support the compact block |
| Materials | 3 | Reusable URP system works; flat/stylized response and temporary surfaces remain |
| Lighting - Day | 3 | Readable and coherent, but lacks final exposure, bounce, and authored composition |
| Lighting - Night | 3 | Distinct mood and practicals; blacks remain too crushed for premium presentation |
| Trap Phone | 4 | Strong hierarchy, signature green rail, readable contextual interaction |
| HUD | 4 | Minimal, legible, consistent financial and objective language |
| Market Presentation | 4 | Contextual, clear, and confirmed economic feedback remains strong |
| VFX | 3 | Restrained atmosphere and feedback exist; still lightweight proof effects |
| Audio | 3 | Separate buses/state hooks exist; cues and music are generated TEMPORARY audio |
| Cinematic Presentation | 3 | Context cameras and hero beats work; framing and authored motion need polish |
| Visual Cohesion | 3 | Consistent palette/UI, but asset style and finish vary visibly |
| Performance | 4 | Player p95 10.51 ms on integrated graphics with low scene complexity |
| Pacing | 4 | Accepted M7.5 8:01 flow preserved; no animation-driven length regression found |
| Overall Investor-Demo Quality | 3 | Functional production candidate, not yet a credible premium funded-game presentation |

Every category is at least 3, but the required 4+ hero/animation/Ray/environment/lighting/cohesion/overall targets are not met.

## Defects

### Blocker

None.

### High

None technical. Visual acceptance itself is below the M8 target and therefore routes to M8.x rather than M9.

### Medium

- Hero and Ray are generic stylized CC0 candidates rather than approved character designs.
- Imported character avatars are valid but `isHuman=false`; final Humanoid retargeting is unproven.
- Hero and Ray expose zero facial blend shapes; close dialogue cannot deliver final performance.
- Final phone/interact/listen/gesture/reaction animation set and hand/foot IK are absent.
- Safehouse/street materials, architectural composition, and night readability remain visibly pre-final.
- Audio cues/music and typography remain temporary; no voice, lip sync, or final mix.
- No external first-time playtest, valid human-paced M8 timing pass, or continuous gameplay video was completed.

### Low

- High quality can reduce punctual-light shadow resolution to fit the 2048 atlas.
- Authored mesh LOD1/LOD2 chains are not yet delivered.
- Representative stairs/slopes/curbs were exercised by the accepted controller, but no dedicated foot-IK visual capture was produced.
- Web/mobile target builds and fine-grained phone/dialogue/market allocation profiles remain future validation.

## Evidence

Twelve PNG files in `docs/evidence/m8` cover hero safehouse, interior, street reveal, walking, Ray, Ray dialogue, Trap Phone, market, economic confirmation, education, day, and night. `M8_ASSET_QA.txt` records the import audit. Final evidence was generated in real Unity Play Mode; it was not composited or fabricated.

The accepted M7.5 human-paced duration remains 8:01. The M8 automated acceptance route is intentionally accelerated and is not reported as a playthrough-duration measurement. Continuous video was attempted through available tooling, but no recorder was available; still screenshots and the uninterrupted route log are retained instead. External first-time testing was not practical in this environment.

## Required next milestone

Run M8.x as a targeted external-art and presentation pass: approved hero/Ray design, true Humanoid/facial rigs, authored performance clips and IK, final environment/material/lighting art, licensed typography/audio/voice, shadow cleanup, continuous capture, and first-time playtest. Do not begin it automatically.

