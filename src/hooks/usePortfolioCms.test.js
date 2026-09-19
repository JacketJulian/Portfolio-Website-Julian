import { act, renderHook, waitFor } from '@testing-library/react';
import usePortfolioCms from './usePortfolioCms';
import { createCmsDraft, createEmptyDrafts, sanitizeDrafts } from '../utils/cmsDrafts';

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});

const content = (title = 'Published project') => {
  const value = createEmptyDrafts();
  value.projects = [{ ...createCmsDraft('project'), title }];
  return value;
};

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

test('public mode loads published content without checking the admin session', async () => {
  const published = content();
  global.fetch = jest.fn().mockResolvedValue(response(200, { content: published, version: '1' }));
  const { result } = renderHook(() => usePortfolioCms({ enabled: true, isAdmin: false }));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith('/api/content', expect.any(Object));
  expect(result.current.publishedContent.projects[0].title).toBe('Published project');
  expect(result.current.editorEnabled).toBe(false);
});

test('admin mode fails closed when the session check fails while retaining public content', async () => {
  const published = content();
  global.fetch = jest.fn((url) => Promise.resolve(url === '/api/admin/session'
    ? response(401, { error: 'Unauthorized' })
    : response(200, { content: published, version: '1' })));
  const { result } = renderHook(() => usePortfolioCms({ enabled: true, isAdmin: true }));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.editorEnabled).toBe(false);
  expect(result.current.loadError).toMatchObject({ status: 401 });
  expect(result.current.publishedContent.projects[0].title).toBe('Published project');
  expect(global.fetch).not.toHaveBeenCalledWith('/api/admin/content', expect.any(Object));
});

test('admin mode enables only after session and content load, then publishes explicitly with CSRF and version', async () => {
  const published = content();
  const edited = content('Edited project');
  global.fetch = jest.fn((url) => {
    if (url === '/api/admin/session') return Promise.resolve(response(200, { email: 'owner@example.com', csrfToken: 'csrf-token' }));
    if (url === '/api/content') return Promise.resolve(response(200, { content: published, version: '1' }));
    return Promise.resolve(response(200, { content: edited, version: '2' }));
  });
  const { result } = renderHook(() => usePortfolioCms({ enabled: true, isAdmin: true }));
  await waitFor(() => expect(result.current.editorEnabled).toBe(true));
  expect(global.fetch).toHaveBeenCalledTimes(2);

  let saved;
  await act(async () => { saved = await result.current.publish(edited); });

  const [, request] = global.fetch.mock.calls.find(([url]) => url === '/api/admin/content');
  expect(request).toMatchObject({
    method: 'PUT',
    headers: expect.objectContaining({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-token' }),
  });
  expect(JSON.parse(request.body)).toEqual({ content: sanitizeDrafts(edited), version: '1' });
  expect(saved).toMatchObject({ version: '2' });
  expect(result.current.publishedContent.projects[0].title).toBe('Edited project');
  expect(result.current.publishStatus).toBe('published');
});

test('a publish conflict keeps the last published baseline and reports the conflict', async () => {
  const published = content();
  const edited = content('Unpublished edit');
  global.fetch = jest.fn((url) => {
    if (url === '/api/admin/session') return Promise.resolve(response(200, { email: 'owner@example.com', csrfToken: 'csrf-token' }));
    if (url === '/api/content') return Promise.resolve(response(200, { content: published, version: '1' }));
    return Promise.resolve(response(409, { error: 'Version conflict' }));
  });
  const { result } = renderHook(() => usePortfolioCms({ enabled: true, isAdmin: true }));
  await waitFor(() => expect(result.current.editorEnabled).toBe(true));

  await act(async () => { expect(await result.current.publish(edited)).toBeNull(); });

  expect(result.current.publishStatus).toBe('conflict');
  expect(result.current.publishError).toBe('Version conflict');
  expect(result.current.publishedContent.projects[0].title).toBe('Published project');
  expect(result.current.version).toBe('1');
});

test('an unauthorized publish reports expiration and prevents a second in-flight publish', async () => {
  const published = content();
  let resolvePublish;
  const pending = new Promise((resolve) => { resolvePublish = resolve; });
  global.fetch = jest.fn((url) => {
    if (url === '/api/admin/session') return Promise.resolve(response(200, { email: 'owner@example.com', csrfToken: 'csrf-token' }));
    if (url === '/api/content') return Promise.resolve(response(200, { content: published, version: '1' }));
    return pending;
  });
  const { result } = renderHook(() => usePortfolioCms({ enabled: true, isAdmin: true }));
  await waitFor(() => expect(result.current.editorEnabled).toBe(true));

  let first;
  act(() => { first = result.current.publish(content('Edit')); });
  await act(async () => { expect(await result.current.publish(content('Second edit'))).toBeNull(); });
  expect(global.fetch.mock.calls.filter(([url]) => url === '/api/admin/content')).toHaveLength(1);
  await act(async () => {
    resolvePublish(response(401, { error: 'Session expired' }));
    await first;
  });
  expect(result.current.publishStatus).toBe('expired');
  expect(result.current.publishError).toBe('Session expired');
});

test.each([
  ['unknown record fields', () => {
    const malformed = content();
    malformed.projects[0].unexpected = 'must not be stripped';
    return { content: malformed, version: '1' };
  }],
  ['prototype-named record fields', () => {
    const malformed = content();
    malformed.projects[0] = JSON.parse(`${JSON.stringify(malformed.projects[0]).slice(0, -1)},"__proto__":{}}`);
    return { content: malformed, version: '1' };
  }],
  ['unsafe values changed by sanitization', () => {
    const malformed = content();
    malformed.projects[0].image = 'javascript:alert(1)';
    return { content: malformed, version: '1' };
  }],
  ['unknown collections', () => ({ content: { ...content(), articles: [] }, version: '1' })],
  ['an invalid version', () => ({ content: content(), version: '' })],
])('admin hydration fails closed for %s', async (_name, payload) => {
  global.fetch = jest.fn((url) => Promise.resolve(url === '/api/admin/session'
    ? response(200, { email: 'owner@example.com', csrfToken: 'csrf-token' })
    : response(200, payload())));
  const { result } = renderHook(() => usePortfolioCms({ enabled: true, isAdmin: true }));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.editorEnabled).toBe(false);
  expect(result.current.loadError).toEqual(expect.any(Error));
  expect(result.current.publishedContent).toEqual(createEmptyDrafts());
  expect(global.fetch).not.toHaveBeenCalledWith('/api/admin/content', expect.any(Object));
});

test('failed logout retains the authenticated state and exposes the error without navigating', async () => {
  const published = content();
  global.fetch = jest.fn((url) => {
    if (url === '/api/admin/session') return Promise.resolve(response(200, { email: 'owner@example.com', csrfToken: 'csrf-token' }));
    if (url === '/api/content') return Promise.resolve(response(200, { content: published, version: '1' }));
    return Promise.resolve(response(500, { error: 'Logout unavailable' }));
  });
  const { result } = renderHook(() => usePortfolioCms({ enabled: true, isAdmin: true }));
  await waitFor(() => expect(result.current.editorEnabled).toBe(true));

  let loggedOut;
  await act(async () => { loggedOut = await result.current.logout(); });

  expect(loggedOut).toBe(false);
  expect(result.current.logoutError).toBe('Logout unavailable');
  expect(result.current.editorEnabled).toBe(true);
  expect(result.current.session).toMatchObject({ email: 'owner@example.com' });
});
