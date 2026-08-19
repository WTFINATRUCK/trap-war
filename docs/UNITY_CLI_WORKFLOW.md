# Trap Wars Unity CLI Workflow

## Pinned Environment

- Official Unity CLI: `1.0.0-beta.3`
- CLI executable: `C:\Users\rjfle\AppData\Local\Unity\bin\unity.exe`
- Required Editor: `6000.3.20f1 (c9ba695d4f07)`
- Editor executable: `C:\Program Files\Unity\Hub\Editor\6000.3.20f1\Editor\Unity.exe`
- Project: `C:\Users\rjfle\OneDrive\Documents\New project\trap-war\game\unity`
- Helper: `Tools\Unity\TrapWars-Unity.ps1`

Authentication is handled by the official CLI through Windows Credential Manager. No credential, token, or authentication file belongs in this repository.

## Commands

Run from the repository root:

```powershell
.\Tools\Unity\TrapWars-Unity.ps1 status
.\Tools\Unity\TrapWars-Unity.ps1 open
.\Tools\Unity\TrapWars-Unity.ps1 test-editmode
.\Tools\Unity\TrapWars-Unity.ps1 test-playmode
.\Tools\Unity\TrapWars-Unity.ps1 build-dev
.\Tools\Unity\TrapWars-Unity.ps1 build-release
.\Tools\Unity\TrapWars-Unity.ps1 run-validation
.\Tools\Unity\TrapWars-Unity.ps1 capture-m84
```

`status` and `open` use the official Unity CLI. Tests, builds, static validation, and M8.4 capture use the pinned direct Editor CLI because those established workflows do not require the experimental Unity Pipeline package.

`run-validation` verifies CLI authentication, installed Editors, project metadata, the pinned project version, EditMode tests, PlayMode tests, and static source compilation.

`capture-m84` creates a temporary local trigger, runs the 12-frame M8.4 route, and removes the trigger even if Unity fails. Generated command logs and local builds are written below ignored `artifacts/` and `Builds/` directories.

## Current Verification

- CLI authentication: fresh OAuth session from Windows keyring
- Required Editor detected: yes
- Project registered in the shared Unity Hub/CLI catalog: yes
- Project version: `6000.3.20f1`
- Render pipeline: URP
- EditMode: 6 passed, 0 failed
- PlayMode: 10 passed, 0 failed
- M8.4 evidence route: 12 captures, exit code 0
- M8.4 release build: succeeded, version `0.8.4`, development false, debugging false

## Limitations

- Unity CLI is officially distributed but still marked experimental by Unity.
- `unity doctor` reports that Windows long-path support is disabled. The current project path and all completed commands work, but deeply nested future assets could approach Windows path limits.
- The optional `com.unity.pipeline` package is not installed. Existing direct Editor automation remains the lower-risk fallback for tests, builds, and capture until live Editor command control provides a concrete project benefit.
- Another Editor (`6000.5.7f1`) was already installed before this work. It was not changed or used; Trap Wars remains pinned explicitly to `6000.3.20f1`.
