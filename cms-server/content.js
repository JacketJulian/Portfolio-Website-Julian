'use strict';

const OBJECT_NAME = 'portfolio/content.json';
const MAX_CONTENT_BYTES = 512 * 1024;
const MAX_RECORDS = 200;
const MAX_ID_LENGTH = 160;
const MAX_TEXT_LENGTH = 2000;
const MAX_DESCRIPTION_LENGTH = 16000;
const MAX_URL_LENGTH = 2048;
const MAX_TECH_STACK_ITEMS = 100;
const MAX_TECH_STACK_ITEM_LENGTH = 200;

const TYPES = {
  projects: {
    type: 'project',
    fields: ['title', 'description', 'image', 'demoLink', 'videoUrl', 'liveDemoText', 'githubLink', 'githubText'],
  },
  experience: {
    type: 'experience',
    fields: ['companyName', 'jobTitle', 'date', 'location', 'logo', 'techStack'],
  },
  education: {
    type: 'education',
    fields: ['institutionName', 'degree', 'date', 'location', 'logo'],
  },
  about: {
    type: 'about',
    fields: ['name', 'description', 'image', 'mobileImage', 'imageAlt', 'resumeLink', 'downloadText'],
  },
};

const COLLECTIONS = Object.keys(TYPES);
const URL_FIELDS = new Set(['image', 'mobileImage', 'resumeLink', 'demoLink', 'videoUrl', 'githubLink', 'logo']);
const MEDIA_FIELDS = new Set(['image', 'mobileImage', 'videoUrl', 'logo']);
const ABOUT_SOURCES = new Set(['source-about-apple-0', 'source-about-target-0']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  error.publicMessage = message;
  return error;
}

function conflict() {
  const error = new Error('Content version conflict');
  error.status = 409;
  return error;
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, label) {
  if (!isPlainObject(value)) throw badRequest(`${label} must be a plain object`);
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw badRequest(`${label} contains a forbidden field`);
  }
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw badRequest(`${label} contains an unknown field`);
  }
}

function validateString(value, label, maximum) {
  if (typeof value !== 'string') throw badRequest(`${label} must be a string`);
  if (value.length > maximum) throw badRequest(`${label} is too long`);
  return value;
}

function hasControlCharacter(value) {
  return [...value].some((character) => {
    const code = character.codePointAt(0);
    return code <= 31 || code === 127;
  });
}

function validateUrl(value, label) {
  validateString(value, label, MAX_URL_LENGTH);
  if (value === '') return value;
  if (value !== value.trim() || hasControlCharacter(value) || value.includes('\\')) {
    throw badRequest(`${label} must be an empty, HTTP(S), or root-relative URL`);
  }
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const parsed = new URL(value);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && value === value.trim()) return value;
  } catch (error) {
    // The common safe error below deliberately does not expose parser details.
  }
  throw badRequest(`${label} must be an empty, HTTP(S), or root-relative URL`);
}

function validateId(value, type, label) {
  validateString(value, label, MAX_ID_LENGTH);
  const pattern = new RegExp(`^cms-${type}-[A-Za-z0-9-]+$`);
  if (!pattern.test(value)) throw badRequest(`${label} is invalid`);
  return value;
}

function validateSourceId(value, type, label) {
  validateString(value, label, MAX_ID_LENGTH);
  const pattern = new RegExp(`^source-${type}-[a-z0-9]+-[0-9]+$`);
  if (!pattern.test(value)) throw badRequest(`${label} is invalid`);
  return value;
}

function validateRecord(record, collection, index) {
  const definition = TYPES[collection];
  const label = `${collection}[${index}]`;
  assertPlainObject(record, label);
  assertOnlyKeys(record, new Set(['id', 'sourceId', ...definition.fields]), label);

  const clean = { id: validateId(record.id, definition.type, `${label}.id`) };
  if (record.sourceId !== undefined) {
    clean.sourceId = validateSourceId(record.sourceId, definition.type, `${label}.sourceId`);
  }

  if (definition.type === 'about') {
    if (!ABOUT_SOURCES.has(clean.sourceId)) {
      throw badRequest(`${label}.sourceId must identify an allowed About source`);
    }
  }

  for (const field of definition.fields) {
    const value = record[field];
    if (field === 'techStack') {
      if (value === undefined) {
        clean[field] = [];
      } else {
        if (!Array.isArray(value)) throw badRequest(`${label}.${field} must be an array`);
        if (value.length > MAX_TECH_STACK_ITEMS) throw badRequest(`${label}.${field} has too many items`);
        clean[field] = value.map((item, itemIndex) => validateString(
          item,
          `${label}.${field}[${itemIndex}]`,
          MAX_TECH_STACK_ITEM_LENGTH,
        ));
      }
    } else if (value === undefined) {
      clean[field] = '';
    } else if (URL_FIELDS.has(field)) {
      clean[field] = validateUrl(value, `${label}.${field}`);
      if (MEDIA_FIELDS.has(field) && /^http:/i.test(clean[field])) {
        throw badRequest(`${label}.${field} must use HTTPS for production media`);
      }
    } else {
      clean[field] = validateString(
        value,
        `${label}.${field}`,
        field === 'description' ? MAX_DESCRIPTION_LENGTH : MAX_TEXT_LENGTH,
      );
    }
  }
  return clean;
}

