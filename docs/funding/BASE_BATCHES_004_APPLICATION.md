# Trap Wars - Base Batches 004 Application Draft

## Links

- **PUBLIC PLAYABLE DEMO:** https://trap-war.com/play
- **TRAILER:** `docs/funding/TRAP_WARS_BASE_INVESTOR_TRAILER_V2.mp4`
- **GITHUB:** https://github.com/WTFINATRUCK/trap-war
- **PUBLIC EVIDENCE:** `docs/evidence/public_demo/final/`
- **ACCEPTANCE:** Chrome PASS, Edge PASS, refresh/resume PASS, independent guest PASS.

### Working Now

Public Unity WebGL client at `https://trap-war.com/play`, pseudonymous guest sessions, authoritative Fastify runs, hosted PostgreSQL persistence, Trap Phone, Word on the Street, safehouse-to-street traversal, Ray dialogue, Hub market review, authoritative buy/sell command, consequence reveal, End Day, Day 2 hook, save/resume, independent guest isolation, V2 gameplay trailer, and the investor website.

### Demo / Testnet

Optional Base Sepolia (`84532`) identity proof panel after gameplay. The public demo copy states that the proof is valueless and optional, sends no token or value transfer, and collects no private key or seed phrase. Human wallet-signature validation remains owner-controlled.

### Planned

Backend-verified wallet linking, wider external playtesting, production content expansion, production art/audio polish, security review, legal/compliance review, and value-bearing features only after approval.

## One-Liner

Trap Wars turns financial literacy and onchain finance into a playable street-economy strategy game where players learn by making moves, living with the consequences, and progressing through the world.

## Company

Trap Wars is an independent game venture building a culturally fluent strategy game at the intersection of entertainment, practical financial education, and consumer onchain onboarding. The company is currently founder-led. Founder biography, legal entity name, incorporation details, and contact information must be supplied by the owner before submission.

## Product

Trap Wars is a 3D street-economy strategy game. The player starts with limited cash, incomplete information, and three actions per day. Through the Trap Phone, characters such as Ray, and a changing market, the player reads opportunities, reviews risk, buys or sells, experiences the result, and then unlocks the financial concept behind the decision.

The current public vertical slice covers the safehouse, Word on the Street, neighborhood traversal, Ray, market review, authoritative trade resolution, an educational liquidity reveal, End Day, a Day 2 hook, and an optional Base Sepolia identity-proof panel. The latest evidence set is captured from the deployed WebGL build at `docs/evidence/public_demo/final/`.

## Problem

Financial education is often abstract, intimidating, and disconnected from the decisions people actually make. DeFi onboarding compounds that problem by asking mainstream users to understand wallets, networks, and protocols before they have experienced a compelling reason to care.

## Solution

Trap Wars teaches through consequence. Street-language concepts appear first, the formal financial term appears after the player feels the result, and deeper explanation remains optional. Gameplay establishes value before any wallet prompt. Selected identity, achievements, ownership, and economic actions can later move onchain without turning the game into a DeFi dashboard.

## Why Now

Consumer onchain infrastructure is becoming less visible and more usable while financial literacy remains an unsolved mainstream need. Smart-account and passkey direction can remove seed-phrase and network-switching friction. At the same time, audiences increasingly learn complex systems through interactive products rather than coursework. Trap Wars connects those trends through a game people can understand before they understand the chain.

## Why Base

Base is the natural home for Trap Wars because it combines low-cost EVM execution, a consumer-focused builder ecosystem, smart-account direction, and potential distribution through the broader Coinbase ecosystem. It also sits inside an active financial ecosystem that makes progression from game player to onchain participant credible.

Trap Wars does not use Base as cosmetic branding. The intended funnel is:

`PLAY -> UNDERSTAND VALUE -> OPTIONAL BASE IDENTITY -> CONTINUE PROGRESSION`

The current web proof can connect a compatible wallet, switch or add Base Sepolia (`84532`), and request a valueless identity signature after the product story. It stores no signature or credential and never blocks play. A production implementation will verify a nonce-bound signature on the authoritative backend and link the resulting wallet to the existing player identity.

## Technical Architecture

- Unity `6000.3.20f1` 3D client with movement, camera, dialogue, Trap Phone, market, education, and day progression.
- Deterministic TypeScript economy engine with versioned content, balance, and random strategy.
- Authoritative Fastify API with command validation and replay-safe outcomes.
- PostgreSQL persistence with transactions, idempotency, conflict reconciliation, and save/resume.
- Analytics event architecture for progression, decisions, learning behavior, and onboarding funnels.
- Base integration isolated behind an adapter boundary; Base Sepolia only for the development proof.

## Product Status

### Built

- Playable Unity vertical slice and Windows standalone build pipeline.
- 30-day deterministic economy structure.
- Trap Phone, Word on the Street, Ray, market review, buy/sell, consequence, educational reveal, End Day, and Day 2.
- Authoritative API, PostgreSQL schema, persistence, idempotency, conflict handling, and save/resume.
- Investor-facing web experience using actual runtime evidence.
- Optional Base Sepolia wallet/network/signature proof in the web experience.

