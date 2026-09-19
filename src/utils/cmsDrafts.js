export const CMS_TYPES = ['project', 'experience', 'education', 'about'];
export const CMS_DRAFT_STORAGE_KEY = 'julian-portfolio-cms-drafts-v2';

const fields = {
  project: ['title', 'description', 'image', 'demoLink', 'videoUrl', 'liveDemoText', 'githubLink', 'githubText'],
  experience: ['companyName', 'jobTitle', 'date', 'location', 'logo', 'techStack'],
  education: ['institutionName', 'degree', 'date', 'location', 'logo'],
  about: ['name', 'description', 'image', 'mobileImage', 'imageAlt', 'resumeLink', 'downloadText'],
};
const urlFields = new Set(['image', 'mobileImage', 'resumeLink', 'demoLink', 'videoUrl', 'githubLink', 'logo']);
let sequence = 0;

export const collectionForType = (type) => (
  CMS_TYPES.includes(type) ? (type === 'project' ? 'projects' : type) : null
);

export const createEmptyDrafts = () => ({ projects: [], experience: [], education: [], about: [] });

// Fast Refresh retains pre-upgrade React state/refs, bypassing the storage loader.
// Fill missing collections without sanitizing away in-progress editor text.
export const ensureDraftCollections = (input) => {
  const collections = createEmptyDrafts();
  const keys = Object.keys(collections);
  if (input && keys.every((key) => Array.isArray(input[key]))) return input;
  keys.forEach((key) => {
    if (Array.isArray(input?.[key])) collections[key] = input[key];
  });
  return collections;
};

const isSourceId = (type, value) => typeof value === 'string'
  && new RegExp(`^source-${type}-[a-z0-9]+-[0-9]+$`).test(value);

// Identify source entries independently of their position in either theme's list.
export const getCmsSourceId = (type, item, occurrence = 0) => {
  const identityFields = {
    project: ['title', 'demoLink'],
    experience: ['companyName', 'jobTitle', 'date'],
    education: ['institutionName', 'degree', 'date'],
  };
  if (!identityFields[type] || !item) return null;
  const identity = JSON.stringify(item.id || identityFields[type].map((key) => item[key] || ''));
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash = Math.imul(hash ^ identity.charCodeAt(index), 16777619);
  }
  return `source-${type}-${(hash >>> 0).toString(36)}-${occurrence}`;
};

export const mergeCmsItems = (type, originals, drafts = []) => {
  const overrides = new Map(drafts.filter((item) => item.sourceId).map((item) => [item.sourceId, item]));
  const occurrences = new Map();
  const sourceItems = originals.map((original) => {
    if (!original) return original;
    const identity = getCmsSourceId(type, original);
    const occurrence = occurrences.get(identity) || 0;
    occurrences.set(identity, occurrence + 1);
    const sourceId = getCmsSourceId(type, original, occurrence);
    return { ...original, ...overrides.get(sourceId), sourceId, _cmsOriginal: original };
  });
  return [...drafts.filter((item) => !item.sourceId)].reverse().concat(sourceItems);
};

export const isLocalHost = (hostname) => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(
  typeof hostname === 'string' ? hostname.toLowerCase() : '',
);

export const safeUrl = (value) => {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url || [...url].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  })) return '';
  // Allow site-root assets and web URLs, never protocol-relative or executable schemes.
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) return url;
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) ? url : '';
  } catch (error) {
    return '';
  }
};

export const createCmsDraft = (type) => {
  if (!collectionForType(type)) return null;
  sequence += 1;
  const id = `cms-${type}-${Date.now()}-${sequence}-${Math.random().toString(36).slice(2, 9)}`;
  if (type === 'project') return { id, title: 'New project', description: '', image: '', demoLink: '', videoUrl: '', liveDemoText: 'View project' };
  if (type === 'experience') return { id, companyName: 'New company', jobTitle: 'New role', date: '', location: '', logo: '', techStack: [] };
  if (type === 'about') return { id, name: '', description: '', image: '', mobileImage: '', imageAlt: '', resumeLink: '', downloadText: '' };
  return { id, institutionName: 'New institution', degree: '', date: '', location: '', logo: '' };
};

export const isAllowedDraftField = (type, key, value) => {
  if (!fields[type] || !fields[type].includes(key)) return false;
  return key === 'techStack'
    ? Array.isArray(value) && value.every((item) => typeof item === 'string')
    : typeof value === 'string';
};

export const sanitizeDraft = (type, draft) => {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)
    || typeof draft.id !== 'string' || !/^cms-(project|experience|education|about)-[a-zA-Z0-9-]+$/.test(draft.id)
    || !draft.id.startsWith(`cms-${type}-`)) return null;
  // About is an existing singleton per theme, never an appendable collection.
  if (type === 'about' && !['source-about-apple-0', 'source-about-target-0'].includes(draft.sourceId)) return null;
  const clean = { id: draft.id };
  if (draft.sourceId !== undefined) {
    if (!isSourceId(type, draft.sourceId)) return null;
    clean.sourceId = draft.sourceId;
  }
  fields[type].forEach((key) => {
    const value = draft[key];
    if (key === 'techStack') {
      clean[key] = Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
    } else {
      clean[key] = typeof value === 'string' ? (urlFields.has(key) ? safeUrl(value) : value) : '';
    }
  });
  return clean;
};

export const sanitizeDrafts = (input) => {
  const result = createEmptyDrafts();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  const ids = new Set();
  const sources = new Set();
  CMS_TYPES.forEach((type) => {
    const collection = collectionForType(type);
    if (!Array.isArray(input[collection])) return;
    input[collection].forEach((entry) => {
      const clean = sanitizeDraft(type, entry);
      if (clean && !ids.has(clean.id) && (!clean.sourceId || !sources.has(clean.sourceId))) {
        ids.add(clean.id);
        if (clean.sourceId) sources.add(clean.sourceId);
        result[collection].push(clean);
      }
    });
  });
  return result;
};

export const loadCmsDrafts = (enabled, storage) => {
  if (!enabled) return createEmptyDrafts();
  try {
    const saved = (storage || window.localStorage).getItem(CMS_DRAFT_STORAGE_KEY);
    return saved ? sanitizeDrafts(JSON.parse(saved)) : createEmptyDrafts();
  } catch (error) {
    return createEmptyDrafts();
  }
};

export const saveCmsDrafts = (enabled, drafts, storage) => {
  if (!enabled) return false;
  try {
    (storage || window.localStorage).setItem(CMS_DRAFT_STORAGE_KEY, JSON.stringify(sanitizeDrafts(drafts)));
    return true;
  } catch (error) {
    return false;
  }
};
