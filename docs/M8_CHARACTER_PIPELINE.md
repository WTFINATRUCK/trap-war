# M8 Character Pipeline

## Standard

- Unity scale: 1 unit = 1 meter; hero presentation height approximately 1.75 m.
- One skinned mesh hierarchy with stable bind pose, clean transforms, replaceable URP materials, and documented skeleton.
- Required future body coverage: hips, spine, chest, neck, head, paired clavicle/arm/hand chains, paired leg/foot chains, eyes, jaw, and facial controls or blend shapes.
- Clothing is authored as compatible skinned pieces or a combined demo mesh; accessories use named sockets.
- Gameplay binds only to animator parameters and presentation interfaces.

## Current proof assets

Hero, Ray, and three crowd variants are CC0 Quaternius skinned FBX assets. Each installs at runtime, retains one skinned renderer, receives an Animator Controller, supports material replacement, and participates in LOD/quality control. The procedural humanoid is retained only as a hidden TEMPORARY fallback.

Unity 6000.3.20f1 reports valid Humanoid avatars for all five processed runtime prefabs, with required bone mappings present and the common animation source compatible. The M8.2B presenter adds original Hero crossbody and Ray waist/chain accents without changing the source meshes. The source characters remain stylized, oversized-head CC0 production candidates rather than final grounded character art.

## Facial capability

`ProductionCharacterPresenter` scans skinned renderers for blink/eye blend shapes and supports head attention targets. M8.2B adds bounded gaze breaks, nod variation, and conservative head performance. The current CC0 meshes expose zero facial blend shapes, so this is an honest fallback, not a lip-sync claim. Future replacement characters still require blink, eye aim, brows, jaw, expressions, and visemes.

## LOD and materials

- LOD0: full hero/Ray mesh and final facial capability for close presentation.
- LOD1: reduced geometry/material slots; preserve silhouette and major accessories.
- LOD2: low-cost distant mesh or impostor; no facial update.
- Current proof uses a generated `LODGroup` around a single source mesh. Authored mesh reductions remain for M8.x.

## Art handoff checklist

Validate scale, proportions, topology, UVs, normals/tangents, material slots, skin weights, bind pose, clip compatibility, facial inventory, sockets, footwear contact, LODs, collision proxy, license, and classification before approval.
