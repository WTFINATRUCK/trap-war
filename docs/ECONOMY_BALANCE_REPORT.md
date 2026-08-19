# Trap Wars V2 M5.5 Economy Balance Report

Status: calibration complete; M6 hold recommended
Date: 2026-08-11
Machine-readable evidence: `packages/economy-engine/simulation/m5.5-calibration-report.json`

## 1. Scope and versions

M5.5 executed 102,500 deterministic runs across 12 test policies. No gameplay, balance, content, random-strategy, UI, Unity, Base, token, repository, API, or database change was made.

- Economy: `economy-v2.m5.1`
- Content: `content-legacy-extracted.1`
- Balance: `balance-legacy-extracted-v2-divergences.1`
- Random strategy: `hmac-sha256-streams.1`
- Required baseline: 10,000 runs each for Random, Conservative, Aggressive, Rumor Follower, and Opportunist; 50,000 total.
- Dedicated validation: 7,500 runs each for Client Seeker, Rank Climber, Stash Heavy, Yield Farmer, Plug Skeptic, Plug Believer, and Information-Aware Opportunist; 52,500 total.

These agents are test policies only, not player automation or claims of optimal play.

## 2. Full net-worth distributions

| Policy | P1 | P5 | P10 | P25 | Median | P75 | P90 | P95 | P99 | Mean | SD | Min | Max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 51 | 66 | 79 | 113 | 195 | 350 | 537 | 675 | 985 | 262.04 | 205.35 | 40 | 1,655 |
| Conservative | 124 | 179 | 234 | 801 | 2,227 | 4,890 | 8,405 | 10,895 | 15,773 | 3,444.41 | 3,611.08 | 74 | 32,204 |
| Aggressive | 91 | 157 | 221 | 472 | 1,178 | 2,104 | 3,333 | 4,381 | 7,167 | 1,557.23 | 1,514.36 | 41 | 24,741 |
| Rumor Follower | 190 | 216 | 233 | 261 | 295 | 331 | 381 | 442 | 599 | 306.95 | 80.42 | 107 | 1,264 |
| Opportunist | 127 | 729 | 1,444 | 3,177 | 6,655 | 12,660 | 20,907 | 26,479 | 38,770 | 9,220.07 | 8,366.38 | 61 | 60,073 |
| Client Seeker | 91 | 178 | 592 | 1,640 | 2,976 | 4,113 | 5,500 | 6,568 | 8,751 | 3,071.43 | 1,927.40 | 52 | 14,271 |
| Rank Climber | 177 | 244 | 276 | 335 | 413 | 516 | 701 | 938 | 1,369 | 466.07 | 228.07 | 89 | 2,742 |
| Stash Heavy | 120 | 289 | 453 | 767 | 1,343 | 2,377 | 4,130 | 5,866 | 11,200 | 1,986.08 | 2,122.52 | 68 | 21,382 |
| Yield Farmer | 71 | 84 | 92 | 110 | 196 | 456 | 686 | 809 | 1,068 | 305.14 | 250.92 | 54 | 1,436 |
| Plug Skeptic | 105 | 169 | 281 | 363 | 1,036 | 2,971 | 6,168 | 9,030 | 15,443 | 2,323.52 | 3,217.68 | 71 | 38,648 |
| Plug Believer | 102 | 164 | 277 | 356 | 623 | 1,460 | 2,780 | 3,946 | 6,971 | 1,183.92 | 1,436.62 | 60 | 16,425 |
| Information-Aware Opportunist | 100 | 206 | 291 | 381 | 1,160 | 3,078 | 6,131 | 8,640 | 14,723 | 2,379.85 | 3,131.85 | 64 | 38,046 |

## 3. Survival and progression

Positive run means final net worth exceeds the `$540` starting value. Bankruptcy means only protected reserves retain value.

