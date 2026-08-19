# Development Environment Repair

## Character Movement Root Cause

The Hero did not contain a live ragdoll. The runtime prefab had zero rigidbodies, joints, or bone colliders; `ThirdPersonMotor` and `CharacterController` were the sole translation authority and `Animator.applyRootMotion` was false. The defect was the imported animation configuration: every source clip had `loopTime=false`. Walk froze after 1.0 seconds and run after 0.625 seconds while the controller continued translating, leaving the body in an arbitrary stride pose that read as ragdoll-like movement.

## Character Movement Fix

`M8AssetPipeline` now configures the animation source reproducibly before rebuilding controllers. Idle, walk, run, and the sustained working pose loop with loop blending; all clips lock root rotation, height, and XZ translation for controller-driven in-place locomotion. `CharacterAnimationDriver` delegates production animation state to one presenter instead of writing the same Animator parameters twice. PlayMode coverage asserts looped in-place clips, no ragdoll components, and disabled root motion.

The uninterrupted open-street lane validated idle, analog walk, stop, jog, sprint, stop, 90-degree turn, 180-degree direction change, diagonal movement, and phone open/close. Recorded distances were 6.81 m walk, 13.66 m jog, 22.84 m sprint, 10.78 m right turn, 7.86 m reverse, and 11.04 m diagonal. Visual score: idle 4/5, walk 4/5, jog 4/5, sprint 4/5, turn 4/5, stop 4/5, phone transition 4/5.

Evidence: `docs/evidence/dev_environment/MOVEMENT_ACCEPTANCE_STREET_UNINTERRUPTED.mp4`, 34.97 seconds, 1920x1200 H.264, SHA-256 `13A50F3DA61AD675A1F1D5D502B0432CCEFCBBFA395BA5AAA0848009D1BECBC6`.

## Unity Hub Root Cause

The real project had not been registered in Unity Hub. Command-line and direct Editor launches do not populate Hub's Projects list.

## Unity Hub Fix

Unity Hub now points to the existing `game\unity` root and associates it with `6000.3.20f1`. No duplicate or upgrade was created. See `UNITY_HUB_REPAIR.md`.

## GitHub Root Cause

Local `main` and `origin/main` both remained at `6b3592b7275e691eb2bcc4cc288af390db6c0b6d` with zero commits ahead/behind. The M0-M8.2B rebuild existed as 629 untracked files plus tracked package/config changes; local file edits had never been staged, committed, or pushed.

## GitHub Fix

The controlled checkpoint includes Unity source and metadata, backend source, economy-engine source and calibration records, architecture/acceptance docs, and intentional LFS evidence. Local secrets, Unity-generated state, standalone builds, and scratch artifacts remain ignored. The checkpoint is pushed normally to `origin/main`; no force push or history rewrite is used.

## Git Status Before

- Branch: `main`, tracking `origin/main`
- HEAD: `6b3592b7275e691eb2bcc4cc288af390db6c0b6d`
- Ahead/behind: 0/0
- Tracked files at HEAD: 90
- Modified tracked content files: 4, plus four bundle files reported by worktree metadata
- Untracked files: 629
- Nested repositories: none

## Git Status After

- Local checkpoint commit: `108c88563062c030d9860cf27a5366fe45974ada`
- Local branch after checkpoint: `main`, one commit ahead of `origin/main`
- Remote publication: pending GitHub authentication and remote verification

## Remote Commit

Pending the controlled checkpoint push. M8.3 remains blocked until the remote SHA is verified.

## Test Results

- Unity EditMode: 6/6 passed
- Unity PlayMode: 9/9 passed
- Clean Windows x64 build: succeeded, non-development, no debugging, 107,697,121 bytes
- Real PostgreSQL/API: boot, buy, idempotency replay, stale conflict/reconciliation, sell, rejection, save/resume, and network failure passed
- Unity Hub open: passed at the exact project path with Unity `6000.3.20f1`
- Paced Play Mode route: passed in `538` seconds; phone, clue, Ray dialogue, market buy, end-day, Day 2 reveal, and performance logging completed with runner exit code `0`

## Remaining Risks

- The zero-budget character art retains oversized stylized heads, no facial blend shapes, and generic authored motion; these are the accepted M8.2B art ceiling, not locomotion defects.
- The repository remains under OneDrive. No conflict copies, placeholder failures, or duplicate repositories were found, but a future non-synced local development path is recommended if file-locking or hydration issues appear.
- Hub shows the project-root folder label `unity`; the exact path, product name, and editor version identify the Trap Wars project.
