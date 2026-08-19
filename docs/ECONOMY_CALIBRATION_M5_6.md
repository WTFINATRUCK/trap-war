# Trap Wars V2 Economy Calibration M5.6

Status: **COMPLETE, WITH OPEN TARGET MISSES**  
Scope: economy rules, balance configuration, deterministic simulation, and documentation only  
Final versions: `economy-v2.m5.6`, `content-v2.m5.6.1`, `balance-v2.m5.6.1`, `hmac-sha256-streams.1`

## 1. Executive decision

M5.6 accepts focused changes to client contracts, information reliability, transaction friction, city risk identity, behavior-responsive robbery/raid exposure, gear utility, and simulation policy quality. It does not add API/database work, Unity, Base, tokens, repository migration, UI, a recovery subsidy, or a persistent Heat system.

The accepted configuration improves strategic diversity without equalizing outcomes. Opportunist remains strongest by median, Aggressive now has a materially larger upper tail, Information-Aware becomes competitive but misses its proposed relative-median target, client progression becomes deliberate and achievable, and defensive gear materially changes event exposure.

## 2. Accepted changes

| Area | Accepted change | Evidence |
| --- | --- | --- |
| Pearl | Deposit progress is the high-water quantity of qualifying Weed deployed in the Compton stash; withdraw/redeposit cannot increase it. Requirement reduced from 40 to 30 Weed. | Exploit regression passes; 60.65% Client Seeker completion, median day 20. |
| Ray | Requirement reduced from 15 Coke + 10 Molly to 6 Coke + 5 Molly. Completed-contract inventory is reclaimed before funding the next contract. | 34.14% completion, median day 23. |
| Dispatcher | Requirement reduced from 20 to 12 Meth. V2 automatically grants a Whip with its configured uses. | 13.71% completion, median day 26; reward regression passes. |
| Market friction | 2% buy markup and 2% sell markdown. | Opportunist median `$6,655 -> $4,940`; P99 `$38,770 -> $24,128`. |
| Plug | Forecasts carry direction, magnitude band, confidence, horizon, source type, source quality, and reference price. The latent market signal realizes with confidence- and age-dependent reliability. | Direction accuracy Low/Medium/High `62.42%/70.14%/76.66%` for Information-Aware. |
| Risk | Robbery and raid chance depend on city, exposed cash/value, carried asset mix, local unshielded stash, and Stick protection. Volatile carried products have greater loss severity. | Robbery incidence ranges from 56.67% Gear Strategist to 89.38% Opportunist. |
| Gear | Stick materially reduces risk incidence/severity; Chopper/Whip preserve same-day mobility; Plug creates actionable information. | Gear Strategist buys Stick 66.52%, Chopper 17.94%, and has 56.67% robbery exposure. |
| Agents | Client, Aggressive, Information-Aware, and Gear Strategist policies use only observable state and bounded strategy rules. | Final corpus has zero rejected-policy fallbacks. |

## 3. Rejected changes

| Hypothesis | Decision | Reason |
| --- | --- | --- |
| Partial Pearl funding | **REJECTED** | It locked scarce capital below the high-water requirement and produced 0% completion in Experiment 1. |
| Plug-first Information-Aware behavior | **REJECTED** | It spent actions on intel before using visible opportunities and achieved only 18.8% of Opportunist median. |
| Broad global profit reduction | **REJECTED** | A narrow spread controlled Opportunist tails without flattening every strategy. |
| Random-player cash subsidy | **REJECTED** | Random positive runs reached 20.23% through risk differentiation and friction changes; unconditional value creation was unnecessary. |
| Persistent Heat state in M5.6 | **DEFERRED** | Current observable exposure modifiers prove the design direction without adding state/event/API surface before M6 review. |
| Equal city or asset utilization | **REJECTED** | The target is a rational use case for each, not equal traffic or return. |

## 4. Final distributions

Each policy has 10,000 deterministic runs.