| Policy | Bankruptcy | Positive run | Completion | Average final day | Notable highest rank |
| --- | ---: | ---: | ---: | ---: | --- |
| Random | 0.21% | 9.72% | 100% | 30 | 99.99% Corner Boy |
| Conservative | 0% | 80.49% | 100% | 30 | Runner 33.14%, Hustler 4.11% |
| Aggressive | 0.37% | 72.13% | 100% | 30 | 100% Corner Boy |
| Rumor Follower | 0% | 1.68% | 100% | 30 | 100% Corner Boy |
| Opportunist | 0% | 95.91% | 100% | 30 | 100% Corner Boy |
| Client Seeker | 0% | 90.45% | 100% | 30 | Runner 30.17%, Hustler 3.21% |
| Rank Climber | 0% | 21.63% | 100% | 30 | Runner 43.44%, Hustler 0.13% |
| Stash Heavy | 0% | 86.16% | 100% | 30 | Runner 60.60%, Hustler 24.52% |
| Yield Farmer | 0% | 18.57% | 100% | 30 | Runner 18.92% |
| Plug Skeptic | 0% | 61.72% | 100% | 30 | 100% Corner Boy |
| Plug Believer | 0% | 54.52% | 100% | 30 | 100% Corner Boy |
| Information-Aware Opportunist | 0% | 66.01% | 100% | 30 | 100% Corner Boy |

Hard bankruptcy is rare because protected reserves cannot be spent or lost under most M5 rules. That statistic masks economic stagnation: Random loses value in 90.28% of runs and Rumor Follower in 98.32%.

## 4. Robbery frequency and severity

Across baseline policies, robbery probability per settled day is 6.97%-7.10%. Over 30 days this produces:

- zero robberies: 10.81%-11.57% of runs;
- exactly one: 24.81%-26.02%;
- exactly two: 27.39%-28.19%;
- three or more: 35.08%-35.87%.

| Policy | Event median loss | Event P90 | Max event loss | Affected-run median | Affected-run P90 | Median cumulative loss/final NW | P90 loss/final NW |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 88 | 206 | 506 | 224 | 435 | 94.8% | 380.6% |
| Conservative | 170 | 409 | 3,083 | 411 | 1,010 | 18.4% | 149.1% |
| Aggressive | 129 | 346 | 1,768 | 348 | 749 | 27.0% | 151.2% |
| Rumor Follower | 25 | 103 | 393 | 87 | 170 | 25.8% | 64.4% |
| Opportunist | 244 | 1,278 | 11,677 | 728 | 2,840 | 12.8% | 51.4% |

Days are approximately uniform; no day exceeds about 3.7% of triggers. City concentration follows policy presence rather than a city modifier.

Classification: **BOTH frequency and severity** for Random/confused play; **FREQUENCY with severe lower-tail outcomes** for Conservative and Aggressive; **FREQUENCY but generally survivable severity** for Opportunist. Do not lower the daily rate until desired per-run event counts and protection effects are reviewed.

## 5. Raid frequency and severity

Raid probability per settled day is 4.90%-4.98%. Over a run:

- zero raids: 21.51%-23.05%;
- exactly one: 32.85%-34.35%;
- exactly two: 25.12%-25.98%;
- three or more: 18.06%-18.87%.

| Policy | Event median loss | Event P90 | Max event loss | Affected-run median | Affected-run P90 | Median cumulative loss/final NW | P90 loss/final NW |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 71 | 250 | 849 | 207 | 420 | 57.3% | 329.9% |
| Conservative | 146 | 468 | 3,613 | 300 | 894 | 10.6% | 67.3% |
| Aggressive | 129 | 407 | 3,896 | 342 | 680 | 18.2% | 137.6% |
| Rumor Follower | 0 | 0 | 428 | 88 | 161 | 0% | 0% |
| Opportunist | 264 | 1,260 | 5,832 | 600 | 2,244 | 7.7% | 37.9% |

Many triggered raids have zero value loss when nothing eligible is carried or locally stashed. Classification: **FREQUENCY** is high in narrative exposure; severity is **policy-dependent**, becoming **BOTH** for weak/random holdings and lower-tail aggressive runs.

## 6. Client analysis

Dedicated Client Seeker results:

| Client | Completion | Earliest observed | P25 | Median | P75 | P90 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pearl | 53.05% | Day 4 | 16 | 21 | 25 | 28 |
| Ray | 1.61% | Day 12 | 22 | 26 | 29 | 30 |
| Dispatcher | 0.05% | Day 26 | 26 | 28 | 29 | 29 |

