# Trap Wars V2 - M8.2A Procurement Plan

## Purpose And Guardrails

Convert the accepted M8.2 art gap into a controlled purchase/commission process. No purchase, quote acceptance, account creation, commission, or license agreement is authorized by this document. M8.2B and M9 remain unauthorized.

The next character must reach an honest 4/5 in Trap Wars, not merely improve on the placeholder. Technical acceptance never replaces owner approval of Hero visual, Ray visual, and art-style match.

## Priority Deliverables

| Priority | Deliverable | Acceptance outcome |
|---|---|---|
| P0 | Hero and Ray as one coherent character package | Two distinct grounded semi-realistic leads, each 4/5+, Unity Humanoid, production materials, LODs, and facial capability |
| P0 | Facial/viseme package | Blink, jaw/mouth, brows, key expressions, reusable visemes, documented names/mapping |
| P0 | Authored motion | 22-28 useful clips; four-clip evaluation first; phone and Ray dialogue performance included |
| P1 | Ray voice proof | Approved human performance, usage rights, timing markers, runtime lip-sync test |
| P1 | Safehouse/street hero art | Only high-exposure furniture, surfaces, facade, road, vehicle, and Ray-area assets |
| P1 | Audio production candidates | Layered ambience, traffic/human activity, cues, transition, and replaceable music beds |
| P2 | Expansion-ready art | Wardrobe variants, secondary faces, crowd variety, portrait/PFP rendering compatibility, final mix/localization |

## Contracted Character Budgets

- Unity 6000.3.20f1, URP 17.3, 1 unit = 1 meter, 1.82 m runtime presentation target.
- FBX 2020+ plus agreed editable sources; documented T-pose or A-pose.
- Valid Unity Humanoid avatar with the required paired arm/hand and leg/foot chains, hips, spine, neck, and head.
- LOD0: 45k-80k triangles total per lead; LOD1 near 50%; LOD2 near 20%.
- Maximum four skinned renderers preferred and twelve material slots maximum at LOD0.
- 2K skin/head and outfit maps; 1K accessories; URP base color, normal, mask/metallic, smoothness/roughness, and optional AO.
- Separate or swappable clothing/accessory structure where contracted; named sockets for phone, watch/jewelry, and future accessories.
- Face inventory and naming must satisfy `docs/vendor/FACIAL_RIG_SPEC.md`.
- No non-uniform root scale, broken bind pose, undocumented helper hierarchy, or visible third-party brand/celebrity dependency.

## Tier A - Lean / Production-Candidate

**Cost class:** moderate. **Quality ceiling:** 4/5 only with disciplined selection and targeted artist work.

Buy a strong game-ready human base and properly licensed commercial motion foundation. Commission one artist to reshape faces, create original Hero/Ray outfits and materials, establish differentiation, and deliver the required face inventory. Buy or license generic locomotion; commission phone and Ray performance clips.

This tier is credible only if the same art owner controls both characters and the paid evaluation package passes. Reject it if the chosen base cannot support original-looking faces/clothing, clean Unity export, LODs, or the required license.

## Tier B - Hybrid Custom

**Cost class:** moderate-high/custom quote. **Quality ceiling:** strong 4/5, potentially 5/5 in hero frames.

Use a proven human topology/rig platform, then commission Hero and Ray together: custom faces, hair, clothing, materials, accessories, facial shapes, LOD review, and Unity handoff. Use a licensed locomotion base plus custom phone, reaction, and Ray dialogue performances. Commission a human Ray voice test and focused sound-design pass.

This is the recommended balance. It spends custom effort on identity and performance while avoiding two full body/topology/rig builds from zero.

## Tier C - Bespoke Hero Production

**Cost class:** high/custom quote. **Quality ceiling:** 5/5 if the vendor and direction are strong.

Commission concept art, sculpt, retopology, UVs, textures, hair, clothing, accessories, Humanoid rig, facial rig/visemes, LODs, authored motion, Ray performance, and optional voice integration. Use milestone approvals from concept through Unity evaluation. Prefer clearly assigned ownership or broad perpetual commercial rights and editable source delivery.

Choose this tier when distinctive long-term IP and portrait/wardrobe expansion justify the cost and schedule.

## Practical Shortlist

### Character Approaches

