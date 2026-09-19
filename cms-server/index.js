'use strict';

const { Storage } = require('@google-cloud/storage');
const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { createContentStore } = require('./content');

const config = loadConfig();
const store = config.bucketName
  ? createContentStore({ bucketName: config.bucketName, storage: new Storage() })
  : { read: async () => ({ content: { projects: [], experience: [], education: [], about: [] }, version: '0' }) };
const server = createApp({ config, store }).listen(Number(process.env.PORT || 8080), '0.0.0.0', () => {
  console.log(`Portfolio server ready; admin ${config.authEnabled ? 'configured' : 'disabled'}.`);
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
