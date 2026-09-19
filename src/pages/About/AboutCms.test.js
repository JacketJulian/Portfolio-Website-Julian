import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CmsEditingContext from '../../components/DeveloperMode/CmsEditingContext';
import DesktopAbout from './DesktopAbout';
import MobileAbout from './MobileAbout';

const content = {
  sourceId: 'source-about-apple-0',
  name: 'CMS Name',
  description: 'CMS description',
  image: '/assets/about.png',
  mobileImage: '',
  imageAlt: 'CMS portrait',
  resumeLink: '/resume.pdf',
  downloadText: 'Download CMS resume',
};

test.each([
  ['desktop', DesktopAbout],
  ['mobile', MobileAbout],
])('Apple %s About binds content and routes clicks to the matching editor field', (layout, Component) => {
  const onModify = jest.fn();

  render(
    <CmsEditingContext.Provider value={{ onModify }}>
      <Component animationsEnabled={false} content={content} />
    </CmsEditingContext.Provider>,
  );

  const root = screen.getByRole('button', { name: 'Edit About section' });
  expect(root).toHaveClass('about-container', `about-layout-${layout}`, 'cms-editable');
  expect(root).toHaveAttribute('data-cms-id', content.sourceId);

  fireEvent.click(screen.getByText(content.name));
  expect(onModify).toHaveBeenLastCalledWith('about', content, { field: 'name' });

  fireEvent.click(screen.getByText(content.description));
  expect(onModify).toHaveBeenLastCalledWith('about', content, { field: 'description' });

  fireEvent.click(screen.getByAltText(content.imageAlt));
  expect(onModify).toHaveBeenLastCalledWith('about', content, { field: 'image' });

  fireEvent.click(screen.getByRole('link', { name: content.downloadText }));
  expect(onModify).toHaveBeenLastCalledWith('about', content, { field: 'resumeLink' });
});

test.each([
  ['desktop', DesktopAbout],
  ['mobile', MobileAbout],
])('Apple %s About omits a blank image and does not emit an empty resume URL', (layout, Component) => {
  render(
    <Component
      animationsEnabled={false}
      content={{ ...content, image: '', resumeLink: '' }}
    />,
  );

  expect(screen.queryByAltText(content.imageAlt)).not.toBeInTheDocument();
  expect(screen.getByText(content.downloadText)).not.toHaveAttribute('href');
});
