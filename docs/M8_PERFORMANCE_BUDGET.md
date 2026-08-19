# M8 Performance Budget

## Profiling hardware

- ASUS Vivobook X1605VA/F1605VA
- Intel Core i7-1355U, 10 cores / 12 logical processors
- Intel Iris Xe integrated graphics, driver 32.0.101.7076
- 16 GB physical RAM
- Windows 11 Home 64-bit, build family 10.0.26200
- Unity 6000.3.20f1, URP 17.3.0, DX11, 1280x720 profile window

Numbers are development evidence on this machine, not production certification.

## Hero-slice budgets

| Area | High target | Current evidence |
| --- | ---: | ---: |
| Development Player frame time | p95 <= 16.7 ms | 10.51 ms |
| Editor frame time | p95 <= 20 ms | 14.51 ms |
| Scene triangles | <= 150k visible | 34,678 |
| Renderers | <= 250 | 152 |
| Distinct materials | <= 120 | 103 |
| Skinned characters | <= 8 | 5 |
| Active lights | <= 8 | 7 |
| Shadow distance High | <= 50 m | 50 m |
| Runtime M8 assets | <= 64 MB | 15.1 MB on disk |
| Repeated common-action GC | No sustained per-frame allocation | No sustained growth observed; instrumentation remains coarse |

## Profile results

Development Player: 20-second sample after a 3-second warm-up, 123.1 FPS average, 8.13 ms average, 10.51 ms p95, 15.57 ms maximum, 93.4 MB total allocated, 4.7 MB managed, 25.3 MB allocated growth, 33 collections. The log contains no runtime exception.

Editor hero route: 86.2 FPS, 11.61 ms average, 14.51 ms p95, 34,678 triangles, 152 renderers, 103 materials, seven lights, and five skinned renderers. Editor memory counters were 362.7 MB allocated and 524.2 MB managed; Editor values include tooling/domain overhead and are not comparable to Player memory figures.

## Quality tiers

- Low: reduced pedestrians/vehicles, 0.7 LOD bias, 20 m shadows, one cascade, no practical-light shadows.
- Medium: balanced population, 1.0 LOD bias, 32 m shadows, two cascades, selected practical shadows.
- High: full hero population, 1.5 LOD bias, 50 m shadows, four cascades, selected practical shadows.

## Risks

The High tier emits a Low-severity URP warning that punctual-light shadow resolution is reduced to fit the 2048 atlas. M8.x should cap shadow-casting practicals explicitly. Web/mobile risks are material count, skinned character update cost, post-processing, shadow maps, and the 4 MB decal atlas source; all are controlled centrally by quality settings but require target builds.

