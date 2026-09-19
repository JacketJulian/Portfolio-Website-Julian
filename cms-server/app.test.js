'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { createApp } = require('./app');
const { loadConfig } = require('./config');

test('health endpoint avoids Cloud Run reserved paths and returns no private data', async () => {
  const app = createApp({ config: { authEnabled: false }, store: { read: async () => ({}) } });
  await request(app).get('/api/health').expect(200, { ok: true });
});

const ORIGIN = 'https://cms.example.test';
const HOST = 'cms.example.test';
const ADMIN_EMAIL = 'owner@gmail.com';
const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const FIXED_NOW = 1_900_000_000_000;

const emptyContent = () => ({ projects: [], experience: [], education: [], about: [] });

function enabledConfig(overrides = {}) {
  return {
    origin: ORIGIN,
    clientId: CLIENT_ID,
    clientSecret: 'test-client-secret',
    allowedEmail: ADMIN_EMAIL,
    sessionKey: 's'.repeat(64),
    bucketName: 'content-bucket',
    secureCookies: false,
    authEnabled: true,
    ...overrides,
  };
}

function createStore(overrides = {}) {
  const calls = { reads: 0, writes: [] };
  const store = {
    async read() {
      calls.reads += 1;
      return { content: emptyContent(), version: '0' };
    },
    async write(content, version) {
      calls.writes.push({ content, version });
      return { content, version: '1' };
    },
    ...overrides,
  };
  return { store, calls };
}

function createMockOAuth({ payload, tokenError, verifyError } = {}) {
  const calls = { verifier: 0, auth: [], token: [], verify: [] };
  const oauth = {
    async generateCodeVerifierAsync() {
      calls.verifier += 1;
      return { codeVerifier: 'pkce-verifier', codeChallenge: 'pkce-challenge' };
    },
    generateAuthUrl(options) {
      calls.auth.push(options);
      return `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(options.state)}`;
    },
    async getToken(options) {
      calls.token.push(options);
      if (tokenError) throw tokenError;
      return { tokens: { id_token: 'mock-id-token' } };
    },
    async verifyIdToken(options) {
      calls.verify.push(options);
      if (verifyError) throw verifyError;
      return { getPayload: () => payload };
    },
  };
  return { oauth, calls };
}

function validPayload(now = FIXED_NOW, overrides = {}) {
  return {
    email: ADMIN_EMAIL,
    email_verified: true,
    sub: 'google-subject-123',
    aud: CLIENT_ID,
    iss: 'https://accounts.google.com',
    exp: Math.floor(now / 1000) + 3600,
    ...overrides,
  };
}

function createHarness({ payload, oauthOptions, config, storeOptions, now = FIXED_NOW } = {}) {
  const clock = { value: now };
  const storage = createStore(storeOptions);
  const defaultPayload = payload || validPayload(now);
  const mock = createMockOAuth({ payload: defaultPayload, ...oauthOptions });
  const app = createApp({
    config: config || enabledConfig(),
    store: storage.store,
    oauthClient: mock.oauth,
    now: () => clock.value,
  });
  return {
    app,
    agent: request.agent(app),
    clock,
    store: storage.store,
    storeCalls: storage.calls,
    oauth: mock.oauth,
    oauthCalls: mock.calls,
    defaultPayload,
  };
}

async function startLogin(harness) {
  const response = await harness.agent
    .get('/admin/auth/start')
    .set('Host', HOST)
    .expect(302);
  const options = harness.oauthCalls.auth.at(-1);
  assert.ok(options, 'OAuth authorization options should be captured');
  return { response, options };
}

async function completeLogin(harness, payloadOverrides = {}) {
  const { options } = await startLogin(harness);
  const base = harness.defaultPayload;
  const identity = { ...base, nonce: options.nonce, ...payloadOverrides };
  harness.oauth.verifyIdToken = async (verifyOptions) => {
    harness.oauthCalls.verify.push(verifyOptions);
    return { getPayload: () => identity };
  };
  const response = await harness.agent
    .get('/admin/auth/callback')
    .set('Host', HOST)
    .query({ state: options.state, code: 'authorization-code' });
  return { response, options, identity };
}

async function authenticatedHarness(options = {}) {
  const harness = createHarness(options);
  const login = await completeLogin(harness);
  assert.equal(login.response.status, 303);
  const session = await harness.agent.get('/api/admin/session').expect(200);
  return { ...harness, csrfToken: session.body.csrfToken, login };
}