| Approach | Strength | Weakness/risk | Cost | Ceiling |
|---|---|---|---|---|
| Reallusion Character Creator/ActorCore base plus one custom character artist | Unity/Mecanim export, facial morph and LOD tooling, established game pipeline | Content-license tier must be checked item by item; stock look remains unless faces/clothes/materials are substantially customized | Moderate-high | 4-5 |
| Custom Blender/Maya/Substance artist or small studio using its own clean base | Best control of identity, fashion, source files, and rights | Portfolio vetting, schedule, rig/face QA, and revision discipline are critical | Custom quote/high | 5 |
| Daz base plus game-character technical artist | Broad human/clothing ecosystem and useful starting anatomy | Interactive licenses can apply per product/artist; optimization, Unity rig, materials, and asset-pack look require work | Moderate-high | 4 |
| Unity Asset Store base plus customization artist | Fast Unity proof and straightforward package intake | EULA/source-file limits and generic visual identity; often weak facial/LOD/source coverage | Low-moderate plus custom work | 3-4 |

The previously rejected Rocketbox, Ready Player Me, MakeHuman-as-drop-in, MHR-as-drop-in, Ravi-only, and G2-only paths remain unsuitable as complete Hero/Ray solutions.

### Motion Approaches

| Approach | Strength | Weakness/risk | Cost | Ceiling |
|---|---|---|---|---|
| ActorCore foundation plus custom animator cleanup/acting | Broad reusable motion base and game licensing | License restrictions must be retained; stock gestures alone will not carry Ray | Moderate | 4 |
| Rokoko capture plus experienced cleanup animator | Fast body-performance iteration and FBX pipeline | Capture quality, fingers, contacts, props, and cleanup skill vary | Moderate-high | 4-5 |
| Move AI/video mocap plus animator cleanup | Low physical setup and useful dialogue/body reference | Occlusion/foot/hand cleanup and service terms require review | Moderate-high | 4 |
| Keyframe animator or professional mocap studio | Highest control over phone contact, timing, and acting | Highest cost/schedule; needs exact direction and rig handoff | High/custom quote | 5 |

### Audio/Voice Approaches

| Approach | Strength | Weakness/risk | Cost | Ceiling |
|---|---|---|---|---|
| Licensed production library plus human Ray actor | Efficient ambience/cues with authentic performance where it matters | Multiple licenses and mix consistency require tracking | Moderate | 4 |
| Boutique sound designer/composer plus separately cast Ray | Cohesive sonic identity and replaceable stems | More coordination and revision management | Moderate-high | 4-5 |
| Single audio studio covering design, music, casting, and mix | One accountable delivery owner | High cost; rights and source/stem delivery must be explicit | High/custom quote | 5 |

## Procurement Cost Control

| Item | Priority | Buy vs commission | Dependencies | Cost class | Owner approval | Status |
|---|---|---|---|---|---|---|
| Human base/tool licenses | P0 | Buy | Selected Tier A/B workflow | Moderate | Required | HOLD |
| Hero identity/outfit/materials | P0 | Commission | Approved concept/approach | Moderate-high | Required | HOLD |
| Ray identity/outfit/materials | P0 | Commission | Approved concept/approach | Moderate-high | Required | HOLD |
| Facial shapes/visemes | P0 | Commission/included | Final topology | Moderate | Required | HOLD |
| Locomotion foundation | P0 | Buy or commission | Approved skeleton | Low-moderate | Required | HOLD |
| Four motion test clips | P0 | Paid evaluation | Evaluation rigs | Moderate | Required | HOLD |
| Remaining motion package | P0 | Commission | Four-clip pass | Moderate-high | Required | HOLD |
| Ray audition/voice proof | P1 | Commission | Approved Ray brief/script | Low-moderate | Required | HOLD |
| Hero-frame environment assets | P1 | Buy/customize | Character style locked | Moderate | Required | HOLD |
| Ambience/cues/music | P1 | Buy/commission | Audio direction | Moderate | Required | HOLD |

Review the aggregate quote before approving individual small purchases. A fragmented Tier A must not quietly cost more than a cleaner Tier B package.

## Vendor Delivery Workflow

