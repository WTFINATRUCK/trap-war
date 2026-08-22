# Trap Wars

Trap Wars is a 3D street-economy strategy game where market decisions create consequences and consequences reveal practical financial concepts.

## Play Demo

**Public desktop demo:** https://trap-war.com/play

Chrome or Edge is recommended. Click **Play Demo**; no account, wallet, Unity installation, or local database is required.

## Project Overview

The current vertical slice begins in the safehouse and follows a Day 1 route through the Trap Phone, Word on the Street, Ray, a market decision, an authoritative consequence, a liquidity lesson, End Day, and a Day 2 hook.

## Tech Stack

- Unity `6000.3.20f1`, URP, Input System, and WebGL/Windows players
- React, TypeScript, and Vite public site
- Fastify authoritative API and PostgreSQL
- Deterministic TypeScript economy engine
- Optional Base Sepolia proof after gameplay
- Vercel public hosting and serverless API

## Demo Status

The public WebGL client, guest authentication, authoritative run creation, and hosted PostgreSQL are live. This development demo is not a claim of public traction, revenue, token activity, or financial returns.

## Base Testnet Integration

The site includes an optional wallet/network/signature proof for Base Sepolia (`84532`) after gameplay. It transfers no value, stores no private key or seed phrase, and never blocks the game. Backend-verified wallet linking is planned.

## Build Locally

Prerequisites: Node.js, Unity `6000.3.20f1`, and Unity Web Build Support.

```powershell
npm install
npm run build
./Tools/Unity/TrapWars-Unity.ps1 test-editmode
./Tools/Unity/TrapWars-Unity.ps1 test-playmode
./Tools/Unity/TrapWars-Unity.ps1 build-webgl
```

The API requires the variables documented in `.env.example`. Never commit local environment files or credentials.

## Repository

https://github.com/WTFINATRUCK/trap-war
