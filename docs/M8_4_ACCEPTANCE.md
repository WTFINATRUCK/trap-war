# Trap Wars V2 - M8.4 Reference-Match Visual Rebuild

## Status

M8.4 implementation and technical acceptance are complete. The owner-approved safehouse reference is preserved in-repository and the playable opening composition has been rebuilt around its major visual signals. M9 has not begun.

This pass achieves reference-directed composition, lighting, HUD hierarchy, and environmental storytelling. It does not claim photoreal asset parity: the current zero-budget character rig and primitive furniture remain visibly below the fidelity of the rendered target.

## Approved Reference

- Repository file: `docs/reference/TRAP_WARS_VISUAL_TARGET_SAFEHOUSE.png`
- Dimensions: 1536 x 1024 pixels
- File size: 2,069,187 bytes
- SHA-256: `8A360A32371FC2FF0571992FE2864E05D0A3CBF4FFF25A3B9631A59E42D3A501`
- Preservation: source and repository copies are byte-identical; no resize or recompression was performed
- Git policy: PNG is tracked by ordinary Git because the current `.gitattributes` LFS rules do not include PNG

## Rebuild Delivered

- Tightened over-shoulder third-person framing and recenter behavior.
- Reworked the safehouse around a bed-left, central-window, desk-right composition.
- Added dark wood flooring, a deep green rug, aged walls, ceiling, window framing, blinds, skyline silhouettes, radiator, closed exit treatment, posters, nightstand, bedside practical, desk dressing, and chair.
- Added layered warm safehouse, window, desk, bedside, and character lighting with restrained ACES post-processing.
- Rebuilt opening HUD hierarchy for cash/day/actions, a two-line objective with Tab cue, bottom-left safehouse location, and bottom-right interaction prompt.
- Updated the automated evidence route so the hero frame captures the true opening state before objective progression.

## Acceptance Evidence

- Final route: `docs/evidence/m8_4/screenshots/`
- Hero comparison frame: `docs/evidence/m8_4/screenshots/01-hero-safehouse.png`
- Automated route result: 12/12 expected captures, exit code 0
- EditMode: 6 passed, 0 failed (`docs/evidence/m8_4/M8_4_EDITMODE_RESULTS.xml`)
- PlayMode: 10 passed, 0 failed (`docs/evidence/m8_4/M8_4_PLAYMODE_RESULTS.xml`)
- Unity editor: 6000.3.20f1

## Unity CLI Adoption

The official Unity CLI is now the preferred project discovery, status, authentication, Editor registration, and open-project interface. `Tools/Unity/TrapWars-Unity.ps1` combines that interface with the pinned direct Editor CLI for tests, builds, validation, and the repeatable 12-frame M8.4 capture route. The validated M8.4 release build reports version `0.8.4`, development false, and debugging false.

## Visual Gap

The scene now follows the reference's composition and readability, but its final perceived quality is constrained by the existing stylized fallback Hero and code-built primitive environment. Closing the remaining gap requires production-quality Hero, furniture, surface, prop, and city-view assets; those dependencies should be treated as asset production work, not hidden inside a technical acceptance claim.

## Recommendation

M8.4 TECHNICALLY ACCEPTED - PRODUCTION ASSET PARITY REMAINS OPEN

Hold at M8.4. Do not begin M9 until the owner either accepts the zero-budget visual ceiling or supplies/authorizes the production assets needed for closer pixel-level fidelity.
