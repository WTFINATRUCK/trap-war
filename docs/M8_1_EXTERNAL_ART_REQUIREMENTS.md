# Trap Wars V2 - M8.1 External Art Requirements

## P0 - Required for Investor Quality

### Custom Hero Character

- **Target:** Grounded contemporary streetwear, believable adult proportions, readable face, strong silhouette, culturally specific without stereotypes, no visible third-party branding.
- **Format:** FBX 2020+ or Unity-ready prefab; separate skinned body/clothing/accessory meshes; authored material slots.
- **Rig:** Unity Humanoid, T-pose or documented A-pose, complete required bones, stable root, optional twist bones, reusable Avatar, no non-uniform root scale.
- **Geometry:** 45k-80k triangles total at LOD0; authored LOD1/LOD2 targeting roughly 50%/20%; maximum four skinned renderers preferred.
- **Textures:** 2K skin/head and outfit sets; 1K accessories; URP-compatible base color, normal, mask/metallic, roughness/smoothness, and optional AO.
- **Face:** Eyes, brows, mouth interior, teeth, tongue where needed; blink L/R, jaw open, smile, frown/concern, brow up/down, and reusable visemes.
- **Quantity:** One production Hero plus one curated outfit, footwear, watch/jewelry set, and optional removable cross-body/accessory layer.
- **Constraints:** Must preserve the existing 1.82 m gameplay height, CharacterController footprint, third-person camera, phone IK targets, and controller-driven locomotion.

### Custom Ray Character

- **Target:** Calm authority, neighborhood familiarity, age/personality distinction, clearly different silhouette/posture/palette from Hero.
- **Technical specification:** Same rig, facial, LOD, texture, and import standards as Hero.
- **Quantity:** One production Ray, one outfit, one restrained accessory set.
- **Constraints:** Must support dialogue look-at, listening/explaining poses, and the current Ray interaction footprint.

### Facial and Lip-Sync Set

- **Target:** Natural blink, jaw/mouth movement, smile, concern, brow performance, and a reusable short English viseme set.
- **Convention:** ARKit-compatible names are preferred where practical; otherwise provide an explicit mapping table.
- **Delivery:** Blend shapes in the character FBX plus one test Timeline/clip and one legally cleared Ray voice line with timing markers.
- **Constraint:** Keep active blend-shape count bounded for Web/mobile risk; no bone hierarchy changes after animation lock.

### Authored Hero/Ray Motion Pack

- **Hero clips:** idle variants, walk, jog, sprint, start, stop, left/right turn, phone draw, hold, put-away, generic interact, transaction reaction, End Day settle.
- **Ray clips:** idle variants, greeting, listening, explaining, skeptical reaction, conclusion.
- **Format:** Humanoid FBX clips at 30 or 60 FPS with source files and clear in-place/root-motion designation.
- **Quality:** No foot slide, stable scale/hips, clean loops, phone alignment compatible with IK, blend-safe first/last poses.
- **Approximate quantity:** 16-20 Hero clips and 6-8 Ray clips.

## P1 - Strong Improvement

### Safehouse Hero Props and Surfaces

- One authored bed, desk/chair set, phone charging station, wardrobe/storage group, window treatment, and 8-12 identity props.
- 1K-2K shared trim/atlas materials with consistent concrete, painted wall, wood, textile, plastic, and metal response.
- Preserve the current room footprint and gameplay colliders.

### Street/Hub Hero Kit

- Two storefront hero facades, one memorable Hub counter/sign kit, curb/road patch decals, utility cluster, and two believable parked vehicle variants.
- Modular dimensions must match the existing block; no map expansion.
- Shared 1K-2K atlases, trim sheets, and decals preferred over unique 4K materials.

### Production Audio

- Layered safehouse room tone and street neighborhood ambience: distant traffic, occasional pass-by, restrained voices, HVAC/electrical bed, and sparse siren/music bleed.
- Final phone open/close/notification, trade, consequence, Day transition, and three-surface footsteps (interior, sidewalk, street).
- Delivery: 48 kHz/24-bit WAV masters plus Unity OGG/ADPCM recommendations; seamless loops with documented loop points.
- Music: 2-3 legally cleared adaptive stems totaling 3-5 minutes, with safehouse/street/market/night intensity states.
- Voice: one Ray proof line first, then the accepted Day 1 script after casting approval.

## P2 - Post-Funding

- Additional clothing variants and crowd silhouettes.
- Full facial performance pass for all secondary NPCs.
- Expanded vehicle/prop variation outside investor-facing frames.
- Final mix/master, localization-ready voice pipeline, and broader adaptive score.

## Integration Acceptance

External deliveries are accepted only after the existing M8.1 rig validator passes, phone IK survives all relevant clips, Hero/Ray remain readable under five lighting contexts, High quality stays above the project frame-time guardrail, and Low/Medium tiers preserve their population/shadow behavior.

## M8.2 Procurement Status - 2026-08-18

No requirement in this document is marked fulfilled by M8.2. Reviewed free/open candidates either missed the investor-facing character direction or required substantial custom character production; paid candidates and commercial avatar accounts were not owner-authorized. No weak generic replacement was imported.

| Requirement | Status | M8.2 result |
|---|---|---|
| Custom Hero Character | OPEN / BLOCKING | No 4/5 art-directed Hero acquired. |
| Custom Ray Character | OPEN / BLOCKING | No visually distinct 4/5 Ray acquired. |
| Facial and Lip-Sync Set | OPEN / BLOCKING | No approved blend-shape/viseme meshes or voice proof. |
| Authored Hero/Ray Motion Pack | OPEN / BLOCKING | No complete role-specific motion delivery acquired. |
| Safehouse Hero Props and Surfaces | OPEN | Deferred until approved character visual level is known. |
| Street/Hub Hero Kit | OPEN | Deferred until approved character visual level is known. |
| Production Audio | OPEN | Existing cues remain useful; layered ambience, music, and Ray voice are not production candidates. |

Procurement research and license notes are recorded in `docs/M8_2_ASSET_PROVENANCE.md`. The accepted M8.1 runtime and its asset classifications remain unchanged.
