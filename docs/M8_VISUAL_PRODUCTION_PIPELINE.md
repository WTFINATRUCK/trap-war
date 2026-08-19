# M8 Visual Production Pipeline

## Scope and freeze

M8 applies a replaceable production pipeline to one hero, Ray, one safehouse, one street block, the Trap Phone, the market, and the existing Day 1 flow. Economy rules, command/event/reducer behavior, API contracts, PostgreSQL authority, reconciliation, idempotency, and the three-action loop were not changed.

## Runtime architecture

- `ProductionCharacterPresenter` loads a skinned character by resource ID, upgrades materials for URP, binds a role-specific Animator Controller, drives LOD, and hides the procedural fallback only after a valid mesh is installed.
- M8.2B extends the presenter with eased phone IK, prop retention through the close transition, role-specific procedural accessories, bounded attention breaks, and small dialogue/interaction gestures. These additions do not alter the gameplay animator contract.
- Gameplay continues to publish locomotion, phone, interaction, and dialogue intent through `CharacterAnimationDriver`; it does not depend on a vendor skeleton.
- `M8AssetRuntime` places modular environment exports, applies reusable materials, creates original atlas decals, and gathers triangle metrics without requiring readable meshes.
- `M8AtmosphereDirector` owns restrained ACES tonemapping, color adjustment, bloom, vignette, and ambient dust.
- `M8QualityController` applies Low/Medium/High population, LOD, shadow distance, cascades, and practical-light policy.
- `ProceduralAudioService` now exposes separate UI, phone, gameplay, ambience, and music sources. Its generated clips remain TEMPORARY.

## Editor pipeline

`M8AssetPipeline` standardizes model and texture import, generates role-specific Animator Controllers from the approved clip source, audits runtime assets, logs rig capability, and builds both a Windows Development Player and the M8.2B non-development review player. `M8AssetPostprocessor` enforces texture caps, mipmaps, streaming, compression, mesh optimization, and animation import settings. `M82BNormalCaptureRunner` provides a fresh-Day-1 paced acceptance route and remains editor-only.

## Replacement workflow

1. Acquire an asset with documented provenance and classification.
2. Keep editable source in `SourceArt/<discipline>/<asset>` outside Unity runtime folders.
3. Export optimized runtime assets using the naming and scale rules in `M8_ASSET_STANDARDS.md`.
4. Import through the M8 postprocessor and run `Trap Wars/M8/Build Controllers + Validate Assets`.
5. Correct every QA failure before scene use.
6. Bind through resource IDs and presenter interfaces, not scene-specific skeleton code.
7. Validate Low/Medium/High, tests, Development Player, and representative screenshots.

## Gate result

M8.2B is technically accepted as a zero-budget in-house pass. The player, tests, real API/PostgreSQL regression, 12-frame set, 9:20 continuous evidence file, and performance sample pass. Visual quality improves materially but remains below bespoke 4/5 character/environment art. See `M8_2B_ACCEPTANCE.md`.
