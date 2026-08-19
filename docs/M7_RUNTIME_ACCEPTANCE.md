# M7 Runtime Acceptance

Date: 2026-08-11  
Project: `game/unity/`  
Editor: Unity `6000.3.20f1` (`c9ba695d4f07`)  
Acceptance environment: Windows Editor, DX11, real M6 API, native PostgreSQL 17.10  
Status: **TECHNICALLY ACCEPTED - GAME FEEL REVISION REQUIRED**

M8 is not authorized or started by this report.

Superseded for current milestone status by `M7_5_GAME_FEEL_ACCEPTANCE.md`: the requested M7.5 game-feel revision is now implemented and accepted. This document remains the technical M7 baseline and before-measurement record.

## UNITY ACTIVATION / IMPORT STATUS

- Unity Personal is active and the Unity CLI is authenticated.
- The project imported with the locked `6000.3.20f1` Editor. URP 17.3.0, Input System 1.19.0, Newtonsoft JSON 3.2.2, and Test Framework 1.6.0 resolved.
- Unity generated the required package lock and `.meta` files. `Library/`, `Temp/`, `Logs/`, `Obj/`, `Build/`, `Builds/`, `UserSettings/`, memory captures, recordings, IDE projects, and solutions remain excluded by `.gitignore`.
- Required `Assets/`, `Packages/`, `ProjectSettings/`, scripts, and `.meta` files remain source-visible.
- Import defect fixed: the EditMode test assembly now explicitly references `Newtonsoft.Json.dll`; this removed the only blocking compile error.
- No missing references, shader failures, package resolution failures, or broken URP materials remain.
- Remaining compile warnings are CS8632 nullable-annotation warnings because nullable context is not enabled for the affected assemblies. They are non-blocking and classified LOW.

## UNITY TEST RESULTS

Tests were executed through the Unity CLI using Editor `6000.3.20f1`, not inferred from compilation.

| Suite | Total | Passed | Failed | Skipped | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| EditMode | 6 | 6 | 0 | 0 | 3.332 s |
| PlayMode | 3 | 3 | 0 | 0 | 0.053 s |
| **Combined** | **9** | **9** | **0** | **0** | **3.385 s** |

EditMode covers command construction, conflict reconciliation, mock idempotency, projection mapping, runtime configuration, and a real Unity adapter/API/PostgreSQL round-trip. PlayMode covers objective ordering, Day 2 objective restoration, and nearest physical interaction selection/invocation.

Runner repair: headless Editor PlayMode tests were launching the real game network bootstrap and stalling before fixtures ran. `GameBootstrapper.Install` now skips only Editor batch mode. Interactive Editor Play Mode and built players are unchanged. Generated Test Framework scratch scenes from interrupted runs were removed; the successful run cleaned up its own scratch scene.

Result XML remains in ignored local runtime artifacts:

- `Logs/M7-EditMode.xml`
- `Logs/M7-PlayMode.xml`

## END-TO-END BOOT

PASS.

Observed path:

`config load -> service composition -> guest authentication -> run load -> projection replacement -> world build -> player spawn -> control acquired`

- Fresh resume boot completed in 1.309-1.628 s in the visible Editor.
- The real adapter acceptance boot completed in 301 ms against the already-running local API.
- HUD displayed authoritative cash, day, and actions after load.
- No infinite loading, duplicate world/service objects, broken references, or unhandled boot exceptions occurred.
- A runtime-exposed resume defect was fixed: a Day 2 authoritative run previously displayed the Day 1 objective. It now restores as `Check the new notification`.

## MOVEMENT REVIEW

PASS, score 4/5.

- Real Input System keyboard state events exercised idle, forward, strafe, diagonal, jog, sprint, acceleration, deceleration, camera-relative movement, rotation, gravity, and collision.
- Forward/jog: 6.02 m in 1.5 s, normalized speed 0.69.
- Street sprint: 8.30 m in 1.5 s, normalized speed 1.00.
- Strafe and diagonal movement stopped cleanly against safehouse walls rather than penetrating them.
- Responsiveness is good for a greybox. Acceleration is quick without an abrupt velocity step; deceleration is firmer and keeps stops controlled.
- Turn speed tracks travel direction quickly and remained understandable after camera orbit.
- Weight is serviceable but still generic because the capsule presentation and procedural bob do not sell foot planting.
- The generated M7 route contains no authored stairs or meaningful slopes. Gravity and grounded collision passed; stairs/slopes remain a content coverage gap, not a demonstrated locomotion failure.

