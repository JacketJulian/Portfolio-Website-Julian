'use strict';

function loadConfig(env = process.env) {
  const origin = new URL(env.CMS_ORIGIN || 'https://julianmangual.dev');
  if (origin.protocol !== 'https:' || origin.username || origin.password
      || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('CMS_ORIGIN must be an HTTPS origin without a path.');
  }
  let credentials = {};
  if (env.GOOGLE_OAUTH_CLIENT_JSON) {
    const parsed = JSON.parse(env.GOOGLE_OAUTH_CLIENT_JSON);
    credentials = parsed.web || parsed;
  }
  const config = {
    origin: origin.origin,
    clientId: credentials.client_id,
    clientSecret: credentials.client_secret,
    allowedEmail: (env.CMS_ADMIN_EMAIL || '').trim().toLowerCase(),
    sessionKey: env.CMS_SESSION_KEY,
    bucketName: env.CMS_CONTENT_BUCKET,
    secureCookies: true,
  };
  const authFields = [config.clientId, config.clientSecret, config.allowedEmail, config.sessionKey];
  config.authEnabled = authFields.every(Boolean) && Boolean(config.bucketName);
  if (authFields.some(Boolean) && !config.authEnabled) {
    throw new Error('CMS authentication configuration is incomplete.');
  }
  if (config.authEnabled && (config.sessionKey.length < 43
      || !/^[^\s@]+@gmail\.com$/.test(config.allowedEmail))) {
    throw new Error('CMS needs a strong session key and the approved Gmail account.');
  }
  return config;
}

module.exports = { loadConfig };
