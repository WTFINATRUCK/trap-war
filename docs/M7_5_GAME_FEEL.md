# Trap Wars V2 - M7.5 Game Feel

Status: implementation complete and runtime accepted on 2026-08-17.

M7.5 improves the existing Day 1 vertical slice without changing the M6 authoritative runtime, M5.6 economy balance, or approved client/server boundary. M8, Base, tokens, NFTs, multiplayer, combat, driving, new cities, and final art remain out of scope.

## Experience direction

The slice remains one compact home block. Added play time comes from observation, character performance, a required opportunity review, optional investigation, richer dialogue, and consequence presentation rather than slower movement or artificial waits.

The visual direction is a clean premium base with restrained street identity: dark ink surfaces, paper text, green state accents, gold attention accents, cultural signage, and readable numbers. The implementation avoids crypto gradients and dense dashboard presentation.

## Character and locomotion

`HumanoidGreyboxRig` replaces the capsule presentation with a named, replaceable transform hierarchy for hips, chest, neck, head, limbs, shoes, and phone prop. It is intentionally a legal-safe procedural greybox, not final art. `CharacterAnimationDriver` remains the stable boundary for a future skinned mesh, Animator Controller, and retargeted clips.

Presentation states include idle breathing and weight shift, walk, jog, sprint, turn lean, stop settle, phone pose, generic interaction reach, dialogue posture, and restrained dialogue gestures. Locomotion now uses 2.15 m/s walk, 4.05 m/s jog, 5.8 m/s sprint, 19 m/s2 acceleration, 28 m/s2 deceleration, direction-change braking, and smoother rotation.

## Camera

The third-person camera has smooth contextual states for exploration, phone, dialogue, and market. Each state blends distance, shoulder offset, height, and FOV rather than cutting cameras. Exploration supports delayed movement-aware recentering, and the existing sphere cast continues to handle camera collision.

## World and safehouse

The safehouse now contains a bed, rug, desk, monitor, envelope, dresser, charger, wall art, mirror, note, phone point, and stash point. The threshold adds door motion, a street ambience transition, audio, feedback, and an objective change.

The same compact street gains parked cars, two lightweight moving traffic passes, three ambient pedestrians with distinct routes and timings, bins, hydrants, a bench, stoops, fence pieces, a basketball hoop, storefront/market signage, and subtle world motion. No map acreage or driving system was added.

## Phone, NPC, and market

The phone uses a hybrid approach: character phone pose plus a readable right-side UI while the 3D world remains visible. Open/close motion is quick, camera framing is subtle, controls return cleanly, and Day 2 uses one meaningful badge/audio cue. Home, Word, Stash, and Contacts remain the only core views.

Ray now acknowledges the player, turns with bounded smoothing, changes stance for conversation, gestures between lines, and returns to idle. Five paced lines give him neighborhood knowledge, confidence, opinion, and a concise risk perspective. A follow-up beat is observable through analytics.

The market is a contextual right-side surface with the world preserved. It exposes only quote, owned amount, cash, action cost, risk, and known context. `Review the Play` is a required beat before Buy/Sell becomes available. Accepted trades provide restrained sound, cash delta, inventory/version feedback, and world continuity.

## Investigation and learning

Three small street clues are available at the delivery board, empty crates, and corner activity. Any clue can advance the investigation; skipping remains legal and causes Ray to acknowledge the missing context. The sequence is now:

1. Check Word.
2. Leave the safehouse.
3. Read the block.
4. Meet Ray.
5. Review the opportunity.
6. Make a move.
7. See the market outcome.
8. End Day.
9. Review the liquidity insight.
10. Check the Day 2 notification.

The education layer first states what happened in street language, then names LIQUIDITY and offers an optional `DIG DEEPER` panel. It does not block continued play with required long-form reading.

## Audio and analytics

All temporary sound is synthesized at runtime by `ProceduralAudioService`: layered neighborhood ambience, footsteps, phone open/close and notification, door, dialogue, investigation, valid/invalid action, trade, consequence, and day transition cues. No external licensed art, animation, music, or audio asset was embedded.

Focused M7.5 observations include `world.optional_interaction`, `world.location_dwell`, `npc.followup_selected`, `phone.session_duration`, `market.decision_dwell`, `objective.step_completed`, and `player.returned_to_phone`. These remain non-authoritative client observations. PostgreSQL-backed commands/events remain economic truth.

## Development instrumentation

The development overlay reports FPS, average/P95/max frame time, allocated memory, player speed, objective, interaction target, phone state, run/version/day, and current route segment. Editor-only acceptance commands reproduce movement, camera, clue, dialogue, market, end-day, logging, and evidence states. Batch mode still skips gameplay bootstrap so Test Runner fixtures remain isolated.

## Replacement path

M8 can replace the procedural humanoid, materials, synthesized cues, and modular props without changing the motor, camera contexts, interaction contracts, authoritative services, objective progression, or analytics boundary. This milestone deliberately proves feel and direction before final asset production.
