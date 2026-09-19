import React from 'react';
import './MobileAbout.css';
import AboutTextContent from '../../components/About/AboutTextContent';
import ResumeButton from '../../components/About/ResumeButton';
import FloatingInterviewBadges from '../../components/About/FloatingInterviewBadges';
import useCmsEditable from '../../hooks/useCmsEditable';
import getAboutContent from '../../utils/cmsAbout';
import { safeUrl } from '../../utils/cmsDrafts';

const MobileAbout = ({ animationsEnabled, content = getAboutContent('apple') }) => {
  const { className, props } = useCmsEditable({
    type: 'about',
    theme: 'apple',
    item: content,
    label: 'About section',
  });
  const image = safeUrl(content.image);
  const resumeLink = safeUrl(content.resumeLink);

  return (
    <div
      {...props}
      className={['about-container', 'about-layout-mobile', className].filter(Boolean).join(' ')}
      id="about"
      data-testid="about-section"
    >
      <FloatingInterviewBadges />
      <div className="about-content">
        <div className="about-text-wrapper">
          <div>
            <AboutTextContent
              name={<span data-cms-field="name">{content.name}</span>}
              description={<span data-cms-field="description">{content.description}</span>}
              animationsEnabled={animationsEnabled}
            />
          </div>
          <div className="about-mobile-actions" data-cms-field="resumeLink">
            <ResumeButton
              href={resumeLink || undefined}
              text={content.downloadText}
            />
          </div>
        </div>
      </div>
      {image && (
        <img
          className="about-bottom-portrait"
          src={image}
          alt={content.imageAlt || content.name || 'About portrait'}
          data-cms-field="image"
        />
      )}
    </div>
  );
};

export default MobileAbout;
