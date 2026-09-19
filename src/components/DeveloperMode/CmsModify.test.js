import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CmsEditingContext from './CmsEditingContext';
import DeveloperMode from './DeveloperMode';
import PortfolioItem from '../PortfolioItem/PortfolioItem';
import useCmsDrafts from '../../hooks/useCmsDrafts';
import { CMS_DRAFT_STORAGE_KEY, collectionForType, createCmsDraft, mergeCmsItems, sanitizeDrafts } from '../../utils/cmsDrafts';
import { portfolioData } from '../../data';
import Projects from '../../pages/Projects/Projects';
import TgtProjects from '../../pages/TGT_Projects/TGT_Projects';
import Experience from '../../pages/Experience/Experience';
import TgtExperience from '../../pages/TGT_Experience/TGT_Experience';
import Education from '../../pages/Education/Education';
import TgtEducation from '../../pages/TGT_Education/TGT_Education';

jest.mock('../../utils/analytics', () => jest.fn());

const configs = {
  project: { source: portfolioData.projects.projects[0], name: 'title', field: 'Project name', apple: Projects, target: TgtProjects, prop: 'additionalProjects', testId: 'projects-section', targetId: 'tgt-projects' },
  experience: { source: portfolioData.experience.jobs[0], name: 'companyName', field: 'Company', apple: Experience, target: TgtExperience, prop: 'additionalJobs', testId: 'experience-section', targetId: 'tgt-experience' },
  education: { source: portfolioData.education.degrees[0], name: 'institutionName', field: 'Institution', apple: Education, target: TgtEducation, prop: 'additionalDegrees', testId: 'education-section', targetId: 'tgt-education' },
};

function Harness({ type, theme = 'apple', enabled = true }) {
  const { drafts, saveStatus, addDraft, beginEdit, updateDraft, deleteDraft } = useCmsDrafts(enabled);
  const [open, setOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const config = configs[type];
  const Page = config[theme];
  const onModify = (itemType, item) => {
    const draft = beginEdit(itemType, item);
    setEditRequest({ type: itemType, id: draft.id });
    setOpen(true);
  };
  return <CmsEditingContext.Provider value={enabled && open ? { onModify } : null}>
    <Page {...{ [config.prop]: sanitizeDrafts(drafts)[collectionForType(type)] }} />
    {enabled && <DeveloperMode theme={theme} drafts={drafts} saveStatus={saveStatus} editRequest={editRequest}
      isOpen={open} onOpenChange={setOpen} onDraftChange={updateDraft} onDeleteDraft={deleteDraft}
      onPlace={addDraft} onNavigateToSection={() => {}} />}
  </CmsEditingContext.Provider>;
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: jest.fn() });
});
beforeEach(() => localStorage.clear());