function validateContent(input) {
  assertPlainObject(input, 'content');
  assertOnlyKeys(input, new Set(COLLECTIONS), 'content');

  const clean = {};
  const ids = new Set();
  const sources = new Set();
  for (const collection of COLLECTIONS) {
    const records = input[collection];
    if (!Array.isArray(records)) throw badRequest(`content.${collection} must be an array`);
    if (records.length > MAX_RECORDS) throw badRequest(`content.${collection} has too many records`);
    if (collection === 'about' && records.length > 2) throw badRequest('content.about has too many records');

    clean[collection] = records.map((record, index) => {
      const result = validateRecord(record, collection, index);
      if (ids.has(result.id)) throw badRequest('Content record IDs must be unique');
      ids.add(result.id);
      if (result.sourceId) {
        if (sources.has(result.sourceId)) throw badRequest('Content source IDs must be unique');
        sources.add(result.sourceId);
      }
      return result;
    });
  }

  if (Buffer.byteLength(JSON.stringify(clean), 'utf8') > MAX_CONTENT_BYTES) {
    throw badRequest('Content exceeds the 512 KiB limit');
  }
  return clean;
}

function validateVersion(version) {
  if (typeof version !== 'string' || !/^(0|[1-9][0-9]*)$/.test(version)) {
    throw badRequest('Content version is invalid');
  }
  const numericVersion = Number(version);
  if (!Number.isSafeInteger(numericVersion)) throw badRequest('Content version is invalid');
  return numericVersion;
}

function isNotFound(error) {
  return error && [error.code, error.status, error.statusCode, error.response && error.response.status]
    .some((status) => String(status) === '404');
}

function isPreconditionFailure(error) {
  return error && [error.code, error.status, error.statusCode, error.response && error.response.status]
    .some((status) => String(status) === '412');
}

function generationFromSave(result, file) {
  const candidates = [
    result,
    Array.isArray(result) ? result[0] : undefined,
    Array.isArray(result) ? result[1] : undefined,
    file,
  ];
  for (const candidate of candidates) {
    const generation = candidate && (
      candidate.generation
      || (candidate.metadata && candidate.metadata.generation)
      || (candidate.data && candidate.data.generation)
    );
    if (generation !== undefined && generation !== null) return String(generation);
  }
  return null;
}

function createContentStore({ bucketName, storage } = {}) {
  if (typeof bucketName !== 'string' || bucketName.length === 0) {
    throw new TypeError('bucketName is required');
  }
  let storageClient = storage;
  if (!storageClient) {
    // Keep the dependency injectable so unit tests do not need credentials.
    const { Storage } = require('@google-cloud/storage');
    storageClient = new Storage();
  }
  if (!storageClient || typeof storageClient.bucket !== 'function') {
    throw new TypeError('storage must provide bucket()');
  }

  const bucket = storageClient.bucket(bucketName);

  async function read() {
    const file = bucket.file(OBJECT_NAME);
    let metadata;
    try {
      [metadata] = await file.getMetadata();
    } catch (error) {
      if (isNotFound(error)) {
        return { content: { projects: [], experience: [], education: [], about: [] }, version: '0' };
      }
      throw error;
    }

    const generation = metadata && metadata.generation;
    if (generation === undefined || generation === null) {
      throw new Error('Stored content metadata is missing a generation');
    }

    let data;
    try {
      const generationFile = bucket.file(OBJECT_NAME, { generation: String(generation) });
      [data] = await generationFile.download();
    } catch (error) {
      throw error;
    }

    try {
      const parsed = JSON.parse(Buffer.isBuffer(data) ? data.toString('utf8') : String(data));
      return { content: validateContent(parsed), version: String(generation) };
    } catch (error) {
      if (error && error.status === 400) throw badRequest('Stored content is malformed');
      if (error instanceof SyntaxError) throw badRequest('Stored content is malformed');
      throw error;
    }
  }

  async function write(content, version) {
    const clean = validateContent(content);
    const numericVersion = validateVersion(version);
    const file = bucket.file(OBJECT_NAME);
    let result;
    try {
      result = await file.save(JSON.stringify(clean), {
        contentType: 'application/json',
        metadata: {
          cacheControl: 'no-store',
          contentType: 'application/json',
        },
        preconditionOpts: { ifGenerationMatch: numericVersion },
        resumable: false,
      });
    } catch (error) {
      if (isPreconditionFailure(error)) throw conflict();
      throw error;
    }

    const generation = generationFromSave(result, file);
    if (generation === null) {
      throw new Error('Storage upload did not return a generation');
    }
    return { content: clean, version: generation };
  }

  return { read, write };
}

module.exports = { createContentStore, validateContent };
