# Trap Wars Worktree Recovery Snapshot

Captured before the development-environment and character-movement repair on 2026-08-18.

## Repository

- Root: `C:\Users\rjfle\OneDrive\Documents\New project\trap-war`
- Branch: `main`
- HEAD: `6b3592b7275e691eb2bcc4cc288af390db6c0b6d`
- Tracking branch: `origin/main`
- Remote: `https://github.com/WTFINATRUCK/trap-war.git`
- Local commits ahead: `0`
- Local commits behind: `0`
- Tracked files at HEAD: `90`
- Nested repositories: none; only the repository-root `.git` exists

## Working Tree Before Repair

- Modified tracked files: `4` with content changes (`.env.example`, `.gitignore`, `package-lock.json`, `package.json`)
- Additional tracked bundle files reported modified by Git metadata/line-ending state: `4`
- Untracked files before this snapshot: `629`
- Untracked distribution: `game` 386, `docs` 133, `packages` 71, `apps` 24, `artifacts` 13, plus `.gitattributes` and `docker-compose.yml`
- The M0-M8.2B Unity, API, economy-engine, documentation, and evidence work had not been committed to the remote repository.

## Ignored And Local-Only State

- Secrets/local configuration: `.env`, `apps/api/.env`
- Unity generated state: `game/unity/Library`, `game/unity/Logs`, `game/unity/UserSettings`, plus Temp/obj/build patterns
- Local standalone builds: `Builds`
- Editable high-resolution art sources: `SourceArt`
- Git LFS 3.7.1 is installed. `.gitattributes` tracks FBX, Blend, PSD, SPP, EXR, WAV, FLAC, MP4, and MOV assets through LFS.
- The repository is under OneDrive. Files report OneDrive reparse/cloud attributes, but no conflict-copy filenames or nested duplicate repositories were found.

## Unity Project

- Project root: `C:\Users\rjfle\OneDrive\Documents\New project\trap-war\game\unity`
- Required directories present: `Assets`, `Packages`, `ProjectSettings`
- Project editor: Unity `6000.3.20f1` (`c9ba695d4f07`)
- Installed editors include `6000.3.20f1` and `6000.5.7f1`; this repair must not upgrade the project.

## Recovery Rules

No hard reset, forced checkout, clean, history rewrite, or automatic repository relocation is authorized. Local secrets, generated Unity state, and standalone builds must remain excluded. A controlled checkpoint may be created only after runtime, Unity tests, API/economy regression, and secret review pass.
