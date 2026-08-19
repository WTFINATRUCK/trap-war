# Unity Hub Repair

## Root Cause

The Unity project existed and was healthy, but it had only been launched through the Editor, command line, and automated test tooling. Unity Hub 3.20.1 had no registered projects.

## Repair

The existing project was added from disk through Unity Hub without copying, moving, upgrading, or creating a second project.

- Project path: `C:\Users\rjfle\OneDrive\Documents\New project\trap-war\game\unity`
- Editor: Unity `6000.3.20f1`
- Required roots: `Assets`, `Packages`, and `ProjectSettings` present
- Duplicate project: none
- Nested Git repository: none
- Hub row label: `unity`, derived from the required project-root directory name
- Product name inside Unity: `Trap Wars V2 Greybox`

Hub displays the exact project path and editor version. The row label is cosmetic; changing it would require renaming the required project-root directory or maintaining a duplicate path, neither of which is authorized.

## Acceptance

- Project appears in Hub: PASS
- Exact existing path: PASS
- Correct editor association: PASS
- No project upgrade: PASS
- No duplicate project: PASS
- Assets/scripts preserved: PASS
- Open from Hub after Git checkpoint: pending final post-push verification
