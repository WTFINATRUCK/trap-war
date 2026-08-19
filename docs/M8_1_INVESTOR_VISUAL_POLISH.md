# Trap Wars V2 - M8.1 Investor Visual Polish

## Scope

M8.1 was limited to presentation quality inside the accepted Day 1 vertical slice. It did not add Base, tokens, NFTs, a marketplace, cities, multiplayer, combat, driving, economy changes, backend redesign, or map expansion.

## Implemented Work

### Rig and characters

- Repaired the Quaternius source hierarchy before runtime prefab generation: upper legs are parented to Hips and feet to their lower legs.
- Generated five persistent Humanoid avatars and processed runtime prefabs for Hero, Ray, and three crowd roles.
- Added a hard editor validator for avatar validity, Humanoid status, required bones, source animation compatibility, scale, mesh height, and root chain.
- Enabled Animator IK passes and added bounded two-hand phone IK, a physical handset/screen prop, and phone-directed look-at.
- Added restrained head performance as the no-blend-shape facial fallback.
- Retuned roughness/metallic defaults without multiplying unique world materials aggressively.

### Animation

- Preserved controller-driven movement and disabled root motion.
- Retargeted the existing Humanoid animation source to all five processed characters.
- Used the strongest available `Working` and authored action clips for phone/dialogue/interact states.
- The source pack does not include production phone draw/put-away, greeting, listening, explaining, reactions, starts, stops, or turns. These remain external requirements.

### Environment and lighting

- Added route lane markings, a Hub crossing, curb edges, Hub/Ray focal lights, and a safehouse desk fill.
- Removed the duplicate procedural bench beneath the production bench asset.
- Corrected mirrored Hub and Mercado signage.
- Raised day fill and softened directional shadow strength.
- Rebuilt the night balance around a cool readable key, higher ambient fill, lower fog density, warmer practicals, and a tightly ranged player fill.
- Limited High quality practical shadows to the important non-point key. The final run emitted no shadow-atlas pressure warning.

### Audio

- Replaced 10 synthetic interaction cues and the single synthetic footstep with 15 selected authored OGG clips.
- The cues cover UI, phone open/close, trade, transition, door, dialogue tick, invalid action, investigation, consequence, and five concrete footsteps.
- Source packs: Kenney Interface Sounds, Impact Sounds, and RPG Audio, all CC0. Their original license files ship beside the clips.
- Neighborhood ambience and music remain temporary procedural beds. They are not represented as final audio production.

### Capture and presentation

- Added a deterministic M8.1 screenshot composition route with the 12 required runtime states.
- Captured a continuous, uncut 75-second Unity Play Mode route at 1920x1200/30 FPS.
- The route is technical composition evidence. It is not a first-time human playtest and is not used as proof of the 8-12 minute pacing target.

## Asset Provenance

| Asset | Source | License | Runtime use |
|---|---|---|---|
| Interface Sounds 1.0 | https://kenney.nl/assets/interface-sounds | CC0 | UI, phone, validation, transition |
| Impact Sounds 1.0 | https://kenney.nl/assets/impact-sounds | CC0 | Concrete footsteps |
| RPG Audio 1.0 | https://kenney.nl/assets/rpg-audio | CC0 | Trade and door |
| FFmpeg Windows essentials | https://www.gyan.dev/ffmpeg/builds/ (linked by ffmpeg.org) | GPL build; capture tool only, not shipped | Evidence capture |

## Performance Guardrails

| Metric | M8 baseline | M8.1 final Development Player |
|---|---:|---:|
| FPS | 123.1 | 132.1 |
| Average frame | 8.13 ms | 7.57 ms |
| P95 frame | 10.51 ms | 9.52 ms |
| Max frame | 15.57 ms | 11.70 ms |
| Renderers | not recorded | 165 |
| Skinned renderers | 5 | 5 |
| Triangles | not recorded | 34,834 |
| Allocated memory | not recorded | 91.2 MB |
| Managed memory | not recorded | 5.2 MB |
| Allocation growth over sample | not recorded | 23.6 MB |
| GC collections over 20 seconds | not recorded | 30 |

The final profile used Unity 6000.3.20f1, Windows Development Player, High quality, 1280x720, and Intel Iris Xe. The screenshot route reported 107 distinct runtime materials versus the prior 103-material reference, an increase of four.

## Platform Risk Review

### Web

- Humanoid rigs and five skinned characters are modest, but runtime material cloning should be replaced by authored shared variants before Web production.
- Streaming texture settings are appropriate, but source FBX/runtime duplication should be stripped from a Web-specific build.
- OGG cues are small; generated ambience/music allocate runtime clips and should become imported compressed assets.
- URP post-processing and additional lights require a Web quality profile and GPU validation.

### Mobile

- Preserve the Low/Medium population and shadow tiers.
- Replace point practicals with baked/emissive support where possible.
- Keep future Hero/Ray rigs near the budgets in the external-art document and validate skinning on target devices.
- Facial blend shapes will add vertex/memory cost; cap active shapes and profile representative hardware.

## Visual Review

The pass improves correctness, readability, focal points, signage, phone staging, night visibility, and audio tactility. It does not make the current Quaternius cast or modular block investor-final. The largest remaining issue is asset quality and stylistic mismatch, not pipeline capability.

Final recommendation: **M8.1 PIPELINE ACCEPTED — EXTERNAL HERO ART BLOCKER**.