1. **Concept/approach approval:** front and three-quarter Hero/Ray direction; silhouette, wardrobe, palette, and differentiation.
2. **High-poly/design approval:** face, anatomy, hair, clothing construction, accessories, and no-brand review.
3. **Game-ready model:** topology, UVs, textures, material slots, modularity, and measured budgets.
4. **Rig/face test:** Humanoid FBX, required bones, named facial inventory, and neutral expression.
5. **Paid Unity evaluation:** both candidate meshes plus walk, stop, phone draw, and Ray explaining gesture.
6. **Final delivery:** approved revisions, LODs, all clips, sources, license/rights documents, and delivery manifest.

Do not assume full upfront payment. Use milestone payments where vendor/platform norms permit. Define revision count, review time, change-order rules, cancellation, and what files are retained at each milestone.

## Mandatory Evaluation Package

- Hero and Ray production-candidate FBX/prefabs with textures, materials, rigs, and facial samples.
- One locomotion and one interaction/dialogue sample at minimum; the requested motion gate is walk, stop, phone draw, and Ray explaining.
- License draft or platform EULA links, source-file list, tool/version manifest, third-party dependencies, and known restrictions.
- Vendor-provided triangle/material/texture/bone/blend-shape/LOD inventory.
- Permission to evaluate in Unity and produce private investor-review screenshots/video.

Run `Trap Wars > M8.2A > Character Evaluation`, assign the candidate assets, build the scene, validate, then capture the eleven review cameras after the supplied poses are applied. Automated PASS is necessary but not sufficient.

## Unity Intake Tool

- Scene: `game/unity/Assets/Scenes/M8_2A_CharacterEvaluation.unity`.
- Editor window: `Trap Wars > M8.2A > Character Evaluation`.
- Bays: neutral, Day, and Night, each with Hero and Ray slots.
- Review cameras: Hero front/three-quarter/side/Day/Night/phone and Ray front/three-quarter/Day/Night/dialogue.
- Automated output: `docs/evidence/m8_2a/M8_2A_CHARACTER_INTAKE.txt`.
- Screenshot output after poses are applied: `docs/evidence/m8_2a/screenshots/`.
- Baseline sanity check: current M8.1 assets correctly fail geometry, texture, facial, authored-LOD, and height gates while passing Humanoid/bone/root checks.
- Runtime preservation check: PlayMode 8/8 passed after tooling creation. No gameplay, economy, API, or backend source changed.

## Licensing And Contract Topics

Required: commercial game use, investor demos, marketing/trailers/social, supported-platform builds, modification, contractor handoff, and continued use in updates. Clarify source ownership, exclusivity, portfolio use, credits, sublicensing/affiliate use, redistribution limits, editable-source delivery, third-party dependencies, AI training/generation provenance, and celebrity/voice likeness consent.

For commissions, prefer assigned ownership or broad perpetual worldwide commercial rights with modification and promotional use. This is a production requirement, not legal advice; a qualified human should review the final agreement.

No visible Nike, Gucci, Louis Vuitton, Supreme, team marks, music identities, celebrity likenesses, or other protected branding without separate rights.

## Integration Dependencies

- Lock final character topology before facial and clothing completion.
- Lock accepted Humanoid hierarchy before full motion production.
- Validate character proportions before final phone contact/IK animation.
- Integrate characters before final lighting/material/cohesion tuning.
- Approve Ray face and voice before final lip-sync and dialogue capture.
- Character visual level informs P1 environment detail; do not commission an entire city.

## Acceptance Requirements

- Automated intake report passes or every variance receives written technical approval.
- Four motion tests pass retargeting, contacts, scale, speed, phone alignment, and acting review.
- Eleven standardized views show 4/5+ Hero, 4/5+ Ray, clear differentiation, and coherent Day/Night response.
- Owner explicitly approves **Hero Visual**, **Ray Visual**, and **Art Style Match**.
- License/source/revision/delivery obligations are recorded before full payment.
- M8.2B integration remains a separate authorization.

## Current Source Notes

Reviewed 2026-08-18/19: Reallusion documents Unity/Mecanim export, facial morphs, game LOD tooling, and license tiers at https://www.reallusion.com/character-creator/game.html and https://www.reallusion.com/license/content.html. ActorCore documents royalty-free perpetual game use and restrictions at https://actorcore.reallusion.com/license. Daz interactive rights are product/artist-specific under https://www.daz3d.com/eula/. Unity assets remain governed by https://unity.com/legal/as-terms. Rokoko and Move AI are workflow candidates, not approved vendors; their current terms and export plans must be rechecked at quote time.
