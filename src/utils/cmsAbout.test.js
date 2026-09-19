import { getAboutContent } from './cmsAbout';
import { createCmsDraft, loadCmsDrafts, sanitizeDrafts, saveCmsDrafts } from './cmsDrafts';

test('existing collection drafts load unchanged with empty About overrides', () => {
  const project = createCmsDraft('project');
  const storage = { getItem: () => JSON.stringify({ projects: [project], experience: [], education: [] }) };
  const loaded = loadCmsDrafts(true, storage);
  expect(loaded.projects[0].id).toBe(project.id);
  expect(loaded.about).toEqual([]);
  expect(getAboutContent('apple', loaded.about).image).toContain('/assets/Julian_About.png');
  expect(getAboutContent('target', loaded.about).image).toContain('/assets/TGT_Banner.png');
});

test('About overrides persist independently for Apple and Target, with stable identities', () => {
  const apple = getAboutContent('apple');
  const target = getAboutContent('target');
  const drafts = [
    { ...apple, id: createCmsDraft('about').id, name: 'Apple headline', image: '/assets/apple.png' },
    { ...target, id: createCmsDraft('about').id, name: 'Target headline', image: '/assets/desktop.png', mobileImage: '/assets/mobile.png' },
  ];
  saveCmsDrafts(true, { about: drafts });
  const loaded = loadCmsDrafts(true).about;
  expect(getAboutContent('apple', loaded)).toMatchObject({ sourceId: apple.sourceId, name: 'Apple headline', image: '/assets/apple.png' });
  expect(getAboutContent('target', loaded)).toMatchObject({ sourceId: target.sourceId, name: 'Target headline', mobileImage: '/assets/mobile.png' });
  expect(getAboutContent('target', loaded.filter((draft) => draft.sourceId !== target.sourceId)).image).toBe(target.image);
  expect(getAboutContent('apple', loaded).name).toBe('Apple headline');
});

test('About accepts only known singleton sources and sanitizes each image and link', () => {
  const draft = { ...getAboutContent('target'), id: createCmsDraft('about').id };
  const cleaned = sanitizeDrafts({ about: [
    { ...draft, image: `java${'script'}:alert(1)`, mobileImage: '//evil.test/image', resumeLink: 'data:text/html,bad' },
    { ...draft, id: createCmsDraft('about').id },
    { ...draft, id: createCmsDraft('about').id, sourceId: 'source-about-other-0' },
    createCmsDraft('about'),
  ] });
  expect(cleaned.about).toHaveLength(1);
  expect(cleaned.about[0]).toMatchObject({ image: '', mobileImage: '', resumeLink: '' });
  expect(cleaned.about[0]._cmsOriginal).toBeUndefined();
});