## CAMERA REVIEW

PASS WITH MEDIUM GAME-FEEL FOLLOW-UP, score 3/5.

- Orbit and vertical look accepted real mouse-delta input (`180, -35`).
- Shoulder framing remained readable in the safehouse, wall corners, and open neighborhood.
- Sphere-cast collision shortened the camera arm near walls; no sustained wall penetration, snapping, or jitter was observed.
- Sensitivity was usable and camera-relative movement stayed coherent.
- Score is below 4 because damping and collision recovery feel utilitarian, and the sparse greybox does not provide enough tight geometry, stairs, or vertical terrain to validate a production-quality camera.

## ANIMATION REVIEW

FUNCTIONAL PLACEHOLDER, score 2/5.

- Idle, start/stop, jog/sprint state, turning, and phone input-lock transitions did not break control.
- `CharacterAnimationDriver` drives future Animator parameters (`Speed`, `Grounded`, `Sprint`, `PhoneOpen`) and supplies procedural bob/tilt when no Animator is present.
- No stuck animation state or broken transition blocked the loop.
- Score is below 4 because the current visible character is a capsule with procedural bob, not a convincing placeholder humanoid. Phone and interaction states have correct control behavior but little readable body performance. This materially weakens game feel and NPC/player presence.

## SAFEHOUSE REVIEW

PASS WITH POLISH GAPS.

- Player spawned at the intended interior point with readable HUD and lighting.
- Phone, stash presentation, exit prompt/gate, walls, floor, and collision were present.
- The exit remained gated until Word advanced the objective.
- Scale is plausible for navigation, though the room is visually sparse and has limited landmarking.
- Instrumented spawn-to-exit segment was approximately 1:54 because it included all movement/camera acceptance maneuvers; a direct route takes only seconds.

## TRAP PHONE REVIEW

PASS WITH MEDIUM GAME-FEEL FOLLOW-UP, score 3/5.

- Repeated open/close remained stable and correctly disabled player movement while open.
- HOME synchronized Day 1/2, cash, and actions from the authoritative projection.
- WORD displayed the current forecast/rumor and advanced only the expected objective.
- STASH and CONTACTS used current projection data and did not mutate authority.
- Input focus returned to gameplay after close.
- Runtime defect fixed: END DAY was technically disabled before the correct objective but still looked enabled. It is now command-gated and visibly muted until `EndTheDay`.
- Score is below 4 because the large modal presentation feels more like an overlay menu than an in-world phone. It is readable and fast, but it interrupts spatial continuity.

## NEIGHBORHOOD REVIEW

PASS WITH MEDIUM GAME-FEEL FOLLOW-UP.

- The route supports `safehouse -> street -> Ray -> market hub`, with a small branch and enough width for camera orbit and sprinting.
- Real movement samples covered safehouse and street collision; no stuck position was observed.
- Contact and market interaction points are discoverable through prompts and placement.
- Scale is compact and readable, but the route is sparse, low in landmarks, and does not yet create a strong sense of place.
- Acceptance utilities were used to repeat exact NPC/market states and capture evidence after route traversal. No continuous unassisted gameplay video was recorded.

## NPC REVIEW

PASS FUNCTIONALLY, score 2/5.

- Ray faced the player, opened the dialogue sequence, advanced through completion, progressed the objective, and released player control.
- Repeated interaction completed a second time without permanent input lock, duplicated sequence state, or failure after first conversation.
- Score is below 4 because the interaction is visually lifeless: placeholder geometry, minimal look behavior, text-only delivery, and little entrance/exit staging.

## MARKET REVIEW

PASS, score 3/5.

- Physical market flow displayed authoritative price, cash, inventory, and legal actions.
- Valid buy: playable run version `1 -> 2`, cash `$500 -> $418`, actions `3 -> 2`.
- Valid sell: playable run version `2 -> 3`, cash `$418 -> $490`, actions `2 -> 1`.
- Unity HUD, market quantities, objective, and feedback toast refreshed only from confirmed responses.
- An insufficient/illegal action returned structured `COMMAND_REJECTED` with reason `ACTION_REQUIRED`; confirmed state remained unchanged.
- Score is below 4 because the decision is clear but compact and menu-heavy. The disabled-sell styling observed during the first pass was also too similar to enabled styling; End Day received the required repair, while broader disabled-state polish remains MEDIUM.