| Client | Requirement | Minimum local-price capital | Inventory | Direct objective actions | City/rank |
| --- | --- | ---: | ---: | ---: | --- |
| Pearl | Deposit 40 Weed | `$1,840` (`$1,840-$3,600` range) | 40 | Buy + deposit | Compton; no rank |
| Ray | Deposit 15 Coke + 10 Molly | `$2,720` (`$2,720-$5,565`) | 25 | Two buys + two deposits | Inglewood; Pearl complete; no rank |
| Dispatcher | Sell 20 Meth | `$4,000` (`$4,000-$8,980`) | 20 | Buy + sell | Watts; Ray complete; no rank |

Acceptance itself costs no action. Walking costs a day rather than an action. Deposited product retains market value and yield but becomes location-bound, creating working-capital opportunity cost.

Findings:

- General policies fail clients largely because they do not pursue them (**B**).
- Pearl is achievable but capital-heavy relative to `$500` starting cash and usually completes late.
- Ray is structurally unrealistic for most 30-day runs under current capital/access sequencing (**C**).
- Dispatcher is effectively unreachable and normally arrives too late to create useful East LA play (**C**).
- Deposit progress is cumulative, so the same units can be withdrawn and redeposited to satisfy an order. This is a client-rule defect (**D**).
- Dispatcher content omits the legacy Chopper/Whip choice reward; only East LA unlock is implemented (**D/design gap**).

Requirements were not lowered.

## 7. Plug and rumor value

Blind Rumor Follower median is `$295`; Plug Believer `$623`; Plug Skeptic `$1,036`; Information-Aware Opportunist `$1,160`; pure Opportunist `$6,655`.

Across dedicated Plug policies:

- about 20 forecasts are generated per run;
- directional accuracy is 64.6%-65.2%;
- median absolute price error is 25%;
- profitable predicted-up realization is about 31%;
- false-positive rate is 16.9%-17.4%;
- false-negative rate is 17.9%-18.0%;
- predicted-up signals precede roughly `+$20` realized movement and predicted-down signals roughly `-$19`;
- high-confidence forecast expected movement is approximately `$0` (`-$0.08` to `+$0.27`).

Following every signal is intentionally worse than filtering: Plug Skeptic median exceeds Plug Believer by 66%. However, information-aware opportunism trails pure opportunism by 82.6%, so rational skilled play still learns to ignore the system.

Root cause: prediction direction contains a mean-reversion signal relative to the current bounded price, but `confidenceBps` is independently drawn and is not calibrated to realized future movement. Plug also has a retail-to-property haircut, cannot be liquidated, and consumes many actions. The intended lesson is only partially met.

## 8. Strategy analysis

### Conservative

High survival and 80.49% positive runs are healthy. The curve is not narrow: P10 `$234`, median `$2,227`, P90 `$8,405`, and SD `$3,611`. Conservative is survivable but has substantial lower-tail loss and upside dispersion.

### Aggressive

Aggressive is not delivering its target tradeoff. It has slightly more bankruptcy than Conservative, but P90 `$3,333` and P99 `$7,167` are far below Conservative P90 `$8,405` and P99 `$15,773`. It buys volatile assets regardless of entry price, producing more activity without compensating upside.

### Opportunist

Opportunist wins by buying below 38% of authored ranges and selling above 62%, not by one city or one asset. It has 95.91% positive runs and P10 `$1,444`; this is a dominant, easily expressed threshold policy rather than a fragile expert edge. Molly is the largest contributor, followed by Meth, Coke, and Weed. Walking rerolls markets by spending a day, but no same-day travel exploit was observed.

### Stash, rank, and yield

Stash Heavy is viable: median `$1,343`, 86.16% positive, mean stash value `$1,282`, Runner-or-better in 85.52%, and mean yield `$221`. Rank Climber reaches Runner 43.44% but has median `$413`, showing progression opportunity cost. Yield Farmer raises average yield to `$77.63` but locks working capital and has median `$196`; yield alone is not viable.

