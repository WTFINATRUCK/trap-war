# Trap Wars V2 Economy Simulation

Status: M5.6 final validation; earlier sections preserve historical baselines
Date: 2026-08-11
Engine: `economy-v2.m5.6`
Current report: `packages/economy-engine/simulation/m5.6-final-report.json`
Historical M5 report: `packages/economy-engine/simulation/latest-report.json`

## 1. Method

The headless simulator ran 1,000 deterministic seeds for each of five policies, 5,000 complete runs total. Every policy uses the public `executeCommand` API and receives no direct state mutation, privileged price, or hidden random information.

Policies:

- **Random**: randomly chooses valid small trades, occasional stash deposits/travel, or early day end.
- **Conservative**: keeps a cash reserve, buys low, sells high, and uses stashes.
- **Aggressive**: prioritizes the highest-volatility available product and deploys nearly all cash.
- **Rumor follower**: buys Plug access, requests forecasts, and follows the current hint.
- **Opportunist**: buys the strongest normalized discount and sells the strongest normalized premium.

Agent policy randomness uses a deterministic local generator. Economy outcomes use the engine's HMAC-SHA256 named streams. Each run is capped at 250 commands and must reach an authoritative terminal state; a rejected policy command falls back to `EndDay` with a new command ID.

## 2. Results

All 5,000 runs completed on Day 30 with no command-budget stalls.

| Agent | Net worth mean | P10 | Median | P90 | Maximum | Mean actions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | `$256.51` | `$81` | `$190` | `$521` | `$1,898` | 10.47 |
| Conservative | `$3,362.14` | `$248` | `$2,226` | `$8,092` | `$23,472` | 20.74 |
| Aggressive | `$1,581.93` | `$205` | `$1,206` | `$3,377` | `$15,262` | 43.15 |
| Rumor follower | `$305.84` | `$234` | `$295` | `$378` | `$973` | 11.38 |
| Opportunist | `$9,090.12` | `$1,318` | `$6,189` | `$21,082` | `$48,067` | 25.22 |

| Agent | Bankruptcy rate | Any robbery | Any raid | Mean stash value | Mean gear value | Mean clients complete |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Random | 0.3% | 89.1% | 77.4% | `$0` | `$0` | 0.00 |
| Conservative | 0.0% | 87.6% | 77.5% | `$1,040.56` | `$0` | 0.00 |
| Aggressive | 0.1% | 87.8% | 77.7% | `$0` | `$0` | 0.00 |
| Rumor follower | 0.0% | 88.6% | 79.5% | `$0` | `$161.15` | 0.00 |
| Opportunist | 0.0% | 88.1% | 81.9% | `$0` | `$0` | 0.00 |

Rank outcomes were mostly Corner Boy. Conservative reached Runner in 26.0% and Hustler in 2.9% of runs; all other sampled policies remained Corner Boy because they did not satisfy diversity/stashed-location gates even when wealth was high.

## 3. Initial findings

### 3.1 Price timing is the dominant edge

The opportunist median is 2.78 times the conservative median and 5.13 times the aggressive median. Its P90 exceeds `$21,000`. Buying against normalized ranges is substantially stronger than following volatility alone. This may be a valid learning reward, but the spread is wide enough to require a target outcome curve and exploit review.

### 3.2 Conservative stash play is viable

Conservative is the only policy with meaningful stash value and the only one that reaches higher ranks. The median remains positive despite low-tail exposure. Stashes therefore have observable strategic value after correcting the carried/stashed yield formula and global capacity accounting.

### 3.3 Rumors are not yet sufficiently actionable

The rumor policy has a narrow distribution and avoids bankruptcy, but its `$295` median is low relative to deliberate trading. Buying the Plug, spending actions on forecasts, and waiting for favorable conditions currently costs more opportunity than the hint recovers. Forecast-to-future-market correlation, expiry, travel targeting, and action cost need explicit balance experiments before narrative claims are written.

### 3.4 Cumulative risk may feel constant

Between 87.6% and 89.1% of runs experienced at least one robbery; between 77.4% and 81.9% experienced at least one raid. A 30-day horizon compounds modest daily probabilities into near-universal exposure. Product review should set desired per-run event frequency, repeat-event distribution, and protection value rather than tuning from daily rates alone.

### 3.5 Client progression is not naturally discovered by these policies

No sampled general-purpose policy completed a client. This does not prove objectives are impossible: the agents were not scripted to satisfy quests. It does show that ordinary profit-seeking behavior does not incidentally complete the current deposits/sales, and that the simulator needs a dedicated client-completion policy before gate difficulty can be judged.

