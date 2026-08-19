# Trap Wars - Hero Character Brief

## Role

The Hero is the player's avatar: ambitious, intelligent, adaptable, street-aware, financially aspirational, and connected to contemporary hip-hop culture without being a caricature. Day 1 reads as "not broke, not rich yet." The design must plausibly evolve toward entrepreneur, investor, mogul, and neighborhood power player.

## Visual Direction

- Grounded semi-realism with believable adult anatomy and a strong readable silhouette.
- Contemporary, culturally credible, intentional fashion; no generic "urban" shorthand.
- Suggested age range: mid-20s to early-30s, with a clear but progression-neutral face.
- Confidence and awareness rather than aggression; capable, observant posture.
- Clean layered shirt/hoodie or light jacket, fitted pants, premium original sneakers, watch, restrained jewelry/accessory, and phone.
- Original fashion language only. No brand marks, team marks, celebrity likeness, costume chains, weapons, or exaggerated crime signaling.
- Not cartoon, Fortnite-like, cyberpunk, fantasy, mascot-like, or hardware-heavy hyper-photoreal.

## Differentiation From Ray

Hero should read younger, more mobile, more aspirational, and less established. Silhouette, face, proportions, posture, clothing construction, palette, hair, footwear, and accessories must not be reused from Ray. A neutral screenshot must identify each without labels.

## Progression Compatibility

Preserve a stable body/face identity while allowing future swaps of jackets/tops, pants, shoes, jewelry, accessories, and hairstyles. Use named sockets and document clothing/body dependencies. The face and hair must support high-quality portrait rendering later; do not build PFP functionality now.

## Technical Delivery

- FBX 2020+ runtime export and agreed editable sources (Blender/Maya/ZBrush/Substance/PSD as applicable).
- Unity 6000.3.20f1, URP 17.3, valid Humanoid avatar, documented T/A pose, clean bind pose/hierarchy/transforms.
- 1.82 m presentation target; stable root; no non-uniform root scale; full required Unity Humanoid bone coverage.
- LOD0 45k-80k triangles total; LOD1 near 50%; LOD2 near 20%; maximum four skinned renderers preferred.
- Maximum twelve LOD0 material slots; 2K skin/head and outfit sets, 1K accessories.
- URP-ready base color, normal, mask/metallic, smoothness/roughness, optional AO; authored eyes, teeth, mouth interior, and hair response.
- Facial inventory per `FACIAL_RIG_SPEC.md`; ARKit-compatible expansion is preferred but not mandatory.
- Named phone/accessory sockets; current gameplay height/controller/camera and two-hand phone IK must remain compatible.
- Delivery manifest: tools/versions, triangle counts, materials, texture sizes, bones, blend shapes, LODs, dependencies, licenses, and known limitations.

## Evaluation Package

Provide one production-candidate Hero mesh with textures, rig, LOD sample, neutral expression, blink/jaw/smile/brow samples, and permission for private Unity/investor evaluation. It will be checked in neutral/Day/Night bays and front, three-quarter, side, and phone-pose cameras.

## Art Acceptance

Target 4/5 minimum for character, rig, and materials. Reject an asset-pack look, weak face, generic hoodie mannequin, broken skinning, branded dependency, style mismatch, or topology that blocks wardrobe/portrait evolution. Owner visual approval is mandatory.

