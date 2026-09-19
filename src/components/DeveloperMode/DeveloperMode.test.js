/* eslint-disable testing-library/no-node-access -- These integration assertions verify actual component roots, styling hooks, and drag hit testing. */
import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeveloperMode, { CmsDropTarget } from './DeveloperMode';
import PortfolioItem from '../PortfolioItem/PortfolioItem';
import useCmsDrafts from '../../hooks/useCmsDrafts';
import { collectionForType, createCmsDraft, sanitizeDrafts } from '../../utils/cmsDrafts';

function EditorHarness({ theme = 'apple', developerProps = {} }) {
  const { drafts, saveStatus, addDraft, updateDraft, deleteDraft } = useCmsDrafts(true);
  const [open, setOpen] = useState(true);
  const [dragType, setDragType] = useState('');
  const [hover, setHover] = useState('');
  const pageDrafts = sanitizeDrafts(drafts);
  return <>
    {['project', 'experience', 'education'].map((type) => <CmsDropTarget key={type} theme={theme} zone={collectionForType(type)} accepts={[type]}>
      <div data-testid={`live-${type}`}>
        {dragType === type && hover === collectionForType(type) && <PortfolioItem type={type} theme={theme} item={createCmsDraft(type)} className="cms-item-placeholder" data-cms-placeholder={type} inert={true} />}
        {pageDrafts[collectionForType(type)].map((item) => <PortfolioItem key={item.id} type={type} theme={theme} item={item} />)}
      </div>
    </CmsDropTarget>)}
    <DeveloperMode theme={theme} drafts={drafts} saveStatus={saveStatus} isOpen={open} onOpenChange={setOpen}
      onPlace={addDraft} onDraftChange={updateDraft} onDeleteDraft={deleteDraft}
      onDragStateChange={setDragType} onHoverZoneChange={setHover} onNavigateToSection={() => {}} {...developerProps} />
  </>;
}

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test.each([['apple', 'ui-button'], ['target', 'tgt-button']])('uses existing %s controls and the same actual card on shelf and live page', (theme, buttonClass) => {
  render(<EditorHarness theme={theme} />);
  const add = screen.getByRole('button', { name: 'Add project' });
  expect(add).toHaveClass(buttonClass);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(add);
  const live = screen.getByTestId('live-project');
  const card = live.firstElementChild;
  expect(document.querySelector('.cms-component-content').firstElementChild.className).toBe(card.className);
  fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Live project edit' } });
  expect(within(live).getByRole('heading', { name: 'Live project edit' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Saved in this browser');
});

test('skills preserve comma typing and update the real component on blur', () => {
  render(<EditorHarness />);
  fireEvent.click(screen.getByRole('button', { name: 'Experience', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Add experience' }));
  const skills = screen.getByLabelText('Skills, separated by commas');
  fireEvent.change(skills, { target: { value: 'React, TypeScript, SQL' } });
  expect(skills).toHaveValue('React, TypeScript, SQL');
  fireEvent.blur(skills);
  expect(within(screen.getByTestId('live-experience')).getByText('TypeScript')).toHaveClass('tech-bubble');
});

test('storage failures stay visible without pretending a draft was saved', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
  render(<EditorHarness />);
  fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
  expect(screen.getByRole('status')).toHaveTextContent('Not saved');
  expect(screen.getByLabelText('Project name')).toHaveValue('New project');
});

test('pointer hover renders a real dashed placeholder and drop replaces it with one editable item', () => {
  render(<EditorHarness />);
  const live = screen.getByTestId('live-project');
  const originalHitTest = document.elementFromPoint;
  document.elementFromPoint = () => live;
  const pointer = (target, name, x) => {
    const event = new MouseEvent(name, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: 200 });
    Object.assign(event, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
    fireEvent(target, event);
  };
  try {
    pointer(screen.getByRole('button', { name: 'Drag new project onto Projects' }), 'pointerdown', 50);
    pointer(document, 'pointermove', 100);
    expect(live.querySelector('.cms-item-placeholder')).toHaveClass('project-card');
    expect(document.querySelector('.cms-drag-ghost')).toBeInTheDocument();
    pointer(document, 'pointerup', 100);
    expect(live.querySelector('.cms-item-placeholder')).not.toBeInTheDocument();
    expect(live.querySelectorAll('.project-card')).toHaveLength(1);
    expect(screen.getByLabelText('Project name')).toHaveValue('New project');
  } finally {
    if (originalHitTest) document.elementFromPoint = originalHitTest;
    else delete document.elementFromPoint;
  }
});

test.each([['apple', 'ui-button'], ['target', 'tgt-button']])('production mode uses existing %s controls for explicit publish and logout', (theme, buttonClass) => {
  const onPublish = jest.fn();
  const onLogout = jest.fn();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(<EditorHarness theme={theme} developerProps={{ mode: 'production', isDirty: true, onPublish, onLogout, sessionEmail: 'owner@example.com' }} />);

  expect(screen.getByRole('status')).toHaveTextContent('Unpublished changes');
  expect(screen.getByText('owner@example.com')).toBeInTheDocument();
  const publish = screen.getByRole('button', { name: 'Publish' });
  expect(publish).toHaveClass(buttonClass);
  fireEvent.click(publish);
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  expect(onPublish).toHaveBeenCalledTimes(1);
  expect(onLogout).toHaveBeenCalledTimes(1);
});

test('production publish state disables duplicate publishing and offers sign-in after expiration', () => {
  const view = render(<EditorHarness developerProps={{ mode: 'production', isDirty: true, publishStatus: 'expired', publishError: 'Session expired' }} />);
  expect(screen.getByRole('status')).toHaveTextContent('Unpublished changes · session expired');
  expect(screen.getByRole('alert')).toHaveTextContent('Your session expired');
  expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/admin');

  view.rerender(<EditorHarness developerProps={{ mode: 'production', isDirty: true, publishStatus: 'publishing' }} />);
  expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled();
});

test('failed production access shows only a sign-in action, not the editor', () => {
  render(<EditorHarness developerProps={{ accessError: new Error('Unauthorized') }} />);
  expect(screen.queryByLabelText('Portfolio editor')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Open portfolio editor' })).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Portfolio editor unavailable');
  expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/admin');
});

test('downloads a sanitized production draft with its version without a network request', async () => {
  const createObjectURL = jest.fn().mockReturnValue('blob:portfolio-draft');
  const revokeObjectURL = jest.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<EditorHarness developerProps={{ mode: 'production', isDirty: true, version: '7' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add project' }));

  fireEvent.click(screen.getByRole('button', { name: 'Download draft' }));

  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  const blob = createObjectURL.mock.calls[0][0];
  const exported = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(JSON.parse(reader.result));
    reader.readAsText(blob);
  });
  expect(exported.version).toBe('7');
  expect(exported.content.projects[0]).toMatchObject({ title: 'New project' });
  expect(click).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:portfolio-draft');
});

test('dirty production logout requires an explicit decision and retains the editor when cancelled', () => {
  const onLogout = jest.fn();
  jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<EditorHarness developerProps={{ mode: 'production', isDirty: true, onLogout }} />);

  const logout = screen.getByRole('button', { name: 'Log out' });
  expect(logout).toHaveAttribute('title', 'Publish or download your draft before logging out.');
  fireEvent.click(logout);

  expect(window.confirm).toHaveBeenCalled();
  expect(onLogout).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Portfolio editor')).toBeInTheDocument();
});

test('conflict and logout failures keep unpublished state and give backup-first guidance', () => {
  const view = render(<EditorHarness developerProps={{ mode: 'production', isDirty: true, publishStatus: 'conflict' }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Your edits have not been published. Download your draft before reloading to review the latest published content.');
  expect(screen.getAllByRole('button', { name: 'Download draft' })).not.toHaveLength(0);

  view.rerender(<EditorHarness developerProps={{ mode: 'production', isDirty: true, logoutError: 'Logout unavailable' }} />);
  expect(screen.getByRole('status')).toHaveTextContent('Unpublished changes · log out failed');
  expect(screen.getByRole('alert')).toHaveTextContent('The editor and your drafts remain open');
});
