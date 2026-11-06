# Trap Wars - Hero And Ray Animation Brief

## Technical Standard

- Unity Humanoid-compatible FBX at 30 or 60 FPS; source rig/files where contracted.
- State in-place versus root-motion per clip; gameplay remains controller-driven and root motion is disabled for locomotion.
- Stable scale/hips, clean loops, blend-safe endpoints, grounded feet, restrained hands, and no visible retarget collapse.
- Phone clips must align to the supplied handset dimensions and two-hand IK targets without body, clothing, face, or hand clipping.

## Clip Package

### Shared Locomotion

Idle A, idle B, walk, jog, sprint, start forward, stop, turn left, turn right.

### Hero-Specific

Phone draw, phone hold, phone interaction, phone put-away, generic interact, transaction/outcome reaction, consequence reaction.

### Ray-Specific

Greeting, listening A, listening B, explaining A, explaining B, skeptical reaction, positive reaction, dismissive reaction, conversation exit.

Target 22-28 production-useful clips. Quality and coverage matter more than padding the count.

## Four-Clip Evaluation Milestone

Do not authorize the full set before Unity acceptance of:

1. Walk.
2. Stop.
3. Hero phone draw.
4. Ray explaining gesture.

Review retarget quality, stride/foot contact, hips, turns, blend transitions, phone contact, acting specificity, scale, speed, and source/export consistency.

## Performance Direction

Hero movement is alert and capable, not exaggerated. Phone use is familiar and efficient. Ray's acting is calm, economical, and varied: real listening, small shifts in thought, selective gestures, and no constant hand waving or robotic head tracking.

## Capture/Authoring Options

| Option | Quality potential | Cleanup burden | Compatibility | Cost class |
|---|---|---|---|---|
| ActorCore/commercial foundation | Strong locomotion base | Retarget and style cleanup | Good after license/rig test | Moderate |
| Rokoko-type body capture | Strong rapid custom blocking | Contact, prop, finger, curve cleanup | FBX/Humanoid test required | Moderate-high |
| Move AI-type video capture | Useful dialogue/body capture | Occlusion, feet, hands, smoothing | FBX/Humanoid test required | Moderate-high |
| Keyframe animator | Highest precise phone/acting control | Artist time | Excellent with supplied rig | High/custom quote |
| Professional mocap stage | Highest body-performance capture | Solve/cleanup and prop coordination | Vendor-specific | High/custom quote |

No option is pre-approved. Require the same four-clip milestone and rights/source review.

