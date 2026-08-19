# M8 Animation Pipeline

## Controller contract

Gameplay publishes `Speed`, `Grounded`, `Sprint`, `Phone`, `Dialogue`, and trigger-based interaction intent through presentation interfaces. Role-specific controllers can be replaced without changing movement, objectives, API behavior, or economy code.

## Current authored source

The CC0 Quaternius animation source contains nine imported clips, including idle, walk, run, punch, work, jump, and death motions. M8 generates five controllers with an Idle/Walk/Run blend tree and temporary mappings for phone, dialogue, and interaction. Those substitute mappings prove integration only and are not final performance animation.

## Root motion

Trap Wars uses in-place locomotion for exploration. `ThirdPersonMotor` remains authoritative for responsive motion and collision. Root motion may be enabled only for short, constrained presentation beats with explicit motor handoff. Individual vendor clips cannot silently change locomotion authority.

## IK and look behavior

- Foot IK: future ground contact correction for slopes, stairs, and curbs.
- Hand IK: phone grip and authored interaction targets.
- Head/eye aim: bounded attention target with artist-authored limits.
- Full-body IK is not required for Day 1 and must not replace authored animation.

Current head attention is active for Ray; final foot/hand IK and authored starts, stops, turns, phone actions, listening, gestures, reactions, and idle variations remain M8.x work.

M8.2B eases the existing two-hand phone IK over time, keeps the handset visible until the close blend completes, adds occasional attention breaks, and applies small role-bounded Ray dialogue and Hero interaction gestures after the retargeted pose. This removes the most visible phone pop and improves conversational life, but it does not replace the missing authored motion library.

## Facial and lip sync

Preferred workflow is automated viseme generation plus artist cleanup, stored as clip-aligned data independent of the dialogue audio vendor. Subtitles remain authoritative and skippable. Final voice clips, viseme maps, expressions, blinks, and gaze tracks should share a dialogue performance asset. No proprietary lip-sync dependency has been selected.