| Policy | P1 | P5 | P10 | P25 | Median | P75 | P90 | P95 | P99 | Mean | SD | Min | Max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 64 | 92 | 117 | 196 | 326 | 498 | 666 | 776 | 1,048 | 367.87 | 222.24 | 42 | 1,901 |
| Conservative | 187 | 375 | 653 | 1,261 | 2,416 | 4,274 | 6,624 | 8,411 | 12,607 | 3,148.78 | 2,651.30 | 96 | 23,545 |
| Aggressive | 236 | 666 | 918 | 1,571 | 2,757 | 4,917 | 8,364 | 11,396 | 20,281 | 3,985.65 | 4,068.83 | 49 | 52,149 |
| Rumor Follower | 207 | 245 | 263 | 293 | 328 | 367 | 407 | 432 | 486 | 331.92 | 57.39 | 167 | 672 |
| Opportunist | 524 | 1,269 | 1,762 | 2,897 | 4,940 | 8,129 | 12,585 | 15,808 | 24,128 | 6,263.24 | 4,891.00 | 79 | 43,453 |
| Information-Aware | 301 | 521 | 843 | 1,633 | 3,149 | 5,662 | 9,394 | 12,541 | 20,105 | 4,365.20 | 4,088.68 | 83 | 38,919 |
| Client Seeker | 205 | 698 | 1,021 | 1,714 | 2,451 | 3,355 | 4,794 | 5,673 | 7,581 | 2,718.37 | 1,571.14 | 70 | 22,653 |
| Stash Heavy | 265 | 535 | 701 | 1,075 | 1,649 | 2,620 | 3,966 | 5,264 | 8,732 | 2,118.64 | 1,691.04 | 89 | 20,468 |
| Yield Farmer | 91 | 111 | 125 | 245 | 412 | 592 | 793 | 932 | 1,189 | 441.58 | 258.91 | 59 | 1,506 |
| Gear Strategist | 198 | 263 | 318 | 699 | 1,300 | 2,163 | 3,423 | 4,725 | 7,306 | 1,691.35 | 1,505.03 | 115 | 20,850 |

## 5. Core before and after

| Policy | Median M5.5 | Median M5.6 | P10 M5.5 | P10 M5.6 | P90 M5.5 | P90 M5.6 | P99 M5.5 | P99 M5.6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 195 | 326 | 79 | 117 | 537 | 666 | 985 | 1,048 |
| Conservative | 2,227 | 2,416 | 234 | 653 | 8,405 | 6,624 | 15,773 | 12,607 |
| Aggressive | 1,178 | 2,757 | 221 | 918 | 3,333 | 8,364 | 7,167 | 20,281 |
| Rumor Follower | 295 | 328 | 233 | 263 | 381 | 407 | 599 | 486 |
| Opportunist | 6,655 | 4,940 | 1,444 | 1,762 | 20,907 | 12,585 | 38,770 | 24,128 |
| Information-Aware | 1,160 | 3,149 | 291 | 843 | 6,131 | 9,394 | 14,723 | 20,105 |

Information-Aware reaches 63.7% of Opportunist median, below the proposed 70-90% band, but has a strong P90 and distinct action/risk profile. Aggressive reaches the proposed P90 target but its P10 is higher than Conservative, so the intended downside target remains unmet.

## 6. Client purpose and outcomes

| Client | Lesson | Requirement | Expected window | Reward | Opportunity cost | Failure condition |
| --- | --- | --- | --- | --- | --- | --- |
| Ms. Pearl | Capital allocation and protected deployment | High-water 30 Weed in Compton stash | Days 10-28; median 20 | Unlock Long Beach | Capital is temporarily illiquid and actions are spent buying/stashing | Run ends before 30 qualifying units are simultaneously deployed |
| Uncle Ray | Diversified allocation across two risk classes | High-water 6 Coke + 5 Molly in Inglewood | Days 14-29; median 23 | Unlock South Central/Watts; grant Stick | Reclaimed Pearl capital must be redeployed; two products and stash actions | Prerequisite, capital, or timing prevents both high-water marks |
| Dispatcher | Late-run scale, liquidity, and timing | Sell 12 Meth in Watts | Days 19-30; median 26 | Unlock East LA; automatically grant Whip | Large volatile position, travel, sale action, and event exposure | Ray incomplete or insufficient late-run liquidity/time |

Legacy Dispatcher reward: player chooses Chopper or Whip through a separate claim UI. V2 reward: automatic Whip with configured uses. Design purpose: immediate cross-city mobility after unlocking East LA without adding an unresolved reward-choice command before API design.