## 9. City analysis

| City | Observed use | Economic role/findings |
| --- | --- | --- |
| Compton | 100% visit rate | Mandatory start and dominant activity center; all one-city policies remain here. |
| Inglewood | 90%-99.8% for mobile market policies; 50.85% Client Seeker | Only broadly used alternative market and Ray location. |
| Long Beach | 0% | Pearl unlock is not followed by a tested economic reason to visit; ignored. |
| South Central | 0% | Ray unlock has no observed pull; ignored. |
| Watts | 1.45% Client Seeker; otherwise 0% | Dispatcher-only relevance and reached very late. |
| East LA | 0% | Dispatcher unlock is effectively unavailable within useful run time. |

Compton is mandatory; Inglewood is useful; the other four cities are inaccessible, late, or economically redundant under current policies. Names and cultural design were not changed.

## 10. Asset analysis

- Molly drives the largest winning-run contribution and produces about 92%-95% mean realized return for Conservative/Opportunist threshold play.
- Meth dominates Aggressive purchases after Day 5, but unconditional entry reduces its realized return to about 15%.
- Weed and Coke remain viable lower-volatility contributors; no single core product explains all Opportunist success.
- Plug is a trap asset under current rules for unfiltered players: almost every Rumor run buys it, it cannot be sold, and average contribution is negative due to its 50% property haircut and action cost.
- Stick, Chopper, and Whip are ignored by all purchase policies. Stick appears only as a rare client reward; transport has no simulated demand because walking is free in cash and agents do not unlock distant cities.

Trap assets can be intentional only when signals explain the risk. Current Plug confidence does not do that reliably.

## 11. Action economy

| Policy | Consumed actions/run | Mean unused at `EndDay` | `EndDay`/run | Buy | Sell | Stash | Plug | Walk commands |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 10.64 | 2.64 | 27.59 | 6.30 | 4.34 | 0.00 | 0 | 2.40 |
| Conservative | 20.74 | 2.30 | 27.64 | 12.98 | 6.35 | 1.42 | 0 | 2.18 |
| Aggressive | 43.55 | 1.57 | 29.65 | 23.85 | 19.70 | 0 | 0 | 0 |
| Rumor Follower | 11.31 | 2.62 | 30.00 | 1.81 | 0.55 | 0 | 8.95 | 0 |
| Opportunist | 25.48 | 2.07 | 26.69 | 17.23 | 8.26 | 0 | 0 | 3.07 |

The theoretical normal-action capacity is 90. No baseline policy approaches it, and most end days with more than two actions unused. Three actions create a ceiling but not meaningful scarcity for current policy behavior. Plug spends most of Rumor Follower's scarce actions without enough compensating value. Walking advances time but consumes no action.

## 12. Run pacing and snowballing

Median net worth by checkpoint:

| Policy | Day 5 | Day 10 | Day 15 | Day 20 | Day 25 | Day 30 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 498 | 424 | 354 | 290 | 238 | 195 |
| Conservative | 692 | 855 | 1,073 | 1,369 | 1,770 | 2,227 |
| Aggressive | 632 | 766 | 889 | 1,012 | 1,122 | 1,178 |
| Rumor Follower | 356 | 337 | 323 | 311 | 303 | 295 |
| Opportunist | 828 | 1,273 | 2,001 | 3,078 | 4,771 | 6,655 |

Random and Rumor decline throughout the run. Aggressive grows slowly and flattens late. Conservative compounds steadily. Opportunist accelerates after Day 10 without a dead middle.

Correlation with final net worth:

| Policy | Day 5 | Day 10 | Day 15 |
| --- | ---: | ---: | ---: |
| Random | 0.374 | 0.556 | 0.683 |
| Conservative | 0.469 | 0.632 | 0.765 |
| Aggressive | 0.495 | 0.684 | 0.802 |
| Rumor Follower | 0.476 | 0.602 | 0.704 |
| Opportunist | 0.403 | 0.566 | 0.715 |

Day 5 does not predetermine Day 30. By Day 15, especially for Aggressive, trajectory is strongly predictive. Compounding matters without making the opening completely deterministic.

