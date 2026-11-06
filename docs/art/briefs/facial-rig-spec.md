# Trap Wars - Facial Rig And Viseme Specification

## Delivery Principle

Use vendor-neutral semantic names or provide a complete mapping table. Blend shapes may use vendor prefixes, but one stable name must map to every required semantic. Neutral weight is 0; document valid weight ranges and any mutually exclusive/corrective combinations.

## Minimum Semantic Set

| Semantic | Preferred names/aliases | Requirement |
|---|---|---|
| Blink left/right | `eyeBlinkLeft`, `eyeBlinkRight`, `blink_L`, `blink_R` | Required; unified blink accepted only with approval |
| Jaw open | `jawOpen` | Required |
| Mouth close | `mouthClose` | Required |
| Smile left/right | `mouthSmileLeft`, `mouthSmileRight` | Required; unified smile accepted |
| Frown/concern | `mouthFrownLeft/Right`, `concern` | Required |
| Brow inner up | `browInnerUp` | Required |
| Brow down left/right | `browDownLeft`, `browDownRight` | Required |
| Eye look | eye bones or `eyeLook*` shapes | Preferred; document limits |
| Skepticism | authored combination or named shape | Required for Ray |
| Thought/concern | authored combination or named shape | Required for Ray |

## Viseme Set

Preferred minimum: `sil`, `PP`, `FF`, `TH`, `DD`, `kk`, `CH`, `SS`, `nn`, `RR`, `aa`, `E`, `ih`, `oh`, `ou`. ARKit-compatible shapes are welcome; Oculus-style visemes are acceptable with a supplied semantic map. Include a neutral-rest mouth, mouth interior, teeth, tongue where needed, and jaw interaction notes.

## Mesh And Rig Rules

- Shapes live on documented skinned facial mesh(es), retain stable vertex order, and survive FBX export/import.
- No eye, teeth, tongue, lip, or clothing intersections at contracted expression extremes.
- Blink closes the lids over the eyes rather than shrinking the eye mesh.
- Provide left/right symmetry where useful and corrective shapes when deformation requires them.
- Document eye/jaw bones, coordinate axes, rotation limits, and whether bone animation combines with shapes.
- Provide one short facial test clip and a CSV/JSON/Markdown mapping table.

## Unity Mapping

The existing `ProductionCharacterPresenter` discovers any blend-shape name containing `blink` case-insensitively and applies bounded head attention. M8.2B will add the accepted semantic/viseme mapping after final asset approval. Do not rename accepted vendor shapes in M8.2A merely to fit the current blink-only presenter.

## Performance And Acceptance

- Cap active simultaneous shapes to the minimum needed for the shot; preserve LOD0/LOD1 face quality and disable facial updates on distant LOD2 where practical.
- Validate names, counts, vertex cost, memory, Animator cost, eyes, jaw, and lip-sync in Unity.
- Ray must demonstrate a legally cleared spoken line with synced mouth, blink, eye/head performance, and subtitle timing before final facial acceptance.

