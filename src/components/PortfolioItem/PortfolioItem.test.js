import React from 'react';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { portfolioData } from '../../data';
import PortfolioItem from './PortfolioItem';
import Projects from '../../pages/Projects/Projects';
import Experience from '../../pages/Experience/Experience';
import Education from '../../pages/Education/Education';
import TgtProjects from '../../pages/TGT_Projects/TGT_Projects';
import TgtExperience from '../../pages/TGT_Experience/TGT_Experience';
import TgtEducation from '../../pages/TGT_Education/TGT_Education';

jest.mock('../../utils/analytics', () => jest.fn());

const project = { id: 'project-1', title: 'Project draft', description: 'Description', image: '' };
const experience = {
  id: 'experience-1',
  companyName: 'Company draft',
  jobTitle: 'Engineer',
  date: '2026 - Present',
  location: 'Remote',
  logo: '',
  techStack: [],
};
const education = {
  id: 'education-1',
  institutionName: 'School draft',
  degree: 'Degree',
  date: '2026 - 2028',
  location: 'Remote',
  logo: '',
};

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: jest.fn(),
  });
});

afterEach(() => cleanup());

test.each([
  ['project', 'apple', project, 'project-card'],
  ['experience', 'apple', experience, 'experience-item'],
  ['education', 'apple', education, 'education-item'],
  ['project', 'target', project, 'tgt-project'],
  ['experience', 'target', experience, 'tgt-experience-item'],
  ['education', 'target', education, 'tgt-education-item'],
])('reuses the actual %s/%s item root for preview attributes', (type, theme, item, rootClass) => {
  render(
    <PortfolioItem
      type={type}
      theme={theme}
      item={item}
      className="cms-item-placeholder"
      data-cms-placeholder={type}
      data-testid="portfolio-item-root"
      aria-hidden="true"
      inert={true}
    />,
  );

  const root = screen.getByTestId('portfolio-item-root', { hidden: true });
  expect(root).toHaveClass(rootClass, 'cms-item-placeholder');
  expect(root).toHaveAttribute('data-cms-placeholder', type);
  expect(root).toHaveAttribute('data-cms-id', item.id);
  expect(root).toHaveAttribute('aria-hidden', 'true');
  expect(root).toHaveAttribute('inert');
  expect(within(root).queryByText('Add logo') !== null).toBe(type !== 'project');
});

/* eslint-disable testing-library/no-node-access, testing-library/no-container -- These parity tests intentionally inspect direct sibling order, including aria-hidden preview roots that accessible queries omit. */
test('Apple collections render preview first, newest drafts first, and retain original entries', () => {
  const projectPreview = { ...project, id: 'project-preview', title: 'Project preview' };
  const projectDrafts = [
    { ...project, id: 'project-old', title: 'Older project draft' },
    { ...project, id: 'project-new', title: 'Newest project draft' },
  ];
  let view = render(<Projects additionalProjects={projectDrafts} cmsPreview={projectPreview} />);
  const projectItems = view.container.querySelector('.projects-grid').children;

  expect(projectItems[0].getAttribute('data-cms-placeholder')).toBe('project');
  expect(projectItems[1].textContent).toContain('Newest project draft');
  expect(projectItems[2].textContent).toContain('Older project draft');
  expect(view.container.textContent).toContain(portfolioData.projects.projects[0].title);
  expect(within(view.container).getAllByRole('button', { name: /Go to item/ }).length).toBe(
    portfolioData.projects.projects.length + projectDrafts.length,
  );
  view.unmount();

  const experiencePreview = { ...experience, id: 'experience-preview', companyName: 'Experience preview' };
  const experienceDrafts = [
    { ...experience, id: 'experience-old', companyName: 'Older experience draft' },
    { ...experience, id: 'experience-new', companyName: 'Newest experience draft' },
  ];
  view = render(<Experience additionalJobs={experienceDrafts} cmsPreview={experiencePreview} />);
  const experienceItems = view.container.querySelector('.experience-list').children;

  expect(experienceItems[0].getAttribute('data-cms-placeholder')).toBe('experience');
  expect(experienceItems[1].textContent).toContain('Newest experience draft');
  expect(experienceItems[2].textContent).toContain('Older experience draft');
  expect(view.container.textContent).toContain(portfolioData.experience.jobs[0].companyName);
  view.unmount();

  const educationPreview = { ...education, id: 'education-preview', institutionName: 'Education preview' };
  const educationDrafts = [
    { ...education, id: 'education-old', institutionName: 'Older education draft' },
    { ...education, id: 'education-new', institutionName: 'Newest education draft' },
  ];
  view = render(<Education additionalDegrees={educationDrafts} cmsPreview={educationPreview} />);
  const educationItems = view.container.querySelector('.education-list').children;

  expect(educationItems[0].getAttribute('data-cms-placeholder')).toBe('education');
  expect(educationItems[1].textContent).toContain('Newest education draft');
  expect(educationItems[2].textContent).toContain('Older education draft');
  expect(view.container.textContent).toContain(portfolioData.education.degrees[0].institutionName);
});