### 3.6 Rank incentives are orthogonal to pure profit

The opportunist earns high wealth but remains Corner Boy because it lacks diversity and multi-location stashes. That separation can support meaningful strategic identity, but only if players can see why rank did not advance and understand the tradeoff before committing a run.

## 4. Bugs found during simulation work

The initial implementation was corrected before this baseline was generated:

- stash value was absent from net worth;
- reserve skim was treated as a sink instead of a transfer to protected reserves;
- Plug property had no valuation rate;
- rank yield bonus was added as raw yield basis points instead of multiplying the asset yield;
- carried inventory yield and the legacy `1.25x` stash multiplier were missing;
- Whip and walking were incorrectly constrained to adjacent cities;
- expensive-city price bias used `1.20x` instead of the legacy `1.15x`.

Regression tests now cover the accounting, reference yield, utility valuation, and travel corrections.

## 5. Limits

- The policies are simple heuristics, not optimal solvers or human behavior models.
- The simulator does not model UI comprehension, narrative choice, accessibility, latency, disconnection, or adversarial command traffic.
- No legacy 5,000-run baseline is claimed because the old engine uses global `Math.random`, UI-owned branches, and different terminal/action behavior.
- Current robbery and raid numeric formulas are V2 balance candidates rather than full branch parity with the legacy engine.
- Forecast quality is measured only through policy outcomes; calibration against realized future prices needs a dedicated experiment.
- The report is not approval for tuning, M6, production authority, real money, or chain integration.

## 6. Next experiments before M6

1. Add a client-completion policy and measure objective completion day/cost/failure rate.
2. Add perfect-information and no-information controls to quantify the intended value of rumors.
3. Report event counts per run, not only any-event rates, and test protection gear/stash shields.
4. Add legacy fixed-random-tape fixtures for risk, encounter, transport, rank, and client branches.
5. Establish reviewed P10/median/P90 targets for wealth, score, rank, and failure before changing `balanceVersion`.
6. Add performance benchmarks and a fixed-seed statistical regression corpus suitable for CI.

## 7. M5.5 superseding calibration

M5.5 expands this initial 5,000-run baseline to 102,500 runs across 12 policies with full percentile distributions, event frequency/severity, client timing, forecast realization, city/asset/action analysis, pacing, snowball correlation, source/sink reconciliation, drawdown, and performance metrics.

The complete analysis is in `ECONOMY_BALANCE_REPORT.md`; machine-readable evidence is in `packages/economy-engine/simulation/m5.5-calibration-report.json`.

Key changes in evidence, not balance:

- Required five-policy baseline: 50,000 runs at 10,000 each.
- Dedicated policies: 52,500 runs at 7,500 each.
- Opportunist median `$6,655`; Conservative `$2,227`; Aggressive `$1,178`; Rumor Follower `$295`; Random `$195`.
- Filtered Plug use beats blind belief, but information-aware play remains far below pure opportunism.
- Client Seeker completes Pearl 53.05%, Ray 1.61%, and Dispatcher 0.05%.
- No unexplained value source or sink was observed.
- No balance parameter changed; all four version identifiers remain pinned.

M5.5 recommends holding M6 until the design risks and proposed balance bands receive review.

## 8. M5.6 strategic-diversity validation

M5.6 uses a process-isolated batch runner so each deterministic policy writes an independent report before aggregation. The final command shape is:

```powershell
npx tsx simulation/batch.ts --agents "random,conservative,aggressive,rumor_follower,opportunist,information_aware_opportunist,client_seeker,stash_heavy,yield_farmer,gear_strategist" --runs 10000 --workers 10 --output-dir simulation/calibration-results/m5.6/final-100000 --output simulation/m5.6-final-report.json
```

Final scale and integrity:

- 100,000 runs, ten policies, 10,000 runs each;
- 5,113,486 authoritative engine commands;
- 1,251.50-second parallel wall time before one isolated Rumor policy replacement;
- 100% day-30 completion;
- zero rejected-policy fallbacks;
- zero source/sink reconciliation error;
- confidence-band accuracy and low-capital recovery metrics included.

The simulator now reports `lowCapitalDay10Rate`, `positiveRecoveryRate`, `directionAccuracyByConfidence`, and `profitableRateByConfidence`. The durable report is `packages/economy-engine/simulation/m5.6-final-report.json`; the detailed interpretation is `docs/ECONOMY_CALIBRATION_M5_6.md`.