## 7. Information calibration

| Metric | M5.5 | M5.6 Information-Aware |
| --- | ---: | ---: |
| Median net worth | `$1,160` | `$3,149` |
| Forecasts/run | about 20 | `8.859` |
| Direction accuracy | about 65% | `70.05%` |
| Median absolute error | about 25% | `3.97%` |
| Low confidence accuracy | not predictive | `62.42%` |
| Medium confidence accuracy | not predictive | `70.14%` |
| High confidence accuracy | not predictive | `76.66%` |
| Low/Medium/High profitable rate | not monotonic | `31.38%/34.84%/38.03%` |

Blind Rumor Follower remains intentionally weak. Its high-confidence signal is more reliable, but it still ignores price discipline and action opportunity cost. Information has value when interpreted; it is not a guaranteed trade.

## 8. City identity and usage

| City | Economic identity | M5.5 Client Seeker visit | M5.6 Client Seeker visit |
| --- | --- | ---: | ---: |
| Compton | Balanced starting market; Pearl allocation | 100% | 100% |
| Inglewood | Fast secondary market; local information premium; Ray | 50.85% | 56.02% |
| Long Beach | Lower-risk logistics market; cheap Coke/Whip | 0% | 58.16% |
| South Central | Highest-risk, high-spread Meth/Chopper market | 0% | 31.87% |
| Watts | Client/progression hub; Molly/Stick value | 1.45% | 29.73% |
| East LA | Best information quality; specialized Weed/Coke market | 0% | 13.06% |

No city names or cultural content changed. Traffic is not equal and routes are not universal; each city is now reachable and rational under at least one viable deliberate policy.

## 9. Asset and gear diversity

Molly remains the most consistently purchased core asset and still carries the largest skilled return contribution. Meth retains the highest risk/yield identity. Aggressive Coke purchase incidence rose from 9.48% to 91.43%, so its winning curve is no longer effectively one-product behavior. Weed remains the low-capital recovery asset; Coke remains balanced; Molly and Meth carry progressively greater event severity.

| Gear | M5.5 | M5.6 evidence | Role decision |
| --- | --- | --- | --- |
| Stick | Ignored except rare Ray reward | Gear Strategist purchase 66.52%; Ray reward 34.14% | Robbery/raid chance and severity mitigation |
| Chopper | Ignored | Gear Strategist purchase 17.94% | Same-day adjacent market logistics |
| Whip | Missing Dispatcher reward | Dispatcher reward 13.71% | Late-run cross-city mobility and East LA access |
| Plug | Blind use underperformed | Information-Aware purchase 77.92%; calibrated confidence edge | Paid information advantage |

## 10. Behavior-responsive risk

| Policy | Robbery M5.5 | Robbery M5.6 | Median affected loss M5.6 | Raid M5.5 | Raid M5.6 | Median affected loss M5.6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 89.19% | 64.05% | 170 | 78.32% | 58.69% | 202 |
| Conservative | 88.89% | 80.24% | 404 | 76.95% | 65.17% | 308 |
| Aggressive | 88.55% | 83.16% | 622 | 78.49% | 73.70% | 631 |
| Rumor Follower | 88.87% | 59.75% | 48 | 78.34% | 54.26% | 75 |
| Opportunist | 88.43% | 89.38% | 1,078 | 78.01% | 74.47% | 793 |
| Gear Strategist | n/a | 56.67% | 220 | n/a | 55.75% | 151 |

Frequency and severity now respond to exposure. Opportunist accepts the highest monetary losses, Aggressive suffers greater volatile-inventory severity, and protection/stash behavior creates a visible defensive edge.

## 11. Recovery and action economy

Random finishes positive in 20.23% of runs versus 9.72% in M5.5, inside the proposed 15-35% stress band without a subsidy. Of Random runs below starting value on day 10, 10.63% recover to a positive final run. This is a real but still narrow comeback path.

