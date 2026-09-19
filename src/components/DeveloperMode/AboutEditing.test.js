import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeveloperMode from './DeveloperMode';
import CmsEditingContext from './CmsEditingContext';
import About from '../../pages/About/About';
import TgtAbout from '../../pages/TGT_About/TGT_About';
import useCmsDrafts from '../../hooks/useCmsDrafts';
import { getAboutContent } from '../../utils/cmsAbout';
import { CMS_DRAFT_STORAGE_KEY, createCmsDraft, sanitizeDrafts } from '../../utils/cmsDrafts';

function Harness({ initialTheme = 'apple' }) {
  const [theme, setTheme] = useState(initialTheme);
  const [open, setOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const { drafts, saveStatus, beginEdit, updateDraft, deleteDraft } = useCmsDrafts(true);
  const content = getAboutContent(theme, sanitizeDrafts(drafts).about);
  const modify = (type, item, options = {}) => {
    const draft = beginEdit(type, item);
    setEditRequest({ type, id: draft.id, field: options.field });
  };
  const change = (type, id, key, value) => {
    const draftId = id || beginEdit('about', content).id;
    updateDraft(type, draftId, key, value);
  };
  return <CmsEditingContext.Provider value={open ? { onModify: modify } : null}>
    <button onClick={() => setTheme('target')}>Use Target</button>
    <button onClick={() => setTheme('apple')}>Use Apple</button>
    {theme === 'apple' ? <About content={content} animationsEnabled={false} /> : <TgtAbout content={content} />}
    <DeveloperMode theme={theme} aboutContent={content} drafts={drafts} saveStatus={saveStatus} editRequest={editRequest}
      isOpen={open} onOpenChange={setOpen} onDraftChange={change} onDeleteDraft={deleteDraft}
      onPlace={() => null} onNavigateToSection={() => {}} />
  </CmsEditingContext.Provider>;
}

beforeEach(() => localStorage.clear());

test('About tab edits the portrait and body live without adding a section or losing the first field', () => {
  const sourceProject = createCmsDraft('project');
  localStorage.setItem(CMS_DRAFT_STORAGE_KEY, JSON.stringify({ projects: [sourceProject] }));
  render(<Harness />);
  expect(screen.queryByRole('button', { name: 'Edit About section' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
  fireEvent.click(screen.getByRole('button', { name: 'About', exact: true }));
  expect(screen.queryByRole('button', { name: /Add about/i })).not.toBeInTheDocument();
  const imageField = screen.getByLabelText('Portrait image URL');
  fireEvent.change(imageField, { target: { value: '/assets/replacement.png' } });
  expect(screen.getByLabelText('Portrait image URL')).toBe(imageField);
  fireEvent.change(screen.getByLabelText('Name or headline'), { target: { value: 'Updated headline' } });
  fireEvent.change(screen.getByLabelText('About description'), { target: { value: 'Updated body copy' } });
  const section = screen.getByTestId('about-section');
  expect(within(section).getByRole('img', { name: 'Julian with a family member' })).toHaveAttribute('src', '/assets/replacement.png');
  expect(within(section).getByRole('heading', { name: 'Updated headline' })).toBeInTheDocument();
  expect(within(section).getByText('Updated body copy')).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem(CMS_DRAFT_STORAGE_KEY));
  expect(saved.about).toHaveLength(1);
  expect(saved.projects[0].id).toBe(sourceProject.id);
  fireEvent.click(screen.getByRole('button', { name: 'Close portfolio editor' }));
  expect(screen.queryByRole('button', { name: 'Edit About section' })).not.toBeInTheDocument();
});

test('clicking the Apple image opens About and focuses its image URL', async () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
  fireEvent.click(screen.getByRole('img', { name: 'Julian with a family member' }));
  expect(screen.getByRole('button', { name: 'About', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(screen.getByLabelText('Portrait image URL')).toHaveFocus());
  const unsafeUrl = `java${'script'}:bad`;
  fireEvent.change(screen.getByLabelText('Portrait image URL'), { target: { value: unsafeUrl } });
  expect(screen.getByLabelText('Portrait image URL')).toHaveValue(unsafeUrl);
  expect(within(screen.getByTestId('about-section')).queryByRole('img', { name: 'Julian with a family member' })).not.toBeInTheDocument();
});

test('theme-specific text and banner edits survive reload and reset independently', () => {
  let view = render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
  fireEvent.click(screen.getByRole('button', { name: 'About', exact: true }));
  fireEvent.change(screen.getByLabelText('Portrait image URL'), { target: { value: '/apple.png' } });
  fireEvent.click(screen.getByRole('button', { name: 'Use Target' }));
  expect(screen.getByLabelText('Desktop banner URL')).toHaveValue(getAboutContent('target').image);
  fireEvent.change(screen.getByLabelText('Desktop banner URL'), { target: { value: '/target.png' } });
  fireEvent.change(screen.getByLabelText('Mobile banner URL (blank uses desktop)'), { target: { value: '/mobile.png' } });
  fireEvent.change(screen.getByLabelText('About description'), { target: { value: 'Target copy' } });
  expect(within(screen.getByTestId('tgt-about')).getByText('Target copy')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(CMS_DRAFT_STORAGE_KEY)).about).toHaveLength(2);
  view.unmount();
  view = render(<Harness initialTheme="target" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
  fireEvent.click(screen.getByRole('button', { name: 'About', exact: true }));
  expect(screen.getByLabelText('Desktop banner URL')).toHaveValue('/target.png');
  expect(screen.getByLabelText('Mobile banner URL (blank uses desktop)')).toHaveValue('/mobile.png');
  fireEvent.click(screen.getByRole('button', { name: 'Reset changes' }));
  expect(screen.getByLabelText('Desktop banner URL')).toHaveValue(getAboutContent('target').image);
  fireEvent.click(screen.getByRole('button', { name: 'Use Apple' }));
  expect(screen.getByLabelText('Portrait image URL')).toHaveValue('/apple.png');
});

test.each([[1200, 'Desktop banner URL'], [390, 'Mobile banner URL (blank uses desktop)']])('Target banner clicks focus the right image field at %spx', async (width, field) => {
  const previousWidth = window.innerWidth;
  window.innerWidth = width;
  try {
    render(<Harness initialTheme="target" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit About section' }));
    await waitFor(() => expect(screen.getByLabelText(field)).toHaveFocus());
  } finally {
    window.innerWidth = previousWidth;
  }
});