### Validated

- 100,000 deterministic M5.6 economy simulation runs across ten agent policies.
- Unity EditMode and PlayMode test infrastructure.
- Movement acceptance evidence and continuous runtime captures.
- API regression and performance baseline infrastructure.
- Fresh current-build public route capture and `TRAP_WARS_BASE_INVESTOR_TRAILER_V2.mp4`.

These are engineering and product validation signals. They are not claims of users, retention, revenue, wallets, or transaction volume.

### Planned

- External playtesting with measured completion, comprehension, and onboarding funnels.
- Production-quality character, environment, animation, audio, and facial polish.
- Backend-verified wallet-link challenges and sponsored allowlisted Base Sepolia interactions.
- Security review, legal/compliance review, and recovery UX before any value-bearing feature.
- Wider PC/web distribution and a scalable content/live-operations pipeline.

## Founder

Owner input required before submission: concise founder biography, relevant lived experience, product insight, technical/creative role, full-time status, location, and links. Do not submit placeholder biography text.

## Market

Trap Wars sits across strategy games, simulation/economy games, financial education, and consumer onchain applications. Its initial audience is players attracted to progression, market judgment, street culture, and creator-led game discovery, including people who would never begin with a traditional financial course or DeFi product. Market sizing must use sourced external data before submission; no unsupported TAM figure is included here.

## Business Model

The proposed model is a premium free-to-start game with ethical cosmetic customization, content expansions, optional season or creator content, and platform/distribution partnerships. Future onchain functionality may support selected identity, achievement, or ownership experiences, but the business does not depend on launching a token, promising yield, or selling speculative assets.

## Competition

Adjacent products include economy/management games, financial-learning apps, life simulators, and gamified Web3 onboarding. Most teach without a compelling world, or add wallets to products whose core loop does not need them. Trap Wars differentiates through consequence-based learning, a culturally specific world, a server-authoritative economy, and onboarding that delays chain complexity until after gameplay value is clear.

## Differentiation

1. Financial concepts are learned through decisions and consequences rather than quizzes.
2. The Trap Phone integrates information, market action, inventory, messages, and contacts into the fiction.
3. The deterministic economy and authoritative backend make the product technically credible beyond a visual prototype.
4. Base remains infrastructure instead of replacing the game fantasy.
5. The Everybody Eats direction gives information sharing, crews, referrals, and status a natural social role without speculative reward promises.

## Traction / Validation

Trap Wars does not currently claim public user traction, retention, revenue, wallets, or onchain transaction volume.

Verified engineering validation includes a working vertical slice, 100,000 deterministic economy runs, authoritative command handling, PostgreSQL persistence, replay/idempotency behavior, Unity test infrastructure, movement acceptance, analytics architecture, and repeatable runtime evidence capture.

The next validation step is instrumented player testing focused on route completion, decision comprehension, financial-term recall, return intent, Base onboarding start/completion, and abandonment.

## Roadmap

### 0-3 Months

Harden the fundable slice, complete external art/audio replacement, run structured player tests, instrument the learning funnel, and implement backend-verified optional Base Sepolia identity linking.

### 3-6 Months

Expand replayable content within the existing architecture, add creator/community loops, improve onboarding and accessibility from observed behavior, and complete security and compliance reviews for the next Base proof.

### 6-12 Months

Ship a broader closed alpha, establish a live content pipeline, test acquisition and referral channels, validate monetization that preserves player trust, and prepare the product for wider distribution.

## Use of Funds - Proposed $100,000

| Category | Allocation | Purpose |
| --- | ---: | --- |
| Product / Engineering | $30,000 | Client polish, backend integration, analytics, build/release hardening |
| Art / Animation | $22,000 | Hero, Ray, safehouse/street environment, locomotion, facial work |
| Audio | $8,000 | Music direction, ambience, UI, dialogue support, mix |
| Infrastructure | $8,000 | Staging, PostgreSQL, observability, build distribution |
| Security | $8,000 | Wallet-link review, threat modeling, external assessment |
| User Testing | $10,000 | Recruiting, incentives, moderated tests, comprehension research |
| Growth / Community | $8,000 | Creator tests, community operations, launch materials |
| Legal / Compliance | $6,000 | Entity, IP, privacy, financial-feature and marketing review |
| **Total** | **$100,000** | |

No part of this table claims spending already incurred.

## Vision

Trap Wars can become a mainstream game franchise in which financial judgment is a core form of player skill. A player should arrive for the world, stay for the strategy, leave with sharper instincts, and only then discover that selected parts of their identity and progression can travel through Base. Funding would accelerate an existing playable and technically substantial product rather than finance an untested idea.

## Submission Checklist

- Add founder and company facts.
- Add sourced market data.
- Confirm the latest Windows build and public demo URL.
- Replace draft footage only if a newer verified runtime trailer is available.
- Run legal review on all public financial-learning and onchain language.
- Do not claim a Base or Coinbase partnership.