## BACKEND ROUND-TRIP

PASS against real API and native PostgreSQL 17.10.

- API: `http://127.0.0.1:8787`, `/ready` returned `{"status":"ready"}`.
- PostgreSQL service `postgresql-x64-17` was Running/Automatic.
- Playable run: `1b3170ff-9a7c-4501-ba7b-0d8a51598d78`.
- PostgreSQL confirms four accepted commands: StartRun, BuyAsset, SellAsset, EndDay.
- Final playable state: version 4, Day 2, cash $490, actions 3, status ACTIVE.
- Event stream contains 18 ordered events, including cash/inventory/action changes, `DayCompleted`, `DayAdvanced`, `PricesUpdated`, and final `CommandCommitted`.
- Unity-observed trade latency was 375 ms for the first visible buy and 56 ms for the visible sell. The final automated adapter run measured 58 ms buy and 37 ms sell.

Final real adapter run:

| Action | Command ID | Version | Result |
| --- | --- | --- | --- |
| Boot | server StartRun ID | 1 | cash $500 |
| Buy | `unity-718586a007c0462cb7c33c9594ee8388` | 1 -> 2 | accepted, 58 ms |
| Idempotent buy | `unity-86324a7a418b4b76a03b8e31da3caae5` | 2 -> 3 | exact replay retained v3 |
| Stale command | `unity-b95d69751b6346a0a65f4b97378ca594` | expected 2/current 3 | reconciled |
| Sell | `unity-c4ed377afde042ea8e2e4ea5850ef0d0` | 3 -> 4 | accepted, 37 ms |
| Invalid action | `unity-01ef2fbbc8844a17bd3794fa00d02d4b` | v4 | `COMMAND_REJECTED/ACTION_REQUIRED` |

## CONFLICT / IDEMPOTENCY TEST

PASS.

- Controlled stale expected version 2 after the adapter reached version 3 returned `STATE_CONFLICT`.
- The client discarded speculative intent, replaced its projection with authoritative version 3, and safely continued with the valid sell to version 4.
- Replaying exact command/idempotency key `unity-86324a7a418b76a03b8e31da3caae5` returned the original version 3 response/event ID.
- PostgreSQL contains exactly one `game_commands` row and one resulting state version for that command. No second purchase, action consumption, or economy event was created.

## NETWORK FAILURE TEST

PASS AT ADAPTER/STATE LEVEL.

- API connectivity was redirected to an unreachable endpoint during a safe command.
- Unity returned structured `CONNECTION_LOST` after bounded request behavior.
- The confirmed version 4 projection remained intact; no local speculative mutation or duplicate backend row appeared.
- Restoring the real endpoint allowed run reload/reconciliation to continue.
- The gameplay toast path is present, but a continuous on-screen disconnect/reconnect recording was not captured. This is an evidence/polish gap, not state corruption.

## SAVE / RESUME TEST

PASS.

Before exit:

- run `1b3170ff-9a7c-4501-ba7b-0d8a51598d78`
- version 4
- Day 2
- cash $490
- actions 3

After stopping and restarting Play Mode with the same development guest, Unity loaded the same run and exact authoritative values. PostgreSQL independently matched version 4/Day 2/$490/3 actions. Local persistence located the guest/run but did not override the server projection.

The first resume exposed the incorrect Day 1 HUD objective; the repair now derives the Day 2 hook from authoritative day. Final screenshot shows `CHECK THE NEW NOTIFICATION` with the restored values.

## EDUCATIONAL REVEAL REVIEW

PASS, score 3/5.

- The LIQUIDITY reveal appeared after the authoritative day transition.
- Copy connected the experienced market move from `$80` to `$62` to thinning liquidity.
- Timing was coherent and the text was brief/readable.
- Score is below 4 because it remains a full-screen explanatory overlay and feels somewhat menu-like; the concept is understandable, but presentation is not yet integrated into the world.

## DAY TRANSITION REVIEW

PASS, score 4/5.

- End Day submitted to the real API at expected version 3; local code did not advance the day speculatively.
- The version 4 Day 2 projection arrived before presentation completed.
- Lighting transitioned visibly, the reveal followed transition completion, and the new Word notification appeared.
- No shader/material failure or world-state incoherence occurred.

