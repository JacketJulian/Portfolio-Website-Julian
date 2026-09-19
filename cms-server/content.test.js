'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createContentStore, validateContent } = require('./content');

const emptyContent = () => ({ projects: [], experience: [], education: [], about: [] });
const project = (overrides = {}) => ({
  id: 'cms-project-one',
  title: 'Résumé 🚀',
  description: 'A project',
  image: '/assets/project.png',
  demoLink: 'https://example.com/demo',
  ...overrides,
});

function storageError(code, message = 'storage failure') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createFakeStorage({ missing = false, initial, generation = 7 } = {}) {
  const state = {
    content: initial === undefined ? null : Buffer.from(JSON.stringify(initial)),
    generation: String(generation),
    saveOptions: null,
  };
  const fileFor = (options = {}) => ({
    metadata: {},
    async getMetadata() {
      if (missing || state.content === null) throw storageError(404);
      return [{ generation: state.generation }];
    },
    async download() {
      assert.equal(String(options.generation), state.generation);
      return [state.content];
    },
    async save(data, saveOptions) {
      state.saveOptions = saveOptions;
      if (Number(state.generation) !== saveOptions.preconditionOpts.ifGenerationMatch
        && !(state.content === null && saveOptions.preconditionOpts.ifGenerationMatch === 0)) {
        throw storageError(412);
      }
      state.content = Buffer.from(data);
      state.generation = String(Number(state.generation) + 1);
      this.metadata.generation = state.generation;
    },
  });
  return {
    state,
    storage: {
      bucket(name) {
        assert.equal(name, 'test-bucket');
        return {
          file: (name, options) => {
            assert.equal(name, 'portfolio/content.json');
            return fileFor(options);
          },
        };
      },
    },
  };
}

test('read returns empty required collections at version zero when the object is missing', async () => {
  const { storage } = createFakeStorage({ missing: true });
  const store = createContentStore({ bucketName: 'test-bucket', storage });
  assert.deepEqual(await store.read(), { content: emptyContent(), version: '0' });
});

test('valid content round-trips with defaults, exact Unicode, metadata, and upload generation', async () => {
  const initial = { ...emptyContent(), projects: [project()] };
  const { storage, state } = createFakeStorage({ initial, generation: 7 });
  const store = createContentStore({ bucketName: 'test-bucket', storage });
  const read = await store.read();
  assert.equal(read.version, '7');
  assert.equal(read.content.projects[0].title, 'Résumé 🚀');
  assert.equal(read.content.projects[0].githubText, '');

  const written = await store.write(read.content, read.version);
  assert.equal(written.version, '8');
  assert.equal(written.content.projects[0].title, 'Résumé 🚀');
  assert.deepEqual(state.saveOptions.preconditionOpts, { ifGenerationMatch: 7 });
  assert.equal(state.saveOptions.contentType, 'application/json');
  assert.deepEqual(state.saveOptions.metadata, {
    cacheControl: 'no-store',
    contentType: 'application/json',
  });
});

test('rejects unsafe, executable, protocol-relative, control, and backslash URLs', () => {
  for (const image of [
    'javascript:alert(1)',
    'data:text/html,bad',
    '//evil.example/a',
    '/\\evil.example/a',
    'https://example.com/line\nbreak',
    ' /assets/project.png',
  ]) {
    assert.throws(
      () => validateContent({ ...emptyContent(), projects: [project({ image })] }),
      (error) => error.status === 400 && /URL/.test(error.message),
    );
  }
});

test('rejects oversized content and collection bounds', () => {
  assert.throws(
    () => validateContent({ ...emptyContent(), projects: [project({ description: 'x'.repeat(16001) })] }),
    (error) => error.status === 400,
  );
  assert.throws(
    () => validateContent({
      ...emptyContent(),
      projects: Array.from({ length: 201 }, (_, index) => project({ id: `cms-project-${index}` })),
    }),
    (error) => error.status === 400,
  );
  const huge = emptyContent();
  for (let index = 0; index < 40; index += 1) {
    huge.projects.push(project({ id: `cms-project-${index}`, description: '界'.repeat(6000) }));
  }
  assert.throws(() => validateContent(huge), (error) => error.status === 400 && /512 KiB/.test(error.message));
});

