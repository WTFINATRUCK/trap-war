# Trap Wars V2 - M8.2 External Asset Integration

## Decision

M8.2 did not integrate a replacement Hero, Ray, motion set, facial set, voice, music, or environment hero kit. No reviewed package met the combined investor-quality, character-direction, facial, rig, and licensing gates without purchase, account registration, or an external character-art engagement.

**Status: M8.2 EXTERNAL PROCUREMENT BLOCKED**

The accepted M8.1 runtime remains unchanged. M9 was not started.

## Intake Gate

An asset had to satisfy all of the following before import:

- Legal commercial source, modification rights, and known redistribution limits.
- Grounded adult proportions and intentional contemporary streetwear.
- Distinct, credible Hero and Ray identities rather than generic avatar-pack variants.
- Unity Humanoid compatibility, stable hierarchy/scale, clean skinning, and an LOD path.
- A facial upgrade path with blink, jaw/mouth, brow, expression, and reusable visemes.
- Visual coherence with the accepted environment at an honest 4/5 investor-demo threshold.

None cleared the gate.

## Candidate Evaluation

| Candidate | Legal/technical result | Visual/production result | Decision |
|---|---|---|---|
| Microsoft Rocketbox | MIT; Unity Humanoid tooling, large motion library, facial variants, and LODs are documented. | Previewed adult avatars are dated, generic, and do not express Trap Wars Hero/Ray identity or premium streetwear. | REJECTED; no import. |
| Ready Player Me | Commercial use requires registration as a developer/partner; standalone website avatars are non-commercial. Unity/GLB and facial tooling are available. | Avatar-platform look and catalog clothing do not establish two bespoke leads; commercial account state was not owner-approved. | REJECTED; no acquisition. |
| MakeHuman core | Core graphical assets and normal exports are CC0; third-party clothing requires separate license review. | Provides a base-human authoring workflow, not two art-directed, clothed, production characters. Facial, clothing, hair, texture, and LOD work would still require a character artist. | REJECTED as drop-in asset. |
| Meta Momentum Human Rig | Apache-2.0 code/assets; anatomically inspired body, LODs, and 72 facial expression parameters. | Research-grade parametric base, not a dressed Unity game lead. Integration and art production exceed M8.2's asset-integration scope. | REJECTED as drop-in asset. |
| Ravi rigged PBR character | Vendor page states CC0 and a paid download. | One clothed male does not provide distinct Hero/Ray coverage; no documented production viseme set. Purchase was not authorized. | NOT ACQUIRED. |
| G2 Human Base | Paid Unity Asset Store package with a standard commercial Asset Store license. | Base-character package still needs art direction/outfits and does not solve both named leads by itself. Purchase was not authorized. | NOT ACQUIRED. |

Rocketbox preview images were downloaded to a temporary evaluation folder only. They were not copied into the repository, imported into Unity, or included in a build.

## External Assets Integrated

None. Existing M8.1 Quaternius and Kenney assets remain in place at their prior classifications. Nothing was promoted to FINAL-QUALITY.

## Preserved Systems

- Unity 6000.3.20f1 and URP 17.3.
- Accepted Day 1 gameplay, pacing, phone, HUD, market, save/resume, and state handling.
- PostgreSQL/API authority, conflict reconciliation, and idempotency.
- Character import/validation, retargeting, phone IK, facial discovery, quality tiers, and evidence tooling.

## Validation Performed

- EditMode: 6/6 passed on 2026-08-18, including the live PostgreSQL/API acceptance test.
- PlayMode: 8/8 passed on 2026-08-18, including Humanoid installation, phone state, authored audio packaging, quality tiers, objectives, and physical interaction.
- Fresh evidence: `docs/evidence/m8_2/M8_2_EDITMODE_RESULTS.xml` and `docs/evidence/m8_2/M8_2_PLAYMODE_RESULTS.xml`.
- No new build/profile was claimed because no runtime asset changed. The accepted M8.1 Development Player remains the performance baseline.

## Exact Missing Deliveries

1. One art-directed Hero at 4/5 or better with premium streetwear, production skin/materials, Humanoid rig, LODs, and facial/viseme support.
2. One visually distinct Ray at 4/5 or better with dialogue-focused face, Humanoid rig, LODs, and facial/viseme support.
3. Approximately 16-20 Hero and 6-8 Ray authored clips, including phone draw/hold/put-away and varied dialogue acting.
4. One legally cleared Ray voice performance with timing markers and a visible runtime lip-sync proof.
5. Production-candidate layered ambience, adaptive music, and final interaction/transition cues.
6. Safehouse and street hero-frame art sufficient to match the realism/detail level of the approved characters.

## Procurement Handoff

The next authorized action should be a bounded M8.2 procurement/art-vendor pass. Obtain owner approval for budget and commercial accounts, commission or license Hero and Ray together as a coherent pair, require a facial/viseme test file before final payment, and submit a small Unity evaluation package before full delivery.

