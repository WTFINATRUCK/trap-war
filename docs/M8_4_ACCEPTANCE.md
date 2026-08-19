# Trap Wars V2 - M8.4 Direct Visual Rebuild Report

## Final Status

The running safehouse is materially closer to the owner-approved reference, but it has not reached the requested premium-indie fidelity. The composition, adult-scale Hero silhouette, city window, room density, lighting hierarchy, HUD, minimap, and phone are all visibly rebuilt. The procedural Hero and several furniture forms still read as simplified game art.

**M8.4 MATERIAL VISUAL IMPROVEMENT CONFIRMED - PREMIUM VISUAL ACCEPTANCE REMAINS OPEN**

M9 has not begun.

## Before Screenshot

- `docs/evidence/visual_rebuild/BEFORE.png`
- Fresh runtime capture from the pre-rebuild scene.
- Capture dimensions: 321 x 531. The Unity Game View was docked in a narrow layout, so this is retained as honest evidence rather than presented as a matched comparison frame.
- SHA-256: `1356B22A8E7771A7ECD0356550B2BF85DE7F08290EB17A7BF04D3D4EB76101C4`

## Reference Screenshot

- `docs/evidence/visual_rebuild/REFERENCE.png`
- Dimensions: 1536 x 1024
- SHA-256: `8A360A32371FC2FF0571992FE2864E05D0A3CBF4FFF25A3B9631A59E42D3A501`
- Byte-identical evidence copy of `docs/reference/TRAP_WARS_VISUAL_TARGET_SAFEHOUSE.png`.

## Initial Visible Comparison

| Category | Initial rank | Final rank | Visible assessment |
| --- | --- | --- | --- |
| Character realism | FAIL | PARTIAL | Adult silhouette replaces the chibi presenter, but anatomy and clothing remain procedural. |
| Character proportions | FAIL | PARTIAL | Adult head/body ratio, shoulders, limbs, hands, and stance are materially improved. |
| Camera framing | PARTIAL | PASS | Close shoulder-height view, moderate FOV, and room-filling composition. |
| Room geometry | FAIL | PARTIAL | Enclosed safehouse composition is clear; some geometry remains visibly simple. |
| Furniture | FAIL | PARTIAL | All major furniture reads correctly, though forms lack production detail. |
| Window | FAIL | PASS | Frame, sill, glass plate, blinds, mullions, and radiator are present. |
| Exterior city view | FAIL | PASS | Layered neighborhood/city image provides believable exterior depth. |
| Materials | FAIL | PARTIAL | Aged plaster, dark floor, cloth colors, wood, glass, metal, skin, and hair now vary by surface. |
| Lighting | FAIL | PARTIAL | Window key plus warm practicals establish readable warm/cool separation. |
| Shadows | FAIL | PARTIAL | Soft window and practical shadows are present but less nuanced than reference. |
| Clutter | FAIL | PARTIAL | Books, papers, displays, lamp, radiator, and bedside dressing fill the room. |
| Wall art | PARTIAL | PASS | Both requested text pieces are readable and include all five plan steps. |
| Desk | FAIL | PARTIAL | Monitor, laptop/keyboard, books, chair, lamp, and compact drawers read as a work area. |
| Bed | FAIL | PARTIAL | Headboard, mattress, pillows, layered cover, side table, and lamp read clearly. |
| Rug | PARTIAL | PARTIAL | Strong spatial anchor, but surface remains too flat. |
| Floor | PARTIAL | PARTIAL | Dark plank-like floor supports the palette but lacks detailed normal response. |
| Phone | PARTIAL | PASS | Tall black device, green edge, readable hierarchy, cash, Word, Market, Inventory, Messages, and Contacts. |
| HUD | PARTIAL | PASS | Cash/day/actions hierarchy now matches the requested layout. |
| Objective panel | PARTIAL | PASS | Correct objective, context line, and actual Tab control hint. |
| Minimap | FAIL | PASS | Circular bottom-left map includes roads, north, player arrow, and safehouse label. |

## Top 10 Initial Failures

1. Chibi/stylized Hero with an unsuitable head/body ratio.
2. Distant, wide camera that made the Hero and room feel small.
3. Empty or synthetic-looking exterior window.
4. Primitive, sparse safehouse furniture.
5. Flat colors with no useful surface variation.
6. Flat lighting with weak warm/cool separation.
7. Missing circular minimap and location treatment.
8. Slab-like phone presentation with weak information hierarchy.
9. Sparse environmental storytelling and clutter.
10. Bed, desk, TV, radiator, blinds, and wall art failing to form a believable room composition.

## Rebuild Summary

### Character Replacement/Rework