| Policy | Actions M5.5 | Actions M5.6 | Unused at EndDay M5.6 |
| --- | ---: | ---: | ---: |
| Random | 10.64 | 12.07 | 2.59 |
| Conservative | 20.74 | 21.53 | 2.28 |
| Aggressive | 43.55 | 19.22 | 2.36 |
| Rumor Follower | 11.31 | 15.46 | 2.49 |
| Opportunist | 25.48 | 24.94 | 2.09 |
| Information-Aware | 36.88 | 37.00 | 1.64 |
| Client Seeker | 18.45 | 26.33 | 2.12 |
| Gear Strategist | n/a | 18.17 | 2.40 |

Information and client play make three actions materially scarcer. Passive and random policies still expose missing optional-action value; no actions/day increase is justified.

## 12. Heat recommendation

Do not implement persistent `HEAT` yet. The M5.6 risk formula is compatible with a future Heat state because it already consumes the same proposed inputs: transaction/exposure scale, city risk, asset mix, stash protection, and gear. M6 should reserve an additive, event-sourced risk modifier field only after product review defines visibility, decay, player controls, and analytics semantics.

## 13. Balance experiment log

| Experiment | Scale | Hypothesis/change | Result | Decision |
| --- | ---: | --- | --- | --- |
| M5.5 baseline | 102,500 | Diagnose existing economy | Fixed Opportunist dominance, weak information/aggression, dead cities/gear, client defects | Baseline |
| E1 | 40,000 | 2% spread, behavioral risk, calibrated signal, partial client funding, first agent revisions | Spread/risk accepted; partial funding and Plug-first policy failed | Mixed |
| E2 | 40,000 | Restore full client funding; market-first Information-Aware; Aggressive entry expansion | Client median restored; Ray still 0.89%; info and Aggressive still below targets | Iterate |
| E3 | 30,000 | Pearl/Ray requirement reduction; stronger information combination; concentrated Aggressive curve | Client sequence improved; Aggressive upside achieved but too safe; info still below band | Mixed |
| Smoke A/B | 7,000 | Gear policy, confidence bands, recovery, client capital reclamation, scouting, volatile loss severity | Found and fixed speculative liquidation and missing city exploration | Accept fixes |
| Final | 100,000 | Frozen accepted configuration, 10 policies x 10,000 | Integrity pass; one Rumor affordability fallback discovered | Replace one policy corpus |
| Rumor replacement | 10,000 | Include spread in Plug affordability | Zero fallbacks | Accept |

Unsuccessful experiments remain represented under `simulation/calibration-results/m5.6/`.

## 14. Performance and integrity

- Final batch wall time: `1,251.50s` across 10 workers.
- Final engine commands: `5,113,486`.
- Maximum detailed worker RSS: `491.64 MB`.
- Final completion: 100% at day 30 for every policy.
- Rejected-policy fallbacks: 0.
- Source/sink reconciliation error: 0 for every policy.
- Test suite: 28 passing tests.

## 15. Target assessment

| Proposed target | Final | Status |
| --- | --- | --- |
| Conservative median `$1,500-$4,000` | `$2,416` | Met |
| Aggressive P90 at least `$8,000` | `$8,364` | Met |
| Aggressive P10 below Conservative | `$918` vs `$653` | Missed |
| Opportunist P99 below about `$45,000` | `$24,128` | Met |
| Information-Aware median 70-90% of Opportunist | 63.7% | Missed |
| Random positive rate 15-35% if healthy | 20.23%, no subsidy | Met |
| Every city meaningful to at least one viable policy | 13.06-100% Client Seeker visitation | Met provisionally |

## 16. Remaining risks and M6 recommendation

1. Aggressive upside is corrected, but downside/survival is still too favorable relative to Conservative.
2. Information confidence is calibrated, but the Information-Aware median remains below its proposed relative target.
3. Later-city relevance is concentrated in Client Seeker rather than multiple independent policies.
4. Whip utility depends on difficult Dispatcher completion; direct purchase remains unattractive to tested policies.
5. Random recovery exists but remains narrow after day-10 capital loss.
6. Three actions are scarce for rich strategies but still underused by simple strategies.
7. A persistent Heat system requires product, event-contract, and visibility decisions.

**M6 recommendation: HOLD FOR BALANCE REVIEW.** The economy engine is technically coherent and substantially improved, but product owners should explicitly accept or revise the two missed proposed targets and the provisional city/Heat decisions before API/database contracts freeze them.