## ANALYTICS REVIEW

PASS FOR M7 FOUNDATION.

- Unity emitted client-observation events for session start, rumor receive/view, player spawn/control, phone open, objective progression, safehouse exit, NPC start/complete, market view, trade request/complete, day complete, and education reveal.
- The full visible session produced an ordered 27-event client sequence through `education.reveal_shown`.
- Telemetry flush failures are swallowed by design and did not interrupt gameplay.
- Authoritative economy facts originate from PostgreSQL-backed game events/outbox, not Unity. The playable run has 18 durable outbox rows; the final adapter run has 16.
- Local outbox rows remained `PENDING` because no external publisher/consumer was part of this M7 runtime environment. Durability/origin passed; downstream delivery was not claimed.

## PLAYTHROUGH DURATION

Instrumented visible first-day sequence: **3:37** from session start to LIQUIDITY reveal. This included repeated phone opening, movement/camera samples, and a repeated NPC conversation, so a straight read-through would be shorter.

| Segment | Measured/observed time |
| --- | ---: |
| Boot to control | 1.309 s |
| Safehouse, phone, movement checks, exit | ~1:54 |
| Contact entry and dialogue/repeat check | ~0:27 |
| Contact to market/open | ~0:20 |
| Market buy/sell and consequence | ~0:27 |
| End Day request to reveal | ~5 s |

The current 10-15 minute target is not met. The loop is compact and understandable, but substantially under-length even with acceptance checks. Artificial travel slowdown is not recommended.

## PERFORMANCE BASELINE

Editor-only baseline; not a production build claim.

Machine:

- Windows 11 Home `10.0.26200`
- Intel Core i7-1355U
- 15.6 GB RAM
- Intel Iris Xe Graphics
- Unity Editor DX11

Normal full-play samples:

| Sample | Avg frame | P95 | Max | Avg FPS | Allocated | Managed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mid-loop v2 | 5.50 ms | 7.16 ms | 30.40 ms | 181.9 | 332.9 MB | 573.8 MB |
| Post-trade v3 | 5.54 ms | 7.29 ms | 30.40 ms | 180.6 | 327.5 MB | 535.7 MB |
| Post-End Day v4 | 5.66 ms | 7.45 ms | 18.72 ms | 176.7 | 331.3 MB | 560.9 MB |

- Normal baseline: approximately 177-182 Editor FPS, 5.5-5.7 ms average frame, 7.2-7.5 ms P95.
- A 2.98-3.62 s domain/play reload spike was recorded after restarting Play Mode and is excluded from steady runtime performance.
- No repeated gameplay frame hitch or GC-linked control interruption was visible. Per-frame GC allocation instrumentation was not captured, so no zero-allocation claim is made.
- Unity command latency: 37-375 ms locally, depending on first-call/warm state.

## GAME-FEEL SCORECARD

| Category | Score | Finding |
| --- | ---: | --- |
| Movement | 4 | Responsive and coherent; placeholder body limits perceived weight. |
| Camera | 3 | Functional collision/framing, but utilitarian damping and limited geometry coverage. |
| Interaction | 3 | Prompts and input recovery work; staging and affordances need polish. |
| Trap Phone | 3 | Clear and synchronized, but strongly modal/menu-like. |
| NPC Conversation | 2 | Technically stable but visually lifeless and minimally staged. |
| Market Decision Flow | 3 | Clear authoritative choice, still compact and menu-heavy. |
| Economic Feedback | 4 | Cash, inventory, prices, versioned consequences, and reveal connect clearly. |
| Educational Reveal | 3 | Understandable and well timed, but interrupts as an overlay. |
| Day Transition | 4 | Visible, authoritative, coherent, and clean. |
| Overall Flow | 3 | Complete and understandable, but too short and visibly placeholder-heavy. |

## BLOCKERS / HIGH / MEDIUM / LOW DEFECTS

### BLOCKER

- None remaining.

### HIGH

- `M7-H001` - The first-day sequence is approximately 3:37 with acceptance checks and shorter in direct play, far below the 10-15 minute target. Pacing/content density needs iteration without slowing locomotion artificially.
- `M7-H002` - Player/NPC animation and staging are too lifeless for an investor-demo greybox. Functional capsule bob is not enough to communicate character, phone use, or interaction intent.