test('Target collections render preview first, newest drafts first, and retain original entries', () => {
  const onViewProject = jest.fn();
  const projectPreview = { ...project, id: 'target-project-preview', title: 'Target project preview' };
  const projectDrafts = [
    { ...project, id: 'target-project-old', title: 'Duplicate title' },
    { ...project, id: 'target-project-new', title: 'Duplicate title' },
  ];
  let view = render(
    <TgtProjects additionalProjects={projectDrafts} cmsPreview={projectPreview} onViewProject={onViewProject} />,
  );
  const projectItems = view.container.querySelector('.tgt-projects-list').children;

  expect(projectItems[0].getAttribute('data-cms-placeholder')).toBe('project');
  expect(projectItems[1].textContent).toContain('Duplicate title');
  expect(projectItems[2].textContent).toContain('Duplicate title');
  expect(view.container.textContent).toContain(portfolioData.projects.projects[0].title);
  fireEvent.click(within(projectItems[1]).getByRole('button', { name: 'View Project' }));
  expect(onViewProject).toHaveBeenCalledWith('Duplicate title', projectDrafts[1]);
  view.unmount();

  const experiencePreview = { ...experience, id: 'target-experience-preview', companyName: 'Target experience preview' };
  const experienceDrafts = [
    { ...experience, id: 'target-experience-old', companyName: 'Older target experience' },
    { ...experience, id: 'target-experience-new', companyName: 'Newest target experience' },
  ];
  view = render(<TgtExperience additionalJobs={experienceDrafts} cmsPreview={experiencePreview} />);
  const experienceItems = view.container.querySelector('.tgt-experience-row').children;

  expect(experienceItems[0].getAttribute('data-cms-placeholder')).toBe('experience');
  expect(experienceItems[1].textContent).toContain('Newest target experience');
  expect(experienceItems[2].textContent).toContain('Older target experience');
  expect(view.container.textContent).toContain(portfolioData.experience.jobs[0].companyName);
  view.unmount();

  const educationPreview = { ...education, id: 'target-education-preview', institutionName: 'Target education preview' };
  const educationDrafts = [
    { ...education, id: 'target-education-old', institutionName: 'Older target education' },
    { ...education, id: 'target-education-new', institutionName: 'Newest target education' },
  ];
  view = render(<TgtEducation additionalDegrees={educationDrafts} cmsPreview={educationPreview} />);
  const educationItems = view.container.querySelector('.tgt-education-row').children;

  expect(educationItems[0].getAttribute('data-cms-placeholder')).toBe('education');
  expect(educationItems[1].textContent).toContain('Newest target education');
  expect(educationItems[2].textContent).toContain('Older target education');
  expect(view.container.textContent).toContain(portfolioData.education.degrees[0].institutionName);
});

test('Target experience logo mapping applies only to legacy entries', () => {
  const editedDraft = {
    ...experience,
    id: 'edited-target-draft',
    companyName: 'Target Corporation',
    logo: '/assets/custom-target-logo.svg',
  };
  const { container } = render(<TgtExperience additionalJobs={[editedDraft]} />);
  const items = container.querySelector('.tgt-experience-row').children;

  expect(items[0].querySelector('img').getAttribute('src')).toBe('/assets/custom-target-logo.svg');
  expect(items[1].querySelector('img').getAttribute('src')).toBe('/assets/TGT_Experience.svg');
});
/* eslint-enable testing-library/no-node-access, testing-library/no-container */
