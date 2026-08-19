# M8 Asset Standards

## Classification

- TEMPORARY: development-only placeholder or generated proof asset.
- PRODUCTION CANDIDATE: legally usable and technically shippable, pending art approval.
- FINAL-QUALITY: explicitly approved by art, narrative/authenticity, technical art, and production.

No M8 asset is classified FINAL-QUALITY.

## Naming

| Prefix | Use | Example |
| --- | --- | --- |
| `SK_` | skinned mesh | `SK_Hero_Casual2` |
| `SM_` | static mesh | `SM_URB_detail_bench` |
| `TX_` | texture | `TX_Decal_StreetEditorial_Atlas_D` |
| `M_` / `MI_` | material / instance | `M_StreetAsphalt` |
| `AN_` | animation source/clip | `AN_Quaternius_Human_M8` |
| `AC_` | Animator Controller | `AC_Ray_M8` |
| `PF_` | prefab | `PF_URB_Storefront_A` |
| `SFX_` / `MUS_` | audio | `SFX_Phone_Notify` |
| `VFX_` | visual effect | `VFX_AmbientDust` |

## Texture and import budgets

| Class | Typical maximum | Notes |
| --- | ---: | --- |
| Hero/Ray | 2048 | 4096 only with measured close-up need |
| Primary environment | 2048 | Prefer atlases and tiling materials |
| Secondary props | 1024 | Reuse material families |
| Background/crowd | 512-1024 | Aggressive quality-tier reduction |
| Decal atlas | 2048 | Mipmapped, compressed, original/cleared art |

M8 runtime textures use mipmaps, streaming, and compressed high-quality import. Mesh read/write is disabled where runtime access is unnecessary. Runtime metrics use index counts and do not force readable meshes.

## Source and runtime layout

- Editable source: `SourceArt/<Characters|Environment|UI|VFX|Audio>/...` (ignored locally or stored via approved LFS/art storage).
- Runtime export: `game/unity/Assets/_TrapWars/Art/...` for licenses/support and `Resources/M8/...` for the current proof slice.
- Do not place Blender, Substance, layered PSD, raw capture, or high-resolution source files in runtime resource folders.

## Source control

Git LFS 3.7.1 is installed. `.gitattributes` routes FBX, Blender, PSD, Substance, EXR, lossless audio, and video through LFS. PNG files remain normal Git because the selected runtime set is small; reassess if source textures grow. Local `Builds/` and `SourceArt/` are ignored.

## Provenance

| Asset | Source / creator | License | Acquired | Modified / use | Class |
| --- | --- | --- | --- | --- | --- |
| Ultimate Animated Character Pack | OpenGameArt / Quaternius | CC0 | 2026-08-17 | Selected hero, Ray, crowd exports; URP runtime conversion | PRODUCTION CANDIDATE |
| Animated Human Low Poly | OpenGameArt / Quaternius | CC0 | 2026-08-17 | Common authored animation source; generated controllers | PRODUCTION CANDIDATE |
| Retro Urban Kit | Kenney | CC0 | 2026-08-17 | Selected modular runtime exports/textures | PRODUCTION CANDIDATE |
| Street Editorial Decal Atlas | OpenAI image generation for this project | Project-owned generated output | 2026-08-17 | Original abstract atlas; no real marks/artists | PRODUCTION CANDIDATE |
| Zero-Budget Editorial Decal Atlas | OpenAI built-in image generation for this project | Project-owned generated output | 2026-08-18 | Original 4x4 abstract neighborhood atlas; no readable words, logos, people, or likenesses | PRODUCTION CANDIDATE |
| M8.2B role accessories and location dressing | Trap Wars runtime code | Project-owned code/output | 2026-08-18 | Procedural Hero/Ray identity props, safehouse story props, facade rhythm, Ray corner, and Hub counter | PRODUCTION CANDIDATE |
| Procedural fallback geometry | Trap Wars runtime | Project code | Existing/M8 | Hidden fallback and remaining blockout geometry | TEMPORARY |
| Generated sound cues/music bed | Trap Wars runtime | Project code | Existing/M8 | Bus architecture proof only | TEMPORARY |
| Unity LegacyRuntime font | Unity built-in | Unity engine distribution | Existing | UI readability proof | TEMPORARY |

License notices are retained under `Assets/_TrapWars/Art/Licenses` and the Kenney environment folder. CC0 sources have no redistribution restriction beyond retaining accurate project records.

M8.2B incurred zero asset, vendor, account, voice, animation, or tool spend. FFmpeg was used only as an evidence-capture binary and is not included in the player.
