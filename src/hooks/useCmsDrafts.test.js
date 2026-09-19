import { act, renderHook } from '@testing-library/react';
import useCmsDrafts from './useCmsDrafts';
import { CMS_DRAFT_STORAGE_KEY, mergeCmsItems } from '../utils/cmsDrafts';
import { getAboutContent } from '../utils/cmsAbout';
import * as draftUtils from '../utils/cmsDrafts';

beforeEach(() => window.localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test('project drops append to projects, return a distinct record, and persist', () => {
  const { result } = renderHook(() => useCmsDrafts(true));
  let first;
  act(() => { first = result.current.addDraft('project', 'projects'); });
  expect(first).toMatchObject({ title: 'New project' });
  act(() => { result.current.addDraft('project', 'projects'); });
  expect(result.current.drafts.projects).toHaveLength(2);
  expect(result.current.drafts.projects[1].id).not.toBe(first.id);
  expect(JSON.parse(localStorage.getItem(CMS_DRAFT_STORAGE_KEY)).projects).toHaveLength(2);
  expect(result.current.saveStatus).toBe('saved');
});

test('rejects invalid types, mismatched zones and unexpected updates', () => {
  const { result } = renderHook(() => useCmsDrafts(true));
  act(() => {
    expect(result.current.addDraft('project', 'project')).toBeNull();
    expect(result.current.addDraft('oops', 'education')).toBeNull();
  });
  expect(result.current.drafts.projects).toEqual([]);
  let draft;
  act(() => { draft = result.current.addDraft('experience', 'experience'); });
  act(() => {
    result.current.updateDraft('experience', draft.id, 'id', 'changed');
    result.current.updateDraft('experience', draft.id, 'techStack', 'not an array');
    result.current.updateDraft('wrong', draft.id, 'companyName', 'wrong');
  });
  expect(result.current.drafts.experience[0]).toEqual(draft);
  act(() => { result.current.updateDraft('experience', draft.id, 'techStack', ['React']); });
  expect(result.current.drafts.experience[0].techStack).toEqual(['React']);
  act(() => { result.current.deleteDraft('experience', draft.id); });
  expect(result.current.drafts.experience).toEqual([]);
});

test('accepts videoUrl edits without conflating them with demoLink', () => {
  const { result } = renderHook(() => useCmsDrafts(true));
  let draft;
  act(() => { draft = result.current.addDraft('project', 'projects'); });
  act(() => {
    result.current.updateDraft('project', draft.id, 'videoUrl', 'https://cdn.example.org/demo.mp4');
    result.current.updateDraft('project', draft.id, 'demoLink', 'https://example.org/project');
  });
  expect(result.current.drafts.projects[0]).toMatchObject({
    videoUrl: 'https://cdn.example.org/demo.mp4',
    demoLink: 'https://example.org/project',
  });
});

test('nonlocal hook does not read, add, or write drafts', () => {
  const draft = { ...require('../utils/cmsDrafts').createCmsDraft('project') };
  localStorage.setItem(CMS_DRAFT_STORAGE_KEY, JSON.stringify({ projects: [draft] }));
  const { result } = renderHook(() => useCmsDrafts(false));
  act(() => { expect(result.current.addDraft('project', 'projects')).toBeNull(); });
  expect(result.current.drafts.projects).toEqual([]);
  expect(result.current.saveStatus).toBe('idle');
});

test('beginEdit reuses an existing draft or source override rather than creating duplicates', () => {
  const original = { institutionName: 'Source school', degree: 'Source degree', logo: '/assets/school.svg' };
  const source = mergeCmsItems('education', [original])[0];
  const { result } = renderHook(() => useCmsDrafts(true));
  let edited;
  act(() => { edited = result.current.beginEdit('education', source); });
  act(() => { expect(result.current.beginEdit('education', source).id).toBe(edited.id); });
  expect(result.current.drafts.education).toHaveLength(1);
  act(() => result.current.updateDraft('education', edited.id, 'degree', 'Updated degree'));
  expect(mergeCmsItems('education', [original], result.current.drafts.education)).toHaveLength(1);
  expect(mergeCmsItems('education', [original], result.current.drafts.education)[0].degree).toBe('Updated degree');
  expect(original.degree).toBe('Source degree');
  act(() => result.current.deleteDraft('education', edited.id));
  expect(mergeCmsItems('education', [original], result.current.drafts.education)[0].degree).toBe('Source degree');
  let added;
  act(() => { added = result.current.addDraft('project', 'projects'); });
  act(() => { expect(result.current.beginEdit('project', added).id).toBe(added.id); });
  expect(result.current.drafts.projects).toHaveLength(1);
});

test('beginEdit rejects unknown records and is disabled off localhost', () => {
  const source = mergeCmsItems('education', [{ institutionName: 'School' }])[0];
  const { result } = renderHook(() => useCmsDrafts(false));
  act(() => { expect(result.current.beginEdit('education', source)).toBeNull(); });
  expect(result.current.drafts.education).toEqual([]);
});

test('About is editable once per theme, cannot be added, and resets only that variant', () => {
  const { result } = renderHook(() => useCmsDrafts(true));
  let apple;
  let target;
  act(() => {
    expect(result.current.addDraft('about', 'about')).toBeNull();
    apple = result.current.beginEdit('about', getAboutContent('apple'));
    target = result.current.beginEdit('about', getAboutContent('target'));
    result.current.updateDraft('about', apple.id, 'image', '/apple.png');
    result.current.updateDraft('about', target.id, 'mobileImage', '/target-mobile.png');
  });
  act(() => expect(result.current.beginEdit('about', getAboutContent('apple')).id).toBe(apple.id));
  expect(result.current.drafts.about).toHaveLength(2);
  expect(getAboutContent('apple', result.current.drafts.about).image).toBe('/apple.png');
  act(() => result.current.deleteDraft('about', apple.id));
  expect(getAboutContent('apple', result.current.drafts.about).image).toBe(getAboutContent('apple').image);
  expect(getAboutContent('target', result.current.drafts.about).mobileImage).toBe('/target-mobile.png');
});

test.each(['apple', 'target'])('editing %s About upgrades a retained pre-About state without losing existing drafts', (theme) => {
  const project = { ...draftUtils.createCmsDraft('project'), title: 'Keep this project', demoLink: 'https://' };
  const education = { ...draftUtils.createCmsDraft('education'), institutionName: 'Keep this school' };
  // Simulate the state/ref retained by Fast Refresh, not a fresh storage load.
  const legacyState = { projects: [project], experience: [], education: [education] };
  jest.spyOn(draftUtils, 'loadCmsDrafts').mockReturnValueOnce(legacyState);
  const { result, rerender } = renderHook(() => useCmsDrafts(true));
  expect(result.current.drafts.about).toEqual([]);
  let about;
  act(() => {
    about = result.current.beginEdit('about', getAboutContent(theme));
    result.current.updateDraft('about', about.id, 'image', '/assets/replacement.png');
  });
  rerender();
  expect(result.current.drafts.about).toHaveLength(1);
  expect(result.current.drafts.about[0].image).toBe('/assets/replacement.png');
  expect(result.current.drafts.projects[0]).toBe(project);
  expect(result.current.drafts.projects[0].demoLink).toBe('https://');
  expect(result.current.drafts.education[0]).toBe(education);
  expect(legacyState).not.toHaveProperty('about');
  const persisted = JSON.parse(localStorage.getItem(CMS_DRAFT_STORAGE_KEY));
  expect(persisted.about[0].image).toBe('/assets/replacement.png');
  expect(persisted.projects[0].title).toBe(project.title);
  expect(persisted.education[0].institutionName).toBe(education.institutionName);
});

test('all draft mutations tolerate missing collections in retained state', () => {
  jest.spyOn(draftUtils, 'loadCmsDrafts').mockReturnValueOnce({ education: [] });
  const { result } = renderHook(() => useCmsDrafts(true));
  act(() => {
    result.current.updateDraft('about', 'missing', 'name', 'Ignored');
    result.current.deleteDraft('about', 'missing');
    const project = result.current.addDraft('project', 'projects');
    result.current.updateDraft('project', project.id, 'title', 'Added after refresh');
    result.current.deleteDraft('project', project.id);
  });
  expect(result.current.drafts).toEqual(draftUtils.createEmptyDrafts());
});

test('memory mode hydrates explicitly without touching local storage', () => {
  const stored = { projects: [{ ...draftUtils.createCmsDraft('project'), title: 'Keep local' }] };
  localStorage.setItem(CMS_DRAFT_STORAGE_KEY, JSON.stringify(stored));
  const published = draftUtils.createEmptyDrafts();
  published.projects = [{ ...draftUtils.createCmsDraft('project'), title: 'Published' }];
  const setItem = jest.spyOn(Storage.prototype, 'setItem');
  const getItem = jest.spyOn(Storage.prototype, 'getItem');
  const { result } = renderHook(() => useCmsDrafts(true, { persist: false }));

  expect(result.current.drafts.projects).toEqual([]);
  expect(getItem).not.toHaveBeenCalled();
  act(() => { expect(result.current.replaceDrafts(published)).toBe(true); });

  expect(result.current.drafts.projects[0].title).toBe('Published');
  expect(setItem).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(CMS_DRAFT_STORAGE_KEY)).projects[0].title).toBe('Keep local');
});

test('conditional replacement does not destroy edits made while a publish is in flight', () => {
  const initial = draftUtils.createEmptyDrafts();
  initial.projects = [{ ...draftUtils.createCmsDraft('project'), title: 'Before publish' }];
  const server = draftUtils.createEmptyDrafts();
  server.projects = [{ ...initial.projects[0], title: 'Server copy' }];
  const { result } = renderHook(() => useCmsDrafts(true, { persist: false, initialDrafts: initial }));
  const submitted = draftUtils.sanitizeDrafts(result.current.drafts);

  act(() => result.current.updateDraft('project', initial.projects[0].id, 'title', 'Typed during publish'));
  act(() => { expect(result.current.replaceDrafts(server, submitted)).toBe(false); });

  expect(result.current.drafts.projects[0].title).toBe('Typed during publish');
});