The low-poly chibi Hero presenter is disabled in the opening scene. A new adult-proportioned procedural rig uses a smaller head, broader shoulders, tapered hoodie torso, pelvis, continuous elbow/knee joints, longer limbs, hands, shoes, hair, hood, crossbody strap, and bag. It is visibly closer in scale and silhouette but remains the largest unresolved fidelity gap.

### Camera Rework

The camera now uses a 48 degree FOV, 2.9 m distance, 1.48 m height, 0.58 m shoulder offset, and restrained pitch/yaw. The Hero fills the foreground and the room fills the frame without fisheye distortion.

### Safehouse, Window, Materials, and Lighting

The visible shell now includes aged plaster, dark flooring, ceiling enclosure, green rug, bed, bedding, pillows, nightstand, lamp, desk, chair, computer screens, books, TV, storage, window frame, sill, glass, blinds, exterior city plate, radiator, wall art, and practical clutter. A window point key, directional spot beam, bedside light, desk practicals, and restrained post exposure establish the lighting hierarchy.

### Wall Art, Bed, and Desk

Both requested typographic pieces are authored as runtime text rather than generated image text. The bed has a headboard, mattress, layered green cover, pillows, bedside furniture, lamp, and books. The desk has multiple displays, keyboard/laptop treatment, books, compact storage, and seating.

### Minimap, HUD, and Phone

The HUD now presents cash, day, actions, the requested objective and Tab hint, plus a circular minimap with north, player arrow, streets, and `THE TRAP / YOUR SAFEHOUSE`. The phone is a tall framed device with an inset screen, speaker detail, green edge, readable navigation, cash balance, and all requested destinations while retaining the world behind it.

## Iteration 1

- Evidence: `docs/evidence/visual_rebuild/iteration_01.png`
- Changed: adult-scale Hero and tighter over-shoulder camera.
- Top differences: segmented Hero anatomy; overly dominant Hero framing; room still read as a blockout.

## Iteration 2

- Evidence: `docs/evidence/visual_rebuild/iteration_02.png`
- Changed: tapered torso, bed/TV/desk placement, and unobstructed runtime capture timing.
- Top differences: city plate was vertically inverted; Hero joints remained disconnected; furniture was too blocky.

## Iteration 3

- Evidence: `docs/evidence/visual_rebuild/iteration_03.png`
- Changed: corrected city orientation, circular minimap, brighter room hierarchy, and additional room dressing.
- Top differences: repeating concrete-panel wall texture; mannequin-like limb gaps; phone and desk presentation remained weak.

## Iteration 4

- Evidence: `docs/evidence/visual_rebuild/iteration_04.png`
- Changed: non-repeating aged plaster, joined elbows/knees, compact desk storage, complete Plan text, and rebuilt open phone.
- Top differences: Hero still lacks production anatomy/cloth; furniture bevel/detail is limited; material normal response remains shallow.

## Final Screenshot

- `docs/evidence/visual_rebuild/FINAL.png`
- Dimensions: 1536 x 1024
- SHA-256: `47C74D33285CB9D3C2D57561ACFEE4D10C130FF7B86D5E9EDFB724E12436B8EF`

## Side-by-Side Comparison

- `docs/evidence/visual_rebuild/SIDE_BY_SIDE.png`
- Left: owner-approved reference. Right: final runtime capture.
- Dimensions: 3072 x 1024
- SHA-256: `87407334F9FF0B9B0AF0E56DC50371D483B792D696D39F9CFBDB7286FBE80BAB`

## Remaining Differences

1. The Hero still reads as a procedural stylized figure rather than a production semi-realistic human.
2. Hoodie, trousers, hair, hands, and shoes lack production mesh and texture detail.
3. Bed, chair, desk, and storage need beveled authored meshes and higher-quality fabrics/wood.
4. Rug, floor, and wall surfaces need normal/roughness maps and finer variation.
5. Window lighting needs more natural bounce, contact shadowing, and exposure nuance.
6. The exterior plate gives depth but does not provide true parallax geometry.

## Performance

Windows standalone, 1536 x 1024, PC quality, Intel Iris Xe: 68.1 FPS average, 14.69 ms average frame, 18.28 ms p95, 24.68 ms max, 67,790 triangles, 347 renderers, and 4 skinned renderers over a 20-second sample.

## Unity Test Results

- Unity Editor: 6000.3.20f1
- EditMode: 6 passed, 0 failed, 0 skipped.
- PlayMode: 10 passed, 0 failed, 0 skipped.

## Recommendation

Hold at M8.4. The direct rebuild has materially improved the actual running image, but premium visual acceptance requires a production-quality semi-realistic Hero and authored furniture/material assets. Do not begin M9.
