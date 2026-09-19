import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CMS_TYPES, collectionForType, createEmptyDrafts, sanitizeDraft, sanitizeDrafts,
} from '../utils/cmsDrafts';

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

// Treat server content as one atomic document. Missing optional record fields may
// receive their normal defaults, but existing values must survive sanitization exactly.
const normalizeContentPayload = (value) => {
  if (!isPlainObject(value) || !sameValue(Object.keys(value).sort(), ['content', 'version'])
    || typeof value.version !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value.version)
    || !isPlainObject(value.content)) return null;
  const collections = createEmptyDrafts();
  const expectedCollections = Object.keys(collections).sort();
  if (!sameValue(Object.keys(value.content).sort(), expectedCollections)) return null;

  const ids = new Set();
  const sources = new Set();
  for (const type of CMS_TYPES) {
    const collection = collectionForType(type);
    if (!Array.isArray(value.content[collection])) return null;
    for (const record of value.content[collection]) {
      if (!isPlainObject(record)) return null;
      const clean = sanitizeDraft(type, record);
      if (!clean || Object.keys(record).some((key) => !Object.prototype.hasOwnProperty.call(clean, key) || !sameValue(clean[key], record[key]))
        || ids.has(clean.id) || (clean.sourceId && sources.has(clean.sourceId))) return null;
      ids.add(clean.id);
      if (clean.sourceId) sources.add(clean.sourceId);
      collections[collection].push(clean);
    }
  }
  return { content: collections, version: value.version };
};

const sessionPayload = (value) => value && typeof value.email === 'string'
  && typeof value.csrfToken === 'string' && value.csrfToken.length > 0;

async function requestJson(url, options = {}) {
  const { headers = {}, ...requestOptions } = options;
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...requestOptions,
    headers: { Accept: 'application/json', ...headers },
  });
  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }
  if (!response.ok) {
    const requestError = new Error(body?.error || `Request failed (${response.status})`);
    requestError.status = response.status;
    requestError.body = body;
    throw requestError;
  }
  return body;
}

export default function usePortfolioCms({ enabled, isAdmin }) {
  const [publishedContent, setPublishedContent] = useState(createEmptyDrafts);
  const [version, setVersion] = useState('');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [loadError, setLoadError] = useState(null);
  const [publishStatus, setPublishStatus] = useState('idle');
  const [publishError, setPublishError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const publishing = useRef(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);

    const contentRequest = requestJson('/api/content');
    if (!isAdmin) {
      contentRequest.then((payload) => {
        const normalized = normalizeContentPayload(payload);
        if (!normalized) throw new Error('Invalid content response');
        if (!active) return;
        setPublishedContent(normalized.content);
        setVersion(normalized.version);
      }).catch((error) => {
        if (active) setLoadError(error);
      }).finally(() => {
        if (active) setLoading(false);
      });
      return () => { active = false; };
    }

    const sessionRequest = requestJson('/api/admin/session');
    Promise.allSettled([sessionRequest, contentRequest]).then(([sessionResult, contentResult]) => {
      if (!active) return;
      const normalized = contentResult.status === 'fulfilled'
        ? normalizeContentPayload(contentResult.value) : null;
      if (normalized) {
        setPublishedContent(normalized.content);
        setVersion(normalized.version);
      }
      if (sessionResult.status === 'fulfilled' && sessionPayload(sessionResult.value)
        && normalized) {
        setSession(sessionResult.value);
      } else {
        setSession(null);
        const error = sessionResult.status === 'rejected'
          ? sessionResult.reason
          : contentResult.status === 'rejected' ? contentResult.reason : new Error('Invalid CMS response');
        setLoadError(error);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [enabled, isAdmin]);

  const publish = useCallback(async (drafts) => {
    if (!session || publishing.current) return null;
    publishing.current = true;
    setPublishStatus('publishing');
    setPublishError('');
    const submittedContent = sanitizeDrafts(drafts);
    try {
      const payload = await requestJson('/api/admin/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ content: submittedContent, version }),
      });
      const normalized = normalizeContentPayload(payload);
      if (!normalized) throw new Error('Invalid publish response');
      setPublishedContent(normalized.content);
      setVersion(normalized.version);
      setPublishStatus('published');
      return { content: normalized.content, version: normalized.version, submittedContent };
    } catch (error) {
      if (error.status === 409) setPublishStatus('conflict');
      else if (error.status === 401) setPublishStatus('expired');
      else setPublishStatus('error');
      setPublishError(error.message);
      return null;
    } finally {
      publishing.current = false;
    }
  }, [session, version]);

  const logout = useCallback(async () => {
    if (!session || loggingOut.current) return false;
    loggingOut.current = true;
    setLogoutError('');
    try {
      await requestJson('/api/admin/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': session.csrfToken },
      });
      window.location.assign('/');
      return true;
    } catch (error) {
      setLogoutError(error.message || 'Log out failed. Please try again.');
      return false;
    } finally {
      loggingOut.current = false;
    }
  }, [session]);

  return {
    publishedContent,
    version,
    session,
    loading,
    loadError,
    editorEnabled: Boolean(enabled && isAdmin && session && !loading),
    publishStatus,
    publishError,
    logoutError,
    publish,
    logout,
  };
}
