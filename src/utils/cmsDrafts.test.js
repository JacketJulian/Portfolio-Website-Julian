import {
  CMS_TYPES, CMS_DRAFT_STORAGE_KEY, collectionForType, createCmsDraft,
  createEmptyDrafts, getCmsSourceId, isLocalHost, loadCmsDrafts, mergeCmsItems, safeUrl, saveCmsDrafts,
} from './cmsDrafts';

test('maps only valid types, with unique neutral drafts', () => {
  expect(CMS_TYPES).toEqual(['project', 'experience', 'education', 'about']);
  expect(collectionForType('project')).toBe('projects');
  expect(collectionForType('projects')).toBeNull();
  expect(createCmsDraft('unknown')).toBeNull();
  expect(createCmsDraft('project').id).not.toBe(createCmsDraft('project').id);
  expect(createCmsDraft('experience').logo).toBe('');
  expect(createCmsDraft('education').logo).toBe('');
});

test('recognizes browser-form IPv6 loopback but no remote host', () => {
  expect(isLocalHost('[::1]')).toBe(true);
  expect(isLocalHost('::1')).toBe(true);
  expect(isLocalHost('localhost.evil.com')).toBe(false);
});

test('rejects executable and protocol-relative URLs, retaining ordinary assets', () => {
  [`java${'script'}:alert(1)`, 'data:text/html,hi', 'file:///etc/passwd', '//evil.test/a', '/\\evil.test/a'].forEach((url) => {
    expect(safeUrl(url)).toBe('');
  });
  expect(safeUrl('/assets/a.svg')).toBe('/assets/a.svg');
  expect(safeUrl('https://example.org/demo')).toBe('https://example.org/demo');
});

test('project video URLs are supported and sanitized independently from outbound links', () => {
  const project = createCmsDraft('project');
  expect(project).toHaveProperty('videoUrl', '');
  const storage = { getItem: jest.fn(() => JSON.stringify({
    projects: [{ ...project, description: 'Keep this description', demoLink: 'https://example.org', videoUrl: 'data:text/html,bad' }],
    experience: [],
    education: [],
  })) };
  expect(loadCmsDrafts(true, storage).projects[0]).toMatchObject({
    description: 'Keep this description',
    demoLink: 'https://example.org',
    videoUrl: '',
  });
});

test('loads only well-shaped records and strips unsafe URL values and duplicate ids', () => {
  const project = createCmsDraft('project');
  const storage = { getItem: jest.fn(() => JSON.stringify({
    projects: [{ ...project, image: 'data:text/html,no', demoLink: `java${'script'}:alert(1)` }, project, { id: 'oops', title: 'bad' }, null],
    experience: [{ ...createCmsDraft('experience'), techStack: 'not an array', logo: `java${'script'}:bad` }],
    education: 'wrong shape',
  })) };
  const result = loadCmsDrafts(true, storage);
  expect(storage.getItem).toHaveBeenCalledWith(CMS_DRAFT_STORAGE_KEY);
  expect(result.projects).toHaveLength(1);
  expect(result.projects[0]).toMatchObject({ image: '', demoLink: '' });
  expect(result.experience[0]).toMatchObject({ logo: '', techStack: [] });
  expect(result.education).toEqual([]);
});

test('storage failures and nonlocal mode are safe and never report saved', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  expect(loadCmsDrafts(true, broken)).toEqual(createEmptyDrafts());
  expect(saveCmsDrafts(true, createEmptyDrafts(), broken)).toBe(false);
  expect(loadCmsDrafts(false, broken)).toEqual(createEmptyDrafts());
  expect(saveCmsDrafts(false, createEmptyDrafts(), broken)).toBe(false);
});

test('saving one malformed field does not erase unrelated supported draft fields', () => {
  const project = {
    ...createCmsDraft('project'),
    title: { malformed: true },
    description: 'Preserve me',
    githubText: 'Source code',
    videoUrl: `java${'script'}:bad`,
  };
  let serialized = '';
  const storage = { setItem: (key, value) => { serialized = value; } };
  expect(saveCmsDrafts(true, { projects: [project], experience: [], education: [] }, storage)).toBe(true);
  expect(JSON.parse(serialized).projects[0]).toMatchObject({
    title: '',
    description: 'Preserve me',
    githubText: 'Source code',
    videoUrl: '',
  });
});

test('source overrides update in place without duplicating or depending on source order', () => {
  const originals = [{ title: 'First', demoLink: '' }, { title: 'Second', demoLink: '' }];
  const override = { ...createCmsDraft('project'), sourceId: getCmsSourceId('project', originals[1]), title: 'Edited second' };
  const added = { ...createCmsDraft('project'), title: 'Added' };
  const merged = mergeCmsItems('project', originals, [override, added]);
  expect(merged.map((item) => item.title)).toEqual(['Added', 'First', 'Edited second']);
  expect(mergeCmsItems('project', [...originals].reverse(), [override]).map((item) => item.title)).toEqual(['Edited second', 'First']);
  expect(originals[1].title).toBe('Second');
  expect(mergeCmsItems('project', originals, []).map((item) => item.title)).toEqual(['First', 'Second']);
});

test('identical source entries have distinct keys and source metadata survives storage', () => {
  const originals = [{ institutionName: 'School', degree: 'Degree' }, { institutionName: 'School', degree: 'Degree' }];
  const merged = mergeCmsItems('education', originals);
  expect(merged[0].sourceId).not.toBe(merged[1].sourceId);
  const edited = { ...createCmsDraft('education'), sourceId: merged[1].sourceId, institutionName: 'Updated school' };
  saveCmsDrafts(true, { ...createEmptyDrafts(), education: [edited] });
  const loaded = loadCmsDrafts(true);
  expect(loaded.education[0].sourceId).toBe(edited.sourceId);
  expect(mergeCmsItems('education', originals, loaded.education).map((item) => item.institutionName)).toEqual(['School', 'Updated school']);
});

test('rejects malformed source references and duplicate overrides', () => {
  const sourceId = getCmsSourceId('project', { title: 'Project' });
  const first = { ...createCmsDraft('project'), sourceId };
  const storage = { getItem: () => JSON.stringify({ projects: [first, { ...createCmsDraft('project'), sourceId }, { ...createCmsDraft('project'), sourceId: 'source-education-invalid' }] }) };
  expect(loadCmsDrafts(true, storage).projects).toEqual([expect.objectContaining({ id: first.id, sourceId })]);
});
