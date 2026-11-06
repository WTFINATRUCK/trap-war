# Trap Wars

A 3D street-economy strategy game. Every market move has consequences, and the consequences teach real financial
concepts: liquidity, risk sizing, supply and demand.

**Play the browser demo:** https://trap-war.com/play (desktop Chrome or Edge recommended)

## Repository layout

| Path | What it is |
|---|---|
| `game/unity/` | Unity 6 (6000.3.20f1, URP) game client. Builds to WebGL and Windows. |
| `apps/api/` | Authoritative game API (Fastify + PostgreSQL). Owns every run, trade and day transition. |
| `packages/economy-engine/` | Deterministic TypeScript economy engine shared by the API and its simulations. |
| `src/` | Website (React + Vite): landing page at `/`, playable demo at `/play`. |
| `public/play/game/` | WebGL build of the Unity client, served by the website. Produced by CI, not edited by hand. |
| `api/v1/`, `serverless/` | Vercel function entry points that host the API. |
| `scripts/` | API bundling for Vercel and a Windows helper for Unity batch tasks. |
| `docs/` | Game design, architecture, economy and art documentation. |

## Day 1 loop

Safehouse → Trap Phone (Word on the Street) → walk the block and read the clues → talk to Ray → review the market →
buy or sell → see the consequence and the lesson → end the day → Day 2 hook.

## Develop the website and API

Requirements: Node.js 24 and Docker (for PostgreSQL).

```bash
npm install
cp .env.example .env
docker compose up -d          # local PostgreSQL
npm run db:migrate
npm run api:dev               # API on http://127.0.0.1:8787
npm run dev                   # website on http://localhost:5173 (proxies /api to the API)
```

```bash
npm run typecheck             # website, API and economy engine
npm test                      # economy engine and API tests
npm run build                 # production website + bundled API
```

## Develop the game

Open `game/unity` in Unity **6000.3.20f1** with WebGL Build Support. Git LFS is required (`git lfs install` before
cloning) because character models are stored in LFS.

The world is assembled at runtime by `GreyboxWorldBuilder`, so press Play in `Assets/Scenes/Main.unity` to see it.
In the Editor the game talks to the local API at `http://127.0.0.1:8787`; in a WebGL build it calls the API on the
same domain that serves the page.

Controls: WASD move, mouse look, Shift sprint, E interact, Tab phone, G cycle graphics quality (Low / Medium / High).
Browsers start on Medium and drop to Low automatically if the frame rate stays under 26 FPS.

Menu commands live under **Trap Wars** in the Editor menu bar (build WebGL, build Windows, rebuild character assets).
On Windows the same tasks run headless:

```powershell
./scripts/unity.ps1 test-editmode
./scripts/unity.ps1 test-playmode
./scripts/unity.ps1 build-webgl     # writes public/play/game
```

## Continuous integration

- **Web** (`.github/workflows/web.yml`): typecheck, tests and production build on every push and pull request.
- **Unity** (`.github/workflows/unity.yml`): on changes under `game/unity/`, runs edit and play mode tests and builds
  WebGL in the cloud with [GameCI](https://game.ci). On `main`, the fresh build is committed to `public/play/game`,
  which Vercel deploys. No local Unity build is needed to ship the game.

The Unity workflow needs three repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `UNITY_EMAIL` | Unity account email |
| `UNITY_PASSWORD` | Unity account password |
| `UNITY_LICENSE` | Contents of your `Unity_lic.ulf` license file ([how to get it](https://game.ci/docs/github/activation)) |

Without them the Unity workflow skips its jobs with a warning instead of failing.

## Deployment

Vercel builds the website and API from `main` (`npm run build`). The API needs `DATABASE_URL` and
`RUN_SEED_ENCRYPTION_KEY` set in the Vercel project.

## Licensing

Code is MIT licensed (see `LICENSE`). Third-party art and audio keep their own licenses, listed in
[`docs/art/asset-licenses.md`](docs/art/asset-licenses.md).
