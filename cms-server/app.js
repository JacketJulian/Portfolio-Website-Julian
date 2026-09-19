'use strict';

const express = require('express');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const path = require('node:path');
const { validateContent } = require('./content');

const SESSION_MS = 60 * 60 * 1000;
const LOGIN_MS = 10 * 60 * 1000;
const randomToken = () => randomBytes(32).toString('base64url');
const sameToken = (left, right) => typeof left === 'string' && typeof right === 'string'
  && left.length > 0 && Buffer.byteLength(left) === Buffer.byteLength(right)
  && timingSafeEqual(Buffer.from(left), Buffer.from(right));

function createApp({ config, store, oauthClient, buildDir = path.resolve(__dirname, '../build'), now = Date.now }) {
  const app = express();
  app.disable('x-powered-by');
  // Cloud Run terminates HTTPS at its front proxy. No client IP is used for authorization.
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
      mediaSrc: ["'self'", 'https:', 'blob:'], connectSrc: ["'self'"],
      frameSrc: ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
      objectSrc: ["'none'"], baseUri: ["'none'"], formAction: ["'self'"],
      frameAncestors: ["'none'"],
    } },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
  }));
  app.use(['/admin', '/api'], (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  // Cloud Run reserves some paths ending in "z", including /healthz.
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/content', async (req, res) => res.json(await store.read()));

  const authUnavailable = (req, res) => res.status(503).send('Portfolio admin is not configured yet.');
  if (!config.authEnabled) {
    app.use('/admin', authUnavailable);
    app.use('/api/admin', (req, res) => res.status(503).json({ error: 'Portfolio admin is not configured yet.' }));
  } else {
    const oauth = oauthClient || new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: `${config.origin}/admin/auth/callback`,
    });
    const sessionMiddleware = cookieSession({
      name: config.secureCookies ? '__Host-portfolio-admin' : 'portfolio-admin-test',
      keys: [config.sessionKey], maxAge: SESSION_MS,
      secure: config.secureCookies, httpOnly: true, sameSite: 'lax', path: '/',
    });
    app.use(['/admin', '/api/admin'], sessionMiddleware);
    const isAuthorized = (req) => req.session?.user?.email === config.allowedEmail
      && typeof req.session.user.sub === 'string' && req.session.user.sub.length > 0
      && Number.isFinite(req.session.expiresAt) && req.session.expiresAt > now();
    const requireAuth = (req, res, next) => {
      if (!isAuthorized(req)) {
        req.session = null;
        return res.status(401).json({ error: 'Your session expired. Sign in again at /admin.' });
      }
      next();
    };
    const requireCsrf = (req, res, next) => {
      if (req.get('Origin') !== config.origin || !sameToken(req.get('X-CSRF-Token'), req.session.csrfToken)) {
        return res.status(403).json({ error: 'Request verification failed.' });
      }
      next();
    };
    // Never derive OAuth callbacks from caller-controlled Host/forwarded headers.
    app.use('/admin', (req, res, next) => {
      if (req.get('Host') !== new URL(config.origin).host) return res.redirect(302, `${config.origin}/admin`);
      next();
    });
    const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30,
      standardHeaders: 'draft-8', legacyHeaders: false,
      message: 'Too many sign-in attempts. Please try again later.' });
    const startLogin = async (req, res) => {
      const { codeVerifier, codeChallenge } = await oauth.generateCodeVerifierAsync();
      const state = randomToken();
      const nonce = randomToken();
      // Only temporary login state/identity is cookie-stored; never Google access/refresh tokens.
      req.session = { login: { state, nonce, codeVerifier, expiresAt: now() + LOGIN_MS } };
      res.redirect(302, oauth.generateAuthUrl({
        access_type: 'online', scope: ['openid', 'email'], prompt: 'select_account',
        state, nonce, code_challenge: codeChallenge, code_challenge_method: 'S256',
      }));
    };
    app.get('/admin/auth/start', loginLimiter, startLogin);
    app.get('/admin/auth/callback', loginLimiter, async (req, res) => {
      const login = req.session?.login;
      req.session = null;
      if (!login || login.expiresAt <= now() || !sameToken(req.query.state, login.state)
          || typeof req.query.code !== 'string' || !req.query.code || req.query.error) {
        return res.status(400).send('Sign-in could not be verified. Start again at /admin.');
      }
      try {
        const { tokens } = await oauth.getToken({ code: req.query.code, codeVerifier: login.codeVerifier,
          redirect_uri: `${config.origin}/admin/auth/callback` });
        const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
        const identity = ticket.getPayload();
        if (!identity || identity.email_verified !== true || identity.email?.toLowerCase() !== config.allowedEmail
            || typeof identity.sub !== 'string' || !identity.sub || !sameToken(identity.nonce, login.nonce)
            || identity.aud !== config.clientId
            || !['https://accounts.google.com', 'accounts.google.com'].includes(identity.iss)
            || !Number.isFinite(identity.exp) || identity.exp * 1000 <= now()) {
          return res.status(403).send('This Google account does not have access to portfolio administration.');
        }
        req.session = { user: { sub: identity.sub, email: config.allowedEmail },
          csrfToken: randomToken(), expiresAt: Math.min(now() + SESSION_MS, identity.exp * 1000) };
        return res.redirect(303, '/admin');
      } catch {
        // OAuth errors can contain tokens/codes. Never log or return them.
        return res.status(403).send('Google sign-in failed. Start again at /admin.');
      }
    });
    app.use('/api/admin', requireAuth);
    app.get('/api/admin/session', (req, res) => res.json({ email: req.session.user.email, csrfToken: req.session.csrfToken }));
    app.post('/api/admin/logout', requireCsrf, (req, res) => {
      req.session = null;
      res.sendStatus(204);
    });
    app.put('/api/admin/content', requireCsrf, express.json({ limit: '512kb', strict: true }), async (req, res) => {
      if (!req.is('application/json') || !req.body || Object.keys(req.body).some((key) => !['content', 'version'].includes(key))) {
        return res.status(400).json({ error: 'Send JSON content and its current version.' });
      }
      const content = validateContent(req.body.content);
      const result = await store.write(content, req.body.version);
      res.json(result);
    });
    app.get(['/admin', '/admin/'], loginLimiter, async (req, res) => {
      if (!isAuthorized(req)) return startLogin(req, res);
      return res.sendFile(path.join(buildDir, 'index.html'));
    });
    app.use('/admin', (req, res) => res.sendStatus(404));
  }
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(express.static(buildDir, { index: false, dotfiles: 'deny', setHeaders: (res, filePath) => {
    res.set('Cache-Control', /\/static\//.test(filePath) ? 'public, max-age=31536000, immutable' : 'no-cache');
  } }));
  app.get('/{*path}', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(buildDir, 'index.html'));
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = [400, 409, 413].includes(error.status) ? error.status : 500;
    const messages = { 400: 'Invalid content. Check the field values and try again.',
      409: 'Content changed in another session. Reload before publishing again.',
      413: 'Content is too large to publish.', 500: 'The request could not be completed. Please try again.' };
    res.status(status).json({ error: status === 400 && error.publicMessage ? error.publicMessage : messages[status] });
  });
  return app;
}

module.exports = { createApp };
