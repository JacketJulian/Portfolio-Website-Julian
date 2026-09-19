import React from 'react';
import { portfolioData } from '../../data';
import './DesktopAbout.css';
import AboutTextContent from '../../components/About/AboutTextContent';
import ResumeButton from '../../components/About/ResumeButton';
import SocialButton from '../../components/About/SocialButton';
import FloatingInterviewBadges from '../../components/About/FloatingInterviewBadges';
import useCmsEditable from '../../hooks/useCmsEditable';
import getAboutContent from '../../utils/cmsAbout';
import { safeUrl } from '../../utils/cmsDrafts';

const DesktopAbout = ({ animationsEnabled, content = getAboutContent('apple') }) => {
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
      className={['about-container', 'about-layout-desktop', className].filter(Boolean).join(' ')}
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
          <div className="about-buttons">
            <div className="social-links-about">
              {portfolioData.socialLinks
                .filter((link) => link.name !== 'GitHub')
                .map((link) => (
                  <SocialButton
                    key={link.url}
                    href={link.url}
                    name={link.name}
                  />
                ))}
            </div>
            <div data-cms-field="resumeLink">
              <ResumeButton
                href={resumeLink || undefined}
                text={content.downloadText}
              />
            </div>
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

export default DesktopAbout;