test.each(['apple', 'target'].flatMap((theme) => Object.keys(configs).map((type) => [theme, type])))('%s %s is editable only with the tray open, updates in place, and resets the original', async (theme, type) => {
  const config = configs[type];
  const originalName = config.source[config.name];
  render(<Harness type={type} theme={theme} />);
  const section = screen.getByTestId(theme === 'target' ? config.targetId : config.testId);
  expect(within(section).queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
  const initialCount = within(section).getAllByRole('button', { name: /^Edit / }).length;
  const item = within(section).getByRole('button', { name: `Edit ${originalName}`, exact: true });
  expect(item).toHaveClass('cms-editable');
  expect(item).toHaveAttribute('data-cms-theme', theme);
  expect(within(section).queryByText('Modify')).not.toBeInTheDocument();
  fireEvent.click(item);
  expect(screen.getByLabelText(config.field)).toHaveValue(originalName);
  await waitFor(() => expect(screen.getByLabelText(config.field)).toHaveFocus());
  fireEvent.change(screen.getByLabelText(config.field), { target: { value: 'Updated item' } });
  expect(within(section).getByText('Updated item', { exact: true })).toBeInTheDocument();
  expect(within(section).getAllByRole('button', { name: /^Edit / })).toHaveLength(initialCount);
  expect(config.source[config.name]).toBe(originalName);
  fireEvent.click(screen.getByRole('button', { name: 'Close portfolio editor' }));
  expect(within(section).queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
  expect(item).not.toHaveClass('cms-editable');
  fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
  fireEvent.click(within(section).getByRole('button', { name: 'Edit Updated item' }));
  expect(screen.getByLabelText(config.field)).toHaveValue('Updated item');
  expect(JSON.parse(localStorage.getItem(CMS_DRAFT_STORAGE_KEY))[collectionForType(type)]).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Reset changes' }));
  expect(within(section).getByText(originalName, { exact: true })).toBeInTheDocument();
  expect(within(section).getAllByRole('button', { name: /^Edit / })).toHaveLength(initialCount);
});

test('modifying an added draft reuses it and survives reload', () => {
  const draft = { ...createCmsDraft('project'), title: 'Added project' };
  localStorage.setItem(CMS_DRAFT_STORAGE_KEY, JSON.stringify({ projects: [draft] }));
  let view = render(<Harness type="project" theme="target" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Added project' }));
  fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Updated draft' } });
  expect(screen.getByRole('button', { name: 'Remove draft' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reset changes' })).not.toBeInTheDocument();
  view.unmount();
  view = render(<Harness type="project" theme="apple" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open portfolio editor' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Updated draft' }));
  expect(screen.getByLabelText('Project name')).toHaveValue('Updated draft');
  expect(JSON.parse(localStorage.getItem(CMS_DRAFT_STORAGE_KEY)).projects).toHaveLength(1);
});

test('public pages and preview-only items do not expose editing targets', () => {
  const view = render(<Harness type="project" enabled={false} />);
  expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
  view.unmount();
  render(<CmsEditingContext.Provider value={{ onModify: jest.fn() }}>
    <PortfolioItem type="project" theme="target" item={createCmsDraft('project')} editable={false} />
    <PortfolioItem type="education" theme="apple" item={createCmsDraft('education')} inert={true} />
  </CmsEditingContext.Provider>);
  expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
});

test.each(['apple', 'target'])('%s full-item editing intercepts nested project actions and supports Enter/Space', (theme) => {
  const onModify = jest.fn();
  const onViewProject = jest.fn();
  const onClick = jest.fn();
  const onKeyDown = jest.fn();
  const item = mergeCmsItems('project', [{ title: 'Existing project' }])[0];
  render(<CmsEditingContext.Provider value={{ onModify }}>
    <PortfolioItem type="project" theme={theme} item={item} onViewProject={onViewProject} onClick={onClick} onKeyDown={onKeyDown} />
  </CmsEditingContext.Provider>);
  const area = screen.getByRole('button', { name: 'Edit Existing project' });
  expect(area).toHaveClass('cms-editable');
  expect(area).toHaveAttribute('tabindex', '0');
  fireEvent.keyDown(area, { key: 'Enter' });
  fireEvent.keyDown(area, { key: ' ' });
  fireEvent.keyDown(area, { key: 'Enter', repeat: true });
  fireEvent.click(area);
  const nestedAction = within(area).getByRole('button', { name: theme === 'apple' ? 'Learn more' : 'View Project' });
  fireEvent.click(nestedAction);
  fireEvent.keyDown(nestedAction, { key: 'Enter' });
  expect(onModify).toHaveBeenCalledWith('project', item);
  expect(onModify).toHaveBeenCalledTimes(5);
  expect(onViewProject).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  expect(onKeyDown).not.toHaveBeenCalled();
});

test.each(['apple', 'target'])('%s closing edit mode restores ordinary project navigation', (theme) => {
  const onModify = jest.fn();
  const onViewProject = jest.fn();
  const item = mergeCmsItems('project', [{ title: 'Existing project' }])[0];
  const content = <PortfolioItem type="project" theme={theme} item={item} onViewProject={onViewProject} />;
  const view = render(<CmsEditingContext.Provider value={{ onModify }}>{content}</CmsEditingContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: theme === 'apple' ? 'Learn more' : 'View Project' }));
  expect(onModify).toHaveBeenCalledTimes(1);
  expect(onViewProject).not.toHaveBeenCalled();
  view.rerender(<CmsEditingContext.Provider value={null}>{content}</CmsEditingContext.Provider>);
  expect(screen.queryByRole('button', { name: 'Edit Existing project' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: theme === 'apple' ? 'Learn more' : 'View Project' }));
  expect(onViewProject).toHaveBeenCalledTimes(1);
  expect(onModify).toHaveBeenCalledTimes(1);
});

test('dragging a new component suspends existing-item editing targets', () => {
  render(<CmsEditingContext.Provider value={{ onModify: jest.fn(), dragging: true }}>
    <PortfolioItem type="education" theme="apple" item={createCmsDraft('education')} />
  </CmsEditingContext.Provider>);
  expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
});
