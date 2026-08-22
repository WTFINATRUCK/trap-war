# Public Demo Validation

- Canonical URL: https://trap-war.com/play
- Unity: 6000.3.20f1 WebGL
- Public API: https://trap-war.com/api/v1
- Database: hosted PostgreSQL (Neon), migrations applied
- Browser: Chromium desktop, 1440x900, fresh public HTTPS session
- WebGL payload: 45,349,672 bytes compressed
- Data: 35,296,585 bytes; WASM: 9,852,048 bytes
- Canvas: 1440x792, loader completed, no failed asset requests
- Headed Chrome cold load: 33.5 seconds
- Headed Chrome 10-second sample: 45.0 average FPS, 33.4 ms P95 frame time
- Browser JavaScript heap after load: approximately 202 MB
- Guest auth: passed
- Authoritative run creation: passed
- Trap Phone: passed
- Unity EditMode: 6 passed, 0 failed
- Unity PlayMode: 10 passed, 0 failed

Anonymous abandoned demo records are retained temporarily under the current hosted demo environment. Automated retention cleanup must be enabled before broad acquisition; no browser receives database credentials or run seed material.

Known limitation: WebGL logs nonfatal missing `MeshCollider` component messages for stripped imported geometry. The visible safehouse and UI render, but the complete Day 1-to-Day 2 public route still requires final owner/human acceptance before the link is represented as funding-ready.