test('valid mocked OAuth login establishes only the approved account session', async () => {
  const harness = createHarness();
  const { response, options, identity } = await completeLogin(harness);

  assert.equal(response.status, 303);
  assert.equal(response.headers.location, '/admin');
  assert.deepEqual(harness.oauthCalls.token, [{
    code: 'authorization-code',
    codeVerifier: 'pkce-verifier',
    redirect_uri: `${ORIGIN}/admin/auth/callback`,
  }]);
  assert.deepEqual(harness.oauthCalls.verify, [{ idToken: 'mock-id-token', audience: CLIENT_ID }]);
  assert.equal(identity.email, ADMIN_EMAIL);
  assert.equal(identity.nonce, options.nonce);

  const session = await harness.agent.get('/api/admin/session').expect(200);
  assert.equal(session.body.email, ADMIN_EMAIL);
  assert.match(session.body.csrfToken, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(session.headers['cache-control'], 'no-store');
});

test('OAuth start requests minimal identity scopes and complete S256 PKCE parameters', async () => {
  const harness = createHarness();
  const { response, options } = await startLogin(harness);

  assert.equal(response.headers.location, `https://accounts.google.com/o/oauth2/v2/auth?state=${options.state}`);
  assert.deepEqual(options.scope, ['openid', 'email']);
  assert.equal(options.access_type, 'online');
  assert.equal(options.prompt, 'select_account');
  assert.equal(options.code_challenge, 'pkce-challenge');
  assert.equal(options.code_challenge_method, 'S256');
  assert.match(options.state, /^[A-Za-z0-9_-]{40,}$/);
  assert.match(options.nonce, /^[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(options.state, options.nonce);
});

test('OAuth callback rejects unauthorized or malformed identity claims', async (t) => {
  const cases = [
    ['wrong email', { email: 'attacker@gmail.com' }],
    ['unverified email', { email_verified: false }],
    ['wrong nonce', { nonce: 'not-the-login-nonce' }],
    ['wrong audience', { aud: 'different-client' }],
    ['wrong issuer', { iss: 'https://evil.example' }],
    ['missing subject', { sub: '' }],
    ['expired token', { exp: Math.floor(FIXED_NOW / 1000) }],
  ];

  for (const [name, overrides] of cases) {
    await t.test(name, async () => {
      const harness = createHarness();
      const { response } = await completeLogin(harness, overrides);
      assert.equal(response.status, 403);
      assert.equal(response.text, 'This Google account does not have access to portfolio administration.');
      await harness.agent.get('/api/admin/session').expect(401);
    });
  }
});

test('OAuth callback rejects missing, mismatched, expired, and provider-error state', async (t) => {
  await t.test('missing login state', async () => {
    const harness = createHarness();
    const response = await harness.agent
      .get('/admin/auth/callback')
      .set('Host', HOST)
      .query({ state: 'missing', code: 'code' })
      .expect(400);
    assert.match(response.text, /Sign-in could not be verified/);
    assert.equal(harness.oauthCalls.token.length, 0);
  });

  await t.test('mismatched state clears the one-time login session', async () => {
    const harness = createHarness();
    const { options } = await startLogin(harness);
    await harness.agent.get('/admin/auth/callback').set('Host', HOST)
      .query({ state: `${options.state}x`, code: 'code' }).expect(400);
    await harness.agent.get('/admin/auth/callback').set('Host', HOST)
      .query({ state: options.state, code: 'code' }).expect(400);
    assert.equal(harness.oauthCalls.token.length, 0);
  });

  await t.test('expired state', async () => {
    const harness = createHarness();
    const { options } = await startLogin(harness);
    harness.clock.value += 10 * 60 * 1000 + 1;
    await harness.agent.get('/admin/auth/callback').set('Host', HOST)
      .query({ state: options.state, code: 'code' }).expect(400);
    assert.equal(harness.oauthCalls.token.length, 0);
  });

  await t.test('provider error parameter', async () => {
    const harness = createHarness();
    const { options } = await startLogin(harness);
    await harness.agent.get('/admin/auth/callback').set('Host', HOST)
      .query({ state: options.state, code: 'code', error: 'access_denied' }).expect(400);
    assert.equal(harness.oauthCalls.token.length, 0);
  });
});

test('OAuth failures never leak provider errors, codes, or tokens', async (t) => {
  for (const [name, oauthOptions] of [
    ['token exchange', { tokenError: new Error('provider leaked authorization-code secret-token') }],
    ['ID token verification', { verifyError: new Error('provider leaked mock-id-token secret-token') }],
  ]) {
    await t.test(name, async () => {
      const harness = createHarness({ oauthOptions });
      const { options } = await startLogin(harness);
      const response = await harness.agent.get('/admin/auth/callback').set('Host', HOST)
        .query({ state: options.state, code: 'authorization-code' })
        .expect(403);
      assert.equal(response.text, 'Google sign-in failed. Start again at /admin.');
      assert.doesNotMatch(response.text, /authorization-code|mock-id-token|secret-token|provider leaked/);
    });
  }
});

test('sign-in cannot derive redirects or callbacks from hostile Host headers', async () => {
  const harness = createHarness();
  const poisoned = await harness.agent
    .get('/admin/auth/start')
    .set('Host', 'attacker.example')
    .set('X-Forwarded-Host', 'attacker.example')
    .expect(302);
  assert.equal(poisoned.headers.location, `${ORIGIN}/admin`);
  assert.equal(harness.oauthCalls.verifier, 0);

  const { options } = await startLogin(harness);
  harness.oauth.verifyIdToken = async (verifyOptions) => {
    harness.oauthCalls.verify.push(verifyOptions);
    return { getPayload: () => ({ ...validPayload(), nonce: options.nonce }) };
  };
  await harness.agent.get('/admin/auth/callback').set('Host', HOST)
    .set('X-Forwarded-Host', 'attacker.example')
    .query({ state: options.state, code: 'authorization-code' })
    .expect(303);
  assert.equal(harness.oauthCalls.token[0].redirect_uri, `${ORIGIN}/admin/auth/callback`);
  assert.doesNotMatch(JSON.stringify(harness.oauthCalls), /attacker\.example/);
});

test('every admin write requires authentication, matching Origin, and CSRF token', async () => {
  const unauthenticated = createHarness();
  await request(unauthenticated.app)
    .put('/api/admin/content')
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', 'anything')
    .send({ content: emptyContent(), version: '0' })
    .expect(401);
  await request(unauthenticated.app)
    .post('/api/admin/logout')
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', 'anything')
    .expect(401);

  const harness = await authenticatedHarness();
  const body = { content: emptyContent(), version: '0' };
  await harness.agent.put('/api/admin/content').send(body).expect(403);
  await harness.agent.put('/api/admin/content').set('Origin', 'https://evil.example')
    .set('X-CSRF-Token', harness.csrfToken).send(body).expect(403);
  await harness.agent.put('/api/admin/content').set('Origin', ORIGIN)
    .set('X-CSRF-Token', 'wrong-token').send(body).expect(403);
  await harness.agent.post('/api/admin/logout').expect(403);

  const written = await harness.agent.put('/api/admin/content').set('Origin', ORIGIN)
    .set('X-CSRF-Token', harness.csrfToken).send(body).expect(200);
  assert.equal(written.body.version, '1');
  assert.deepEqual(harness.storeCalls.writes, [body]);
});

test('invalid JSON, media types, envelopes, and content receive bounded safe errors', async () => {
  const harness = await authenticatedHarness();
  const headers = { Origin: ORIGIN, 'X-CSRF-Token': harness.csrfToken };

  const malformed = await harness.agent.put('/api/admin/content')
    .set(headers).set('Content-Type', 'application/json').send('{"content":').expect(400);
  assert.deepEqual(malformed.body, { error: 'Invalid content. Check the field values and try again.' });

  await harness.agent.put('/api/admin/content').set(headers)
    .set('Content-Type', 'text/plain').send('{}').expect(400);
  await harness.agent.put('/api/admin/content').set(headers)
    .send({ content: emptyContent(), version: '0', unexpected: true }).expect(400);
  await harness.agent.put('/api/admin/content').set(headers)
    .send({ content: { projects: [] }, version: '0' }).expect(400);

  const oversized = JSON.stringify({ content: emptyContent(), version: '0', padding: 'x'.repeat(530000) });
  const tooLarge = await harness.agent.put('/api/admin/content').set(headers)
    .set('Content-Type', 'application/json').send(oversized).expect(413);
  assert.deepEqual(tooLarge.body, { error: 'Content is too large to publish.' });
  assert.equal(harness.storeCalls.writes.length, 0);
});

test('atomic store conflicts surface as the safe 409 API response', async () => {
  const error = new Error('sensitive storage generation details');
  error.status = 409;
  const harness = await authenticatedHarness({
    storeOptions: { write: async () => { throw error; } },
  });
  const response = await harness.agent.put('/api/admin/content')
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', harness.csrfToken)
    .send({ content: emptyContent(), version: '4' })
    .expect(409);
  assert.deepEqual(response.body, {
    error: 'Content changed in another session. Reload before publishing again.',
  });
  assert.doesNotMatch(response.text, /sensitive|generation/);
});

test('logout requires verification, clears the session, and prevents reuse', async () => {
  const harness = await authenticatedHarness();
  const response = await harness.agent.post('/api/admin/logout')
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', harness.csrfToken)
    .expect(204);
  assert.ok((response.headers['set-cookie'] || []).some((cookie) => cookie.startsWith('portfolio-admin-test=')));
  await harness.agent.get('/api/admin/session').expect(401);
  await harness.agent.put('/api/admin/content').set('Origin', ORIGIN)
    .set('X-CSRF-Token', harness.csrfToken)
    .send({ content: emptyContent(), version: '0' }).expect(401);
});

test('server-side session expiry is enforced independently of cookie presence', async () => {
  const harness = createHarness();
  const { response, identity } = await completeLogin(harness, {
    exp: Math.floor(FIXED_NOW / 1000) + 30,
  });
  assert.equal(response.status, 303);
  harness.clock.value = identity.exp * 1000 - 1;
  await harness.agent.get('/api/admin/session').expect(200);
  harness.clock.value = identity.exp * 1000;
  await harness.agent.get('/api/admin/session').expect(401);
});

test('secure production cookies use the __Host prefix and hardened flags behind HTTPS proxy', async () => {
  const harness = createHarness({ config: enabledConfig({ secureCookies: true }) });
  const response = await harness.agent.get('/admin/auth/start')
    .set('Host', HOST)
    .set('X-Forwarded-Proto', 'https')
    .expect(302);
  const cookies = response.headers['set-cookie'] || [];
  assert.ok(cookies.length > 0);
  const combined = cookies.join('; ');
  assert.match(combined, /__Host-portfolio-admin=/);
  assert.match(combined, /Path=\//i);
  assert.match(combined, /HttpOnly/i);
  assert.match(combined, /Secure/i);
  assert.match(combined, /SameSite=Lax/i);
  assert.doesNotMatch(combined, /Domain=/i);
});

test('disabled auth leaves public content readable but closes all admin routes', async () => {
  const { store, calls } = createStore();
  const config = { ...enabledConfig(), authEnabled: false };
  const app = createApp({ config, store });

  const publicResponse = await request(app).get('/api/content').expect(200);
  assert.deepEqual(publicResponse.body, { content: emptyContent(), version: '0' });
  assert.equal(calls.reads, 1);
  await request(app).get('/admin').expect(503);
  await request(app).get('/admin/auth/start').expect(503);
  await request(app).get('/api/admin/session').expect(503);
  await request(app).put('/api/admin/content').send({ content: emptyContent(), version: '0' }).expect(503);
});

test('public content remains readable without authentication when admin auth is enabled', async () => {
  const harness = createHarness();
  const response = await request(harness.app).get('/api/content').expect(200);
  assert.deepEqual(response.body, { content: emptyContent(), version: '0' });
  assert.equal(harness.storeCalls.reads, 1);
  await request(harness.app).get('/api/admin/session').expect(401);
});

test('configuration is disabled when absent and rejects incomplete or unsafe auth settings', () => {
  const disabled = loadConfig({});
  assert.equal(disabled.authEnabled, false);
  assert.equal(disabled.origin, 'https://julianmangual.dev');
  assert.equal(disabled.secureCookies, true);

  assert.throws(() => loadConfig({ CMS_ADMIN_EMAIL: ADMIN_EMAIL }), /configuration is incomplete/);
  assert.throws(() => loadConfig({
    CMS_ORIGIN: ORIGIN,
    GOOGLE_OAUTH_CLIENT_JSON: JSON.stringify({ web: { client_id: CLIENT_ID, client_secret: 'secret' } }),
    CMS_ADMIN_EMAIL: ADMIN_EMAIL,
    CMS_SESSION_KEY: 'short',
    CMS_CONTENT_BUCKET: 'bucket',
  }), /strong session key/);
  assert.throws(() => loadConfig({ CMS_ORIGIN: 'http://cms.example.test' }), /HTTPS origin/);
  assert.throws(() => loadConfig({ CMS_ORIGIN: 'https://cms.example.test/path' }), /HTTPS origin/);
  assert.throws(() => loadConfig({ GOOGLE_OAUTH_CLIENT_JSON: '{invalid' }), SyntaxError);
});
