# Trap Wars V2 - M7.5 Game Feel Acceptance

Date: 2026-08-17  
Unity: 6000.3.20f1, DX11, URP 17.3.0  
Machine: Windows 11, Intel Core i7-1355U, Intel Iris Xe, 15.6 GB RAM  
Status: **M7.5 ACCEPTED**

## Acceptance summary

M7.5 meets its acceptance floor. The final visible Unity run completed the ordered Day 1 route, one optional clue, all five Ray lines, the market review gate, an authoritative buy, consequence/reveal, End Day, night state, and Day 2 hook. A real Play stop/start restored the same run, version, cash, day, and actions. M8 was not started.

One runtime defect was found and repaired: a fast authoritative End Day response could arrive during the phone opening animation, causing `Close()` to discard the request and stack the education reveal over the phone. Phone close is now interruptible; the final evidence shows one coherent reveal layer and preserved world context.

## Before and after duration

| Measure | M7 | M7.5 |
| --- | ---: | ---: |
| Instrumented Day 1 route | 3:37 | 8:01 to captured Day 2 hook |
| Intended first-time range | Not met | 8-12 minutes |

The M7.5 acceptance clock ran from fresh control at 10:59:22 UTC to the Day 2 hook at 11:07:23 UTC. It included evidence capture and development input pauses, so it is proof that the denser route can occupy the target range, not a substitute for an unbiased external user study. Key observed timings were 56.5 s to first Word completion, 31.3 s in the investigation objective, 14.7 s on the second phone check, 24.3 s market decision dwell, 3.75 s day/night transition to reveal, and 8:01 end to end.

## Game-feel scorecard

| Category | Score | Acceptance finding |
| --- | ---: | --- |
| Movement | 4 | Grounded acceleration, firmer stops, direction braking, and distinct walk/jog/sprint read clearly. |
| Camera | 4 | Exploration, phone, dialogue, and market reframing blend smoothly; no sustained clipping or jitter was observed. |
| Character animation | 3 | Distinct procedural states communicate intent, but authored clips and a skinned mesh remain final-production work. |
| Safehouse | 4 | Scale is navigable and environmental storytelling now establishes identity without expanding the map. |
| World density | 4 | Props, pedestrians, traffic, signage, and motion make the compact route feel inhabited. |
| Trap Phone | 4 | Fast hybrid presentation preserves the world, body pose, readable hierarchy, notification, and input recovery. |
| NPC presentation | 3 | Attention, facing, stance, and gestures work; final facial/body animation is intentionally absent. |
| Dialogue | 4 | Five paced, characterful lines and a follow-up beat play as a scene instead of a text clicker. |
| Market interaction | 4 | World remains visible, information is focused, and review is required before an authoritative decision. |
| Economic feedback | 4 | Cash/inventory/version changes, sound, risk copy, and consequence are clear without casino effects. |
| Educational reveal | 4 | Experience precedes terminology and deeper reading is optional. |
| Day transition | 4 | Lighting, fog, practical light, audio, reveal ordering, and notification produce a readable changed state. |
| Pacing | 4 | Meaningful observation and decision beats replaced the 3:37 rush; external first-time validation remains useful. |
| Overall flow | 4 | The slice now reads as a coherent early premium game rather than a disconnected systems demo. |

No category is below 3. Movement, Camera, Trap Phone, Market Interaction, Pacing, and Overall Flow all meet the required score of 4 or higher.

## Performance before and after

Editor-only steady runtime measurements; boot/domain reload spikes are excluded.

| Sample | Avg frame | P95 | Max | Avg FPS | Allocated | Managed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M7 post-End Day | 5.66 ms | 7.45 ms | 18.72 ms | 176.7 | 331.3 MB | 560.9 MB |
| M7.5 full route/UI aggregate | 6.73 ms | 8.53 ms | 16.55 ms | 148.6 | 312.8 MB | 550.5 MB |
| M7.5 post-End Day | 6.59 ms | 8.48 ms | 23.85 ms | 151.7 | 309.3 MB | 536.6 MB |

The added pedestrians, vehicles, procedural animation, ambience, and contextual UI cost about 0.93 ms average frame time versus the final M7 sample while reducing total allocated/managed memory in the observed session. No repeated control hitch or GC-linked pause was visible. Per-frame GC allocation was not captured, so no zero-allocation claim is made. Population quality tiers remain a future scalability control.

## Unity tests

Final CLI Test Runner results against the repaired sources:

| Suite | Total | Passed | Failed | Skipped | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| EditMode | 6 | 6 | 0 | 0 | 3.298 s |
| PlayMode | 5 | 5 | 0 | 0 | 0.091 s |
| **Combined** | **11** | **11** | **0** | **0** | **3.389 s** |

PlayMode explicitly covers the replaceable humanoid skeleton/phone state, physical interaction selection, ordered objective progression, investigation/review insertion, and Day 2 resume objective. Static compilation also passed for runtime, EditMode, and PlayMode assemblies; only the existing non-blocking `CS1701` netstandard/Newtonsoft warning remains.

Results:

- `Logs/M7_5-Final-EditMode.xml`
- `Logs/M7_5-Final-PlayMode.xml`

## API and economy regression

PASS against `http://127.0.0.1:8787` and native PostgreSQL 17.