test('production media requires HTTPS but ordinary outbound links can use HTTP', () => {
  for (const field of ['image', 'videoUrl']) {
    assert.throws(() => validateContent({ ...emptyContent(), projects: [project({ [field]: 'http://example.com/media' })] }),
      (error) => error.status === 400 && /HTTPS/.test(error.publicMessage));
  }
  const content = validateContent({ ...emptyContent(), projects: [project({ demoLink: 'http://example.com/' })] });
  assert.equal(content.projects[0].demoLink, 'http://example.com/');
});

test('realistic GCS generations retain exact atomic-write preconditions', async () => {
  const { storage, state } = createFakeStorage({ initial: emptyContent(), generation: 1758222333444555 });
  const store = createContentStore({ bucketName: 'test-bucket', storage });
  const current = await store.read();
  const written = await store.write(current.content, current.version);
  assert.equal(state.saveOptions.preconditionOpts.ifGenerationMatch, 1758222333444555);
  assert.equal(written.version, '1758222333444556');
});

test('rejects duplicate IDs and source IDs using global uniqueness sets', () => {
  const duplicateId = {
    ...emptyContent(),
    projects: [project(), project({ id: 'cms-project-one', title: 'Duplicate' })],
  };
  assert.throws(() => validateContent(duplicateId), (error) => error.status === 400 && /IDs/.test(error.message));

  const duplicateSource = {
    ...emptyContent(),
    projects: [project({ sourceId: 'source-project-a-0' }), project({ id: 'cms-project-two', sourceId: 'source-project-a-0' })],
  };
  assert.throws(() => validateContent(duplicateSource), (error) => error.status === 400 && /source IDs/.test(error.message));
});

test('requires exact bounded About sources and rejects unknown or prototype-bearing records', () => {
  const content = {
    ...emptyContent(),
    about: [{ id: 'cms-about-one', sourceId: 'source-about-apple-0', name: 'Julián' }],
  };
  assert.equal(validateContent(content).about[0].description, '');
  assert.throws(
    () => validateContent({ ...emptyContent(), about: [{ ...content.about[0], sourceId: 'source-about-other-0' }] }),
    (error) => error.status === 400,
  );
  assert.throws(
    () => validateContent({ ...emptyContent(), projects: [{ ...project(), extra: true }] }),
    (error) => error.status === 400,
  );
  const inherited = Object.create({ title: 'inherited' });
  inherited.id = 'cms-project-inherited';
  assert.throws(
    () => validateContent({ ...emptyContent(), projects: [inherited] }),
    (error) => error.status === 400,
  );
});

test('maps storage precondition failures to a safe 409 and rejects invalid versions before upload', async () => {
  const { storage } = createFakeStorage({ initial: emptyContent(), generation: 5 });
  const store = createContentStore({ bucketName: 'test-bucket', storage });
  await assert.rejects(store.write(emptyContent(), '4'), (error) => (
    error.status === 409 && error.message === 'Content version conflict'
  ));
  await assert.rejects(store.write(emptyContent(), '01'), (error) => error.status === 400);
  await assert.rejects(store.write(emptyContent(), '9007199254740992'), (error) => error.status === 400);
});

test('rejects existing malformed JSON/content safely while propagating unrelated storage errors', async () => {
  const malformedStorage = {
    bucket: () => ({
      file: (_name, options) => ({
        getMetadata: async () => [{ generation: '3' }],
        download: async () => {
          assert.equal(options.generation, '3');
          return [Buffer.from('{bad json')];
        },
      }),
    }),
  };
  await assert.rejects(
    createContentStore({ bucketName: 'test-bucket', storage: malformedStorage }).read(),
    (error) => error.status === 400 && error.message === 'Stored content is malformed',
  );

  const outage = storageError(503, 'upstream unavailable');
  const failingStorage = { bucket: () => ({ file: () => ({ getMetadata: async () => { throw outage; } }) }) };
  await assert.rejects(
    createContentStore({ bucketName: 'test-bucket', storage: failingStorage }).read(),
    (error) => error === outage,
  );
});