## 13. Recovery analysis

Current recovery paths are favorable market movement, selling carried inventory, walking freely to a local stash, retrieving it, and rebuilding from a cheap asset. These paths preserve agency while any liquid or sellable holding remains.

Mathematically dead states exist when liquid cash falls below every reachable minimum price and no core inventory/stash remains. Protected reserves and gear cannot fund purchases; gear cannot be liquidated. The run can still advance but has no wealth-building command. Random hard failures occur late (median first bankruptcy Day 26 among affected runs), but long decline begins much earlier.

Future recovery candidates for design review, not implementation: small client jobs, temporary credit, low-risk hustle, information arbitrage, crew assistance, gear liquidation, cheap-city recovery, and emergency asset sales.

## 14. Value sources and sinks

Average per baseline run:

| Policy | Start | Yield source | Market/trade/revaluation gain | Robbery sink | Raid sink | Market/trade/property loss | Reconciliation error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 540 | 29.46 | 661.87 | 216.27 | 159.09 | 593.92 | 0 |
| Conservative | 540 | 243.36 | 5,291.72 | 462.85 | 315.48 | 1,852.33 | 0 |
| Aggressive | 540 | 170.92 | 2,375.39 | 350.48 | 263.51 | 915.09 | 0 |
| Rumor Follower | 540 | 0.87 | 337.92 | 84.82 | 9.93 | 477.10 | 0 |
| Opportunist | 540 | 517.25 | 12,999.83 | 1,083.49 | 737.37 | 3,016.15 | 0 |

Starting capital, yield, client gear rewards, and market/trade revaluation are sources. Robbery, raid, and negative market/property revaluation are sinks. Buying/selling and stash transfers are value transfers; reserve skim moves value from liquid cash to protected reserves. Travel has no cash fee. V2 has no random event reward/cost. Every measured run reconciles exactly; no unexplained creation/destruction was found.

Average final composition: Random `$68` cash / `$98` inventory; Conservative `$538` cash / `$1,191` inventory / `$1,079` stash; Aggressive `$213` cash / `$445` inventory; Rumor `$94` cash / `$7` inventory / `$161` gear; Opportunist `$2,723` cash / `$4,636` inventory. Remaining value is primarily protected reserves.

## 15. Proposed balance targets

These are `PROPOSED_BALANCE_TARGET`, not canon.

| Policy | Proposed evidence band |
| --- | --- |
| Random/beginner proxy | Completion >=99%; hard bankruptcy <3%; P10 >=`$100`; median `$225-$500`; positive runs 15%-35%; a recovery-capable holding through at least Day 15 in most runs. |
| Conservative | Bankruptcy <2%; positive runs >=75%; P10 >=`$250`; median `$1,500-$4,000`; P90 `$6,000-$12,000`; visibly lower downside and variance than Aggressive. |
| Aggressive | Bankruptcy 2%-10%; median `$1,000-$3,500`; P90 >=`$8,000`; P99 >=`$18,000`; greater relative variance and upside than Conservative. |
| Opportunist | Positive runs 75%-95%; median `$3,000-$8,000`; P10 `$500-$2,000`; P99 below approximately `$45,000`; performance should require multi-signal judgment rather than fixed range thresholds alone. |
| Rumor/Plug | Blind following may underperform; filtered median should exceed blind by >=20%; filtered positive runs >=50%; information-aware play should retain at least 70% of pure Opportunist median; confidence bands must show monotonic calibration. |
| Stash/Rank | Stash policy positive runs >=70%; rank pursuit may trade wealth for progression but should not make positive runs rarer than 30%; rank requirements must remain legible. |

Event target proposal: review per-run counts, not only daily rates. A healthy initial band is 50%-80% of runs seeing robbery, 35%-65% seeing a materially effective raid, and fewer than 25% seeing three or more of either. Severity should rarely exceed current wealth without an explicit high-risk position.

## 16. Hypotheses and changes tested

No balance parameter was changed, so `balanceVersion` remains unchanged.