Final adapter run `8821e96f-9b82-483b-badc-540afa2eecfe` booted in 298 ms. Buy advanced version 1 to 2 in 43 ms; an idempotent command replay retained version 3 and the exact event ID; a stale expected version 2 reconciled to authoritative version 3; Sell advanced version 3 to 4 in 22 ms; an illegal action returned `COMMAND_REJECTED/ACTION_REQUIRED`; resume restored version 4, Day 1, and cash $428; an unreachable endpoint returned `CONNECTION_LOST` while preserving confirmed state.

PostgreSQL independently reports version 4, four accepted commands with four distinct command IDs, 16 events with 16 distinct event IDs, and the approved `economy-v2.m5.6` / `balance-v2.m5.6.1` versions. No backend or economy code was changed for M7.5.

The visible gameplay run also used the real API. Run `5fc88d41-7d16-4d98-836a-068bd19d60df` advanced from version 1 to 3, Day 2, cash $438, and three actions. A full Play stop/start restored those exact values and the same run ID.

## Defects

### Blocker

None.

### High

None.

### Medium

- `M7.5-M001`: Character and NPC motion are procedural greybox performances, not authored mocap/keyframe clips on final skinned characters. Score impact: Character Animation 3, NPC Presentation 3.
- `M7.5-M002`: The 8-12 minute target is supported by the instrumented route and authored density, but still needs an unbiased first-time external playtest before investor-session scheduling.
- `M7.5-M003`: Ambient population has deliberately small fixed counts; LOW/MEDIUM/HIGH quality-tier authoring is deferred.

### Low

- `M7.5-L001`: World-space signage can be read from its back side at unusual acceptance-camera angles.
- `M7.5-L002`: No continuous video was created. The available machine had no practical capture tool configured; nine ordered real screenshots plus analytics/runtime logs provide evidence.
- `M7.5-L003`: Final music, authored ambience, final meshes, textures, facial performance, and animation clips are correctly deferred to visual production.
- `M7.5-L004`: Existing nullable-context/static compilation warnings remain non-blocking.

### Fixed during acceptance

- `M7.5-F001`: End Day could leave the phone open when the network response won a 200 ms opening-animation race, stacking phone and education UI. `Close()` now interrupts the opening coroutine and completes the close transition.
- `M7.5-F002`: The original local-reset shortcut conflicted with a Unity shortcut. It now uses `Ctrl+Alt+G`, and clue inspection has a dedicated Editor-only acceptance command.

## Evidence

Real frames in `docs/evidence/m7_5/`:

1. `01-improved-safehouse.png`
2. `02-humanoid-player.png`
3. `03-street-neighborhood.png`
4. `04-trap-phone.png`
5. `05-npc-conversation.png`
6. `06-market-interaction.png`
7. `07-consequence-reveal.png`
8. `08-night-state.png`
9. `09-day-two-hook.png`

No image was fabricated. Frames 3-9 were cropped directly from the maximized live Unity Game view where capture-index troubleshooting made `ScreenCapture` ordering unreliable. A continuous video was not practical in this environment and is not claimed.

## Files modified

M7.5 implementation is contained in:

- Player: `HumanoidGreyboxRig.cs`, `CharacterAnimationDriver.cs`, `ThirdPersonMotor.cs`, `ThirdPersonCameraRig.cs`.
- World: `GreyboxWorldBuilder.cs`, `GreyboxInteractables.cs`, `VerticalSlicePresentation.cs`.
- Flow/presentation: `ObjectiveDirector.cs`, `TrapPhoneController.cs`, `MarketController.cs`, `DialoguePresenter.cs`, `EducationRevealPresenter.cs`, `DayNightPresenter.cs`.
- Feedback/tools: `GreyboxHud.cs`, `UiFactory.cs`, `DevToolsOverlay.cs`, `ServiceContracts.cs`, `ProceduralAudioService.cs`, `GameBootstrapper.cs`.
- Verification: `M7AcceptanceTools.cs`, `M75PlayModeTrigger.cs`, `GreyboxFlowTests.cs`, final XML test results, and `docs/evidence/m7_5/*.png`.
- Documentation: `M7_5_GAME_FEEL.md`, `M7_5_GAME_FEEL_ACCEPTANCE.md`, `UNITY_ARCHITECTURE.md`, `UNITY_GREYBOX_M7.md`, `UNITY_VERTICAL_SLICE.md`, and the supersession note in `M7_RUNTIME_ACCEPTANCE.md`.

Unity-generated `.meta` files for new runtime/Editor sources are included. No backend, database migration, economy-engine, balance, Base, token, NFT, multiplayer, combat, driving, city, or final-art source was changed for M7.5.

## Technical debt

- Replace procedural transform bodies with final skinned characters and authored clips through the existing animation boundary.
- Add environment LOD/population tiers before web/mobile performance certification.
- Validate stairs, slopes, and more constrained camera geometry when final environment modules exist.
- Run external first-time and replay-intent studies using the new timing analytics.
- Replace procedural audio with licensed production sound/music while preserving cue contracts.
- Add per-frame GC allocation capture in a development player, not only Editor totals.

## Final status

**M7.5 ACCEPTED**

The milestone satisfies its minimum scorecard, preserves authoritative architecture, passes all 11 Unity tests, passes real API/PostgreSQL conflict/idempotency/rejection/resume/network-loss regression, and has no blocker or high defect.

## Recommended next milestone

**M7.5 ACCEPTED -> M8, pending owner approval.**

Do not begin M8 automatically.
