# Asset Licenses

Every third-party or generated asset that ships in the game, where it came from, and the terms it is used under.
Add a row before importing anything new. License texts that ship with an asset live next to it in
`game/unity/Assets/_TrapWars/Art/Licenses/` or the asset's own folder.

| Asset | Location in project | Source | License |
|---|---|---|---|
| Hero character (`M85_Hero_RealisticMan.fbx`) | `Resources/M8/Characters/M85/` | "Realistic Male Character Rigged" by Giyasudeen, TurboSquid product 2325793 (free download, 2026-08-20) | TurboSquid Standard License. The model is built on a Reallusion Character Creator base mesh (`CC_Base_*`); confirm Reallusion's game-export terms permit redistribution in a shipped game before a commercial release. |
| Crowd and Ray characters (`SK_Crowd_Female_*`, `SK_Ray_Casual3`, `SK_Hero_Casual2`) | `Resources/M8/Characters/` | Quaternius, Ultimate Animated Character Pack | CC0 1.0 |
| Humanoid animation set (`AN_Quaternius_Human_M8.fbx`) | `Resources/M8/Animation/` | Quaternius, Animated Human | CC0 1.0 |
| Street kit meshes and textures (`SM_URB_*`, `TX_URB_*`) | `Resources/M8/Environment/` | Kenney, Retro Urban Kit 2.0 | CC0 1.0 |
| Sound effects (`M8_*.ogg`) | `Resources/M8/Audio/` | Kenney Impact, Interface and RPG audio packs | CC0 1.0 |
| Decal atlases (`TX_Decal_*_Atlas_D.png`) | `Resources/M8/Decals/` | Generated for Trap Wars with OpenAI image generation (2026-08-17); abstract marks only, no logos, brands, people or characters | Project-owned output |
| Safehouse textures (`TX_M84_*`) | `Resources/M8/Environment/Textures/` | Created for Trap Wars | Project-owned |
| Procedural ambience and music | Generated at runtime by `ProceduralAudioService` | Trap Wars code | Project-owned |
| Browser demo characters and props (`*.glb`) | `public/demo/assets/models/` | Converted from the Quaternius and Kenney assets above by `scripts/build_demo_assets.py` | CC0 1.0 |
| Browser demo sound effects (`*.mp3`) | `public/demo/assets/audio/` | Kenney Impact, Interface and RPG audio packs | CC0 1.0 |
| Browser demo safehouse textures (`cityview.jpg`, `plaster.jpg`, `fabric.jpg`) | `public/demo/assets/` | Compressed copies of the `TX_M84_*` textures | Project-owned |
| Browser demo facades, signs, road and sky | Generated at runtime by `src/demo/textures.ts` | Trap Wars code | Project-owned |
| WTF-LABZ studio mark (`wtf-labz.png`) | `Assets/WebGLTemplates/TrapWars/TemplateData/`, `public/play/game/TemplateData/` | WTF-LABZ | Project-owned |

## Hero model integrity

- Source package: `Realistic man_Fbx.zip`, SHA-256 `4ACCD7E80D9A324719ECE50586A043F402BF8834509EB199DD8379EBC0669964`
- Imported FBX SHA-256: `BCE72049C9876575DC22EFB922F321D4CEE6D405495DBD2D3275BEF05DFFE698` (137,514,460 bytes, stored with Git LFS)
- The source file is unmodified. `CharacterImportOptimizer` strips the unused facial blend shapes at import time, and the
  runtime applies the black wardrobe treatment and accessories.
