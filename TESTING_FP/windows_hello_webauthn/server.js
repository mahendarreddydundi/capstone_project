const express = require('express');
const crypto = require('crypto');
const path = require('path');

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const rpName = 'Capstone FP Demo';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.ORIGIN || 'http://localhost:8085';
const port = Number(process.env.PORT || 8085);

// Demo in-memory store. Replace with DB/blockchain integration for production.
const users = new Map();

function getUser(username) {
  if (!users.has(username)) {
    users.set(username, {
      // SimpleWebAuthn v13+ requires userID as bytes/Uint8Array, not string.
      id: crypto.randomBytes(32),
      username,
      devices: [],
      currentChallenge: undefined,
    });
  }
  return users.get(username);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, rpID, origin });
});

app.post('/webauthn/register/options', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });

    const user = getUser(username);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: user.username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
      excludeCredentials: user.devices.map((d) => ({
        id: d.credentialID,
        type: 'public-key',
      })),
    });

    user.currentChallenge = options.challenge;
    return res.json(options);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/webauthn/register/verify', async (req, res) => {
  try {
    const { username, response } = req.body;
    if (!username || !response) {
      return res.status(400).json({ error: 'username and response are required' });
    }

    const user = getUser(username);
    const expectedChallenge = user.currentChallenge;

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      user.devices.push({
        credentialID: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
      });

      return res.json({ verified: true, deviceCount: user.devices.length });
    }

    return res.json({ verified: false });
  } catch (err) {
    return res.status(400).json({ verified: false, error: err.message });
  }
});

app.post('/webauthn/auth/options', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });

    const user = getUser(username);
    if (!user.devices.length) {
      return res.status(400).json({ error: 'No registered credential for this user' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      allowCredentials: user.devices.map((d) => ({
        id: d.credentialID,
        type: 'public-key',
      })),
    });

    user.currentChallenge = options.challenge;
    return res.json(options);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/webauthn/auth/verify', async (req, res) => {
  try {
    const { username, response } = req.body;
    if (!username || !response) {
      return res.status(400).json({ error: 'username and response are required' });
    }

    const user = getUser(username);
    const expectedChallenge = user.currentChallenge;

    const authenticator = user.devices.find((d) => d.credentialID === response.id);

    if (!authenticator) {
      return res.status(400).json({ verified: false, error: 'Authenticator not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: authenticator.credentialID,
        publicKey: authenticator.publicKey,
        counter: authenticator.counter,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      authenticator.counter = verification.authenticationInfo.newCounter;
      return res.json({ verified: true, login: 'approved' });
    }

    return res.json({ verified: false, login: 'denied' });
  } catch (err) {
    return res.status(400).json({ verified: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`WebAuthn demo running on http://localhost:${port}`);
  console.log(`RP_ID=${rpID}`);
  console.log(`ORIGIN=${origin}`);
});