### MEDIUM

- `M7-M001` - Trap Phone, market, and education surfaces are readable but strongly modal and menu-like, weakening in-world continuity.
- `M7-M002` - Neighborhood route is understandable but sparse and low in landmarks/ambient life.
- `M7-M003` - Camera is functional, but production confidence is limited by absent stairs/slopes/vertical spaces and basic recovery feel.
- `M7-M004` - Disabled market action styling can be more explicit and consistent. End Day's misleading enabled appearance was fixed during acceptance.
- `M7-M005` - Network failure state integrity is proven, but disconnect/reconnect presentation lacks continuous visual evidence and should receive a focused UX pass.
- `M7-M006` - Root `.env` discovery does not follow npm workspace cwd; ignored `apps/api/.env` is currently required for local API runtime.

### LOW

- `M7-L001` - CS8632 nullable-context compile warnings remain across runtime scripts.
- `M7-L002` - No continuous gameplay video was captured; twelve real Game View screenshots provide visual evidence.
- `M7-L003` - External analytics publisher delivery was outside this environment; durable outbox rows remain PENDING.
- `M7-L004` - Per-frame GC allocation/spike instrumentation was not captured beyond total allocated/managed memory and visible hitch review.

### FIXED DURING ACCEPTANCE

- `M7-F001` - Newtonsoft test assembly reference blocked compilation.
- `M7-F002` - Day 2 save/resume reset the HUD to the Day 1 objective.
- `M7-F003` - End Day could appear available before the intended objective and lacked an internal objective guard.
- `M7-F004` - Headless PlayMode Test Runner launched real runtime bootstrap and stalled fixture execution.

## SCREENSHOTS / VIDEO CREATED

Real Unity Game View evidence in `docs/evidence/m7/`:

1. `01-safehouse.png`
2. `01-safehouse-editor.png`
3. `02-trap-phone-home.png`
4. `03-word-on-the-street.png`
5. `04-player-movement.png`
6. `05-npc-interaction.png`
7. `06-neighborhood.png`
8. `07-market-ui.png`
9. `08-market-buy-confirmed.png`
10. `09-market-consequence.png`
11. `10-night-transition.png`
12. `11-educational-reveal.png`
13. `12-save-resume.png`

No continuous gameplay video was created. The run was captured as ordered still evidence and correlated Editor/client/backend logs; no screenshot was fabricated.

## FILES MODIFIED

M7 runtime acceptance changes:

- `game/unity/Assets/_TrapWars/Tests/EditMode/TrapWars.EditModeTests.asmdef`
- `game/unity/Assets/_TrapWars/Tests/EditMode/RealBackendAcceptanceTests.cs` and `.meta`
- `game/unity/Assets/_TrapWars/Tests/PlayMode/GreyboxFlowTests.cs`
- `game/unity/Assets/_TrapWars/Core/Objectives/ObjectiveDirector.cs`
- `game/unity/Assets/_TrapWars/Core/Phone/TrapPhoneController.cs`
- `game/unity/Assets/_TrapWars/Core/Bootstrap/GameBootstrapper.cs`
- `game/unity/Assets/_TrapWars/Editor/M7AcceptanceTools.cs` and `.meta`
- Unity-generated required `.meta` files and `Packages/packages-lock.json`
- `docs/evidence/m7/*.png`
- `docs/M7_RUNTIME_ACCEPTANCE.md`

Existing backend/application changes outside this acceptance pass were not reverted or redone.

## FINAL M7 STATUS

**TECHNICALLY_ACCEPTED - GAME_FEEL_REVISION_REQUIRED**

The complete Unity loop runs in the locked Editor, real API/PostgreSQL authority works, projection conflict and idempotency are safe, network loss preserves confirmed state, save/resume restores exact server truth, all 9 Unity tests pass, and no blocker or state-corruption risk remains.

M7 is not rated fully investor-demo ready because pacing, character/NPC presentation, and modal interaction feel remain materially below the desired bar.

## RECOMMENDED NEXT MILESTONE

`M7.5 GAME FEEL ITERATION`

Focus M7.5 on pacing/content density, placeholder character/NPC animation and staging, phone/market integration, neighborhood landmarks/ambient life, and camera polish. Do not begin M8 until that focused feel pass is reviewed.