| Hypothesis | Test | Result |
| --- | --- | --- |
| General agents merely ignore clients | Client Seeker | Partly supported for Pearl; rejected for Ray/Dispatcher due very low dedicated completion. |
| Filtered information beats blind belief | Plug Skeptic vs Plug Believer | Supported: median `$1,036` vs `$623`. |
| Information improves skilled opportunism | Information-Aware vs Opportunist | Rejected: median `$1,160` vs `$6,655`. |
| Aggressive risk earns compensating upside | Aggressive vs Conservative | Rejected at P90/P99 and bankruptcy spread. |
| Geographic stash use is viable | Stash Heavy | Supported: 86.16% positive and strong rank attainment. |
| Yield specialization is viable | Yield Farmer | Rejected: median `$196` despite higher yield contribution. |

The unsuccessful tests are retained in the machine-readable report. The only policy-code correction was preventing Information-Aware Opportunist from attempting a market command after actions reached zero; its 7,500 runs were discarded and rerun cleanly. No economy output changed.

## 17. Performance baseline

- Baseline 50,000-run wall duration: 655.64 seconds across five workers.
- Per-policy 10,000-run duration: 312.09-634.88 seconds.
- Per-worker throughput: 15.75-32.04 runs/sec and 1,123-1,356 engine commands/sec.
- Baseline commands: 2,669,534; aggregate parallel throughput approximately 4,071 commands/sec.
- Dedicated 52,500-run wall duration: 736.97 seconds across seven workers.
- Total M5.5 commands: 5,481,522.
- Peak detailed-worker RSS: approximately 489 MB at 10,000 retained compact traces.

This measures engine plus detailed trace aggregation on the local workstation, not an isolated engine microbenchmark. It is sufficient as a pre-M6 baseline but not an API latency claim.

## 18. Remaining design risks and M6 recommendation

M6 readiness recommendation: **HOLD** pending product review and targeted M5.5 follow-up.

Required decisions before M6 freezes contracts:

1. Define non-recyclable deposit progress semantics and restore/replace the Dispatcher reward contract.
2. Make forecast confidence calibrated to realized prices and decide acceptable Plug action/property cost.
3. Decide per-run robbery/raid frequency and tail-loss targets, especially for beginners.
4. Give Aggressive a credible upside/failure tradeoff without broad simultaneous tuning.
5. Decide whether fixed price-range thresholds are the intended core skill or an overly simple dominant strategy.
6. Define recovery behavior for no-liquid/no-sellable-asset states.
7. Give Long Beach, South Central, Watts, East LA, transport gear, and the three-action cap measurable economic purpose.
8. Review and approve or revise the proposed balance bands before any versioned parameter experiment.

No M6, Unity, Base, production, token, UI, graphics, or repository migration work is authorized by this report.

## 19. M5.6 superseding balance decision

M5.6 changes the economy and therefore supersedes M5.5 as the current balance recommendation while preserving this report as the before baseline.

Accepted version identifiers:

- economy: `economy-v2.m5.6`
- content: `content-v2.m5.6.1`
- balance: `balance-v2.m5.6.1`
- random strategy: `hmac-sha256-streams.1`

The final validation contains 100,000 runs across ten policies at 10,000 each. It confirms exact source/sink reconciliation, zero policy fallbacks, behavior-responsive event exposure, non-recyclable client progress, calibrated confidence, meaningful gear use, and strategic visitation of all six authored cities.

Key before/after outcomes:

- Opportunist median/P99: `$6,655/$38,770 -> $4,940/$24,128`.
- Aggressive P90/P99: `$3,333/$7,167 -> $8,364/$20,281`.
- Information-Aware median: `$1,160 -> $3,149`.
- Random positive-run rate: `9.72% -> 20.23%` without a subsidy.
- Client Seeker Pearl/Ray/Dispatcher: `53.05%/1.61%/0.05% -> 60.65%/34.14%/13.71%`.

The complete experiment log, rejected hypotheses, before/after tables, and remaining target misses are in `ECONOMY_CALIBRATION_M5_6.md`. M6 remains on hold for review of the Aggressive downside miss, Information-Aware relative-median miss, and provisional city/Heat decisions.
