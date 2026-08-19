# Unity Greybox M7

Status: historical M7 implementation baseline. Runtime was accepted, and the M7.5 game-feel pass was accepted on 2026-08-17.

The source-level limitations and activation checklist below are retained as the pre-runtime M7 record. Current implementation and evidence are authoritative in `M7_RUNTIME_ACCEPTANCE.md`, `M7_5_GAME_FEEL.md`, and `M7_5_GAME_FEEL_ACCEPTANCE.md`. The live greybox now uses a procedural humanoid, contextual phone/dialogue/market camera states, ambient pedestrians/traffic/audio, optional street investigation, denser safehouse/street dressing, and a polished consequence/Day 2 sequence.

## Playable sequence

The generated M7 route is intentionally compact:

1. Spawn beside the bed in `safehouse_01` with a phone notification.
2. Open Trap Phone and read Word on the Street.
3. Use the gated safehouse exit and walk through `district_01`.
4. Meet the physical contact, who turns toward the player and presents data-driven dialogue.
5. Reach `market_hub_01`, inspect server prices/legal actions, and buy or sell through M6.
6. Observe confirmed cash/inventory feedback, then end the authoritative day.
7. See the lighting transition, market consequence, short LIQUIDITY reveal, and Day 2 phone hook.

The safehouse also contains mirror/character placeholder, phone point, and location-bound stash. The neighborhood uses a dense street, sidewalks, modular blocks, a small branch, contact point, and market canopy. No combat, vehicles, full city, wallet, token, NFT, marketplace, or final art was added.

## Controls

| Action | Keyboard/mouse | Gamepad |
| --- | --- | --- |
| Move | WASD | Left stick |
| Look | Mouse | Right stick |
| Sprint | Left Shift | Left-stick press |
| Interact | E | South button |
| Phone | Tab | North button |
| Back | Escape | East button |
| Confirm | Enter | South button |
| Development overlay | F1 | Editor/development only |

The third-person motor uses camera-relative direction, acceleration/deceleration, grounded gravity, smooth facing, slope/step CharacterController settings, walk/jog/sprint speeds, and procedural footstep cues. The camera has smoothed orbit/follow, adjustable sensitivity, shoulder offset, stable target framing, and sphere-cast collision avoidance. Placeholder animation supports speed, grounded, sprint, phone state, and procedural bob/lean; a production Animator Controller and authored clips remain follow-up work.

## Presentation

The persistent HUD is limited to cash, day, actions, objective, contextual prompt, transient toast, and network state. Trap Phone includes Home, Word, Stash, and Contacts. Market and stash panels are contextual overlays grounded at physical interaction locations. The palette uses ink, paper, green, gold, and red rather than a generic cyberpunk treatment.

`ProceduralAudioService` generates temporary footstep, UI, phone, trade, and transition cues at runtime, avoiding unlicensed assets. Ambient presentation currently comes from lighting/world tone; a dedicated looping ambience asset is still needed.

## Objective and analytics proof

The local objective director guides the ordered beats but grants no economic state. M4 client observations include session, spawn/control, phone, rumor, safehouse exit, NPC start/complete, market view/request/complete, education reveal, objective advance, and day complete. Authoritative economic events remain server-originated. The analytics buffer is capped at 256 and never blocks gameplay.

## Development tools

F1 displays environment, run ID, state version, day, rolling frame time/FPS, and managed memory. It can reload the authoritative projection and teleport to Safehouse, Contact, or Market. It is guarded by Editor/development build directives.

## Verification record

Machine used for implementation: Windows 11, Intel Core i7-1355U, Intel Iris Xe, 16 GB RAM.

| Check | Result |
| --- | --- |
| Exact Unity/URP template installation | PASS: `6000.3.20f1`, URP `17.3.0` |
| Runtime C# static compile against installed Unity assemblies | PASS |
| Edit-mode test assembly static compile | PASS, 5 tests discovered by source |
| Play-mode test assembly static compile | PASS, 2 tests discovered by source |
| Unity import/domain reload | BLOCKED: Editor exit 198, no valid Unity license |
| Unity Test Framework execution | BLOCKED by same license |
| Real Unity to M6 to PostgreSQL trade | NOT RUN: Unity license and local PostgreSQL unavailable |
| FPS/frame time/memory measurement | NOT MEASURED: playable runtime could not launch |
| Screenshots/video | NOT CAPTURED: playable runtime could not launch |

The source-level checks are useful compile evidence, not a claim that the playable acceptance test passed. Once licensed, capture safehouse, movement, phone, NPC, market, education, and day/night evidence from the real running scene and record frame-time/FPS/memory from the F1 overlay and Unity Profiler.

Re-run the source checks from the repository root with `powershell -ExecutionPolicy Bypass -File game/unity/Tools/Verify-UnitySources.ps1`. Pass `-UnityEditorRoot` if the locked Editor is installed elsewhere.

## Acceptance checklist after activation

- Open the project once to resolve packages and commit generated `.meta` files/package lock.
- Run all EditMode and PlayMode tests in Unity Test Runner.
- Run the real backend path, verify one buy, one sell, one End Day, stale conflict reconciliation, retry without duplication, and close/reopen resume.
- Profile a 10-minute route on the recorded development PC; inspect main-thread stalls, GC allocations, draw calls, and memory.
- Verify 1920x1080, 1366x768, and a mobile-shaped viewport for clipping and text scale.
- Capture the seven requested visual states and a short end-to-end recording.

M8 should not start until this acceptance checklist is complete and reviewed.
