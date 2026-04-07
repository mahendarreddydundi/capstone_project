# Windows Laptop Fingerprint in Codespace: Will It Work?

Short answer: yes, but not as raw fingerprint pixels.

## What Works

If you open this app in your Windows browser, Windows Hello can use your fingerprint sensor.
The browser returns only cryptographic proof (WebAuthn), not fingerprint image/pixels.

This is secure and standard for production systems.

## What Does Not Work

- Codespace cannot directly access your laptop fingerprint hardware.
- Windows Hello does not expose raw fingerprint image data to web apps.
- So direct pixel extraction from the keyboard sensor is not possible in Codespace.

## Why This Still Solves Your Mentor Requirement

You still get biometric verification using your real fingerprint sensor.
Instead of storing pixels, you store cryptographic credential data and verification results.

For research paper:
- Add a note that consumer sensors are privacy-protected.
- Use WebAuthn results (verified true/false, latency, FAR/FRR based on outcomes).
- If you need raw pixels, use dedicated SDK scanners (Futronic/ZKTeco) in a local setup.

## Run It

1. Install dependencies

```bash
cd TESTING_FP/windows_hello_webauthn
npm install
```

2. Start demo server

```bash
npm start
```

Use the same host consistently in both browser URL and server config:
- If you open `http://localhost:8085`, keep default RP_ID/ORIGIN.
- If you open `http://127.0.0.1:8085`, start with:

```bash
export ORIGIN="http://127.0.0.1:8085"
export RP_ID="127.0.0.1"
npm start
```

Do not mix `localhost` and `127.0.0.1` in the same run.

If you open the app on a GitHub Codespaces forwarded URL (not localhost), set ORIGIN and RP_ID first:

```bash
export ORIGIN="https://YOUR-CODESPACE-URL"
export RP_ID="YOUR-CODESPACE-HOSTNAME"
npm start
```

Example:
- ORIGIN = https://friendly-space-xyz-8085.app.github.dev
- RP_ID = friendly-space-xyz-8085.app.github.dev

3. Open forwarded port 8085 in your Windows browser

4. In UI
- Enter username
- Click Register Fingerprint Credential
- Complete Windows Hello prompt
- Click Authenticate Login

## Integration Path With Your Gateway

- Keep your current HMAC + PUF flow.
- Add WebAuthn verification before `/auth` success.
- Log WebAuthn verification result on blockchain.
- Continue using nonce + timestamp for replay protection.

## Files

- Server: [TESTING_FP/windows_hello_webauthn/server.js](TESTING_FP/windows_hello_webauthn/server.js)
- Client UI: [TESTING_FP/windows_hello_webauthn/public/index.html](TESTING_FP/windows_hello_webauthn/public/index.html)
- Package: [TESTING_FP/windows_hello_webauthn/package.json](TESTING_FP/windows_hello_webauthn/package.json)
