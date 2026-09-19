import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CmsEditingContext from '../../components/DeveloperMode/CmsEditingContext';
import TgtAbout from './TGT_About';

const content = {
  sourceId: 'source-about-target-0',
  name: 'Target CMS Name',
  description: 'Target CMS description',
  image: '/assets/target-banner.png',
  mobileImage: '',
  imageAlt: 'Target CMS banner',
  resumeLink: 'https://example.com/resume.pdf',
  downloadText: 'Download Target resume',
};

test('Target About uses the real banner root and routes every field through one item', () => {
  const onModify = jest.fn();

  render(
    <CmsEditingContext.Provider value={{ onModify }}>
      <TgtAbout content={content} />
    </CmsEditingContext.Provider>,
  );

  const root = screen.getByRole('button', { name: 'Edit About section' });
  expect(root).toHaveClass('tgt-about-inner', 'cms-editable');
  expect(root).toHaveAttribute('data-cms-id', content.sourceId);
  expect(root.style.getPropertyValue('--tgt-about-bg-desktop')).toBe('url("/assets/target-banner.png")');
  expect(root.style.getPropertyValue('--tgt-about-bg-mobile')).toBe('url("/assets/target-banner.png")');

  fireEvent.click(root);
  expect(onModify).toHaveBeenLastCalledWith('about', content, { field: 'image' });

  fireEvent.click(screen.getByText(content.name));
  expect(onModify).toHaveBeenLastCalledWith('about', content, { field: 'name' });

  fireEvent.click(screen.getByText(content.description));
  expect(onModify).toHaveBeenLastCalledWith('about', content, { field: 'description' });

  fireEvent.click(screen.getByRole('button', { name: content.downloadText }));
  expect(onModify).toHaveBeenLastCalledWith('about', content, { field: 'resumeLink' });
});

test('Target About leaves blank backgrounds unset and ignores an unsafe resume URL', () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);

  render(
    <CmsEditingContext.Provider value={{ onModify: jest.fn() }}>
      <TgtAbout
        content={{ ...content, image: '', mobileImage: '', resumeLink: 'data:text/html,unsafe' }}
      />
    </CmsEditingContext.Provider>,
  );

  const root = screen.getByRole('button', { name: 'Edit About section' });
  expect(root.style.getPropertyValue('--tgt-about-bg-desktop')).toBe('');
  expect(root.style.getPropertyValue('--tgt-about-bg-mobile')).toBe('');

  fireEvent.click(screen.getByRole('button', { name: content.downloadText }));
  expect(open).not.toHaveBeenCalled();
  open.mockRestore();
});

test('Target About safely opens the configured resume outside CMS editing', () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);

  render(<TgtAbout content={content} />);
  fireEvent.click(screen.getByRole('button', { name: content.downloadText }));

  expect(open).toHaveBeenCalledWith(content.resumeLink, '_blank', 'noopener,noreferrer');
  open.mockRestore();
});
