import { useCallback, useRef, useState } from 'react';
import {
  collectionForType, createCmsDraft, createEmptyDrafts, isAllowedDraftField,
  ensureDraftCollections, loadCmsDrafts, saveCmsDrafts, sanitizeDraft, sanitizeDrafts,
} from '../utils/cmsDrafts';

export default function useCmsDrafts(enabled, options = {}) {
  const persist = options.persist !== false;
  const [drafts, setDrafts] = useState(() => (
    options.initialDrafts ? ensureDraftCollections(options.initialDrafts) : loadCmsDrafts(enabled && persist)
  ));
  const [saveStatus, setSaveStatus] = useState('idle');
  const current = useRef(drafts);

  const commit = useCallback((next) => {
    const complete = ensureDraftCollections(next);
    current.current = complete;
    setDrafts(complete);
    if (persist) setSaveStatus(saveCmsDrafts(enabled, complete) ? 'saved' : 'error');
  }, [enabled, persist]);

  const replaceDrafts = useCallback((next, expectedCurrent) => {
    if (!enabled) return false;
    const snapshot = ensureDraftCollections(current.current);
    if (expectedCurrent && JSON.stringify(sanitizeDrafts(snapshot)) !== JSON.stringify(sanitizeDrafts(expectedCurrent))) {
      return false;
    }
    const complete = ensureDraftCollections(next);
    current.current = complete;
    setDrafts(complete);
    if (persist) setSaveStatus(saveCmsDrafts(enabled, complete) ? 'saved' : 'error');
    return true;
  }, [enabled, persist]);

  const addDraft = useCallback((type, zone) => {
    const collection = collectionForType(type);
    if (!enabled || !collection || type === 'about' || zone !== collection) return null;
    const snapshot = ensureDraftCollections(current.current);
    const draft = createCmsDraft(type);
    commit({ ...snapshot, [collection]: [...snapshot[collection], draft] });
    return draft;
  }, [enabled, commit]);

  const updateDraft = useCallback((type, id, key, value) => {
    const collection = collectionForType(type);
    if (!enabled || !collection || !isAllowedDraftField(type, key, value)) return;
    const snapshot = ensureDraftCollections(current.current);
    if (!snapshot[collection].some((entry) => entry.id === id)) return;
    commit({ ...snapshot, [collection]: snapshot[collection].map((entry) => (
      entry.id === id ? { ...entry, [key]: value } : entry
    )) });
  }, [enabled, commit]);

  const beginEdit = useCallback((type, item) => {
    const collection = collectionForType(type);
    if (!enabled || !collection || !item) return null;
    const snapshot = ensureDraftCollections(current.current);
    const existing = snapshot[collection].find((entry) => (
      entry.id === item.id || (item.sourceId && entry.sourceId === item.sourceId)
    ));
    if (existing) return existing;
    if (!item.sourceId) return null;
    const draft = sanitizeDraft(type, { ...item, id: createCmsDraft(type).id });
    if (!draft) return null;
    commit({ ...snapshot, [collection]: [...snapshot[collection], draft] });
    return draft;
  }, [enabled, commit]);

  const deleteDraft = useCallback((type, id) => {
    const collection = collectionForType(type);
    if (!enabled || !collection) return;
    const snapshot = ensureDraftCollections(current.current);
    if (!snapshot[collection].some((entry) => entry.id === id)) return;
    commit({ ...snapshot, [collection]: snapshot[collection].filter((entry) => entry.id !== id) });
  }, [enabled, commit]);

  const clearDrafts = useCallback(() => {
    if (enabled) commit(createEmptyDrafts());
  }, [enabled, commit]);

  return { drafts: ensureDraftCollections(drafts), saveStatus, addDraft, beginEdit, updateDraft, deleteDraft, clearDrafts, replaceDrafts };
}
