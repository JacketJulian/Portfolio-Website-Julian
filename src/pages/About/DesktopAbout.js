import React from 'react';
import { portfolioData } from '../../data';
import './DesktopAbout.css';
import AboutTextContent from '../../components/About/AboutTextContent';
import ResumeButton from '../../components/About/ResumeButton';
import SocialButton from '../../components/About/SocialButton';
import FloatingInterviewBadges from '../../components/About/FloatingInterviewBadges';

const DesktopAbout = ({ animationsEnabled }) => {
  return (
    <div className="about-container about-layout-desktop" id="about" data-testid="about-section">
      <FloatingInterviewBadges />
      <div className="about-content">
        <div className="about-text-wrapper">
          <div>
            <AboutTextContent 
              name={portfolioData.name}
              description={portfolioData.about.description}
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
            <div>
              <ResumeButton 
                href={portfolioData.about.resumeLink}
                text={portfolioData.about.downloadText}
              />
            </div>
          </div>
        </div>
      </div>
      <img
        className="about-bottom-portrait"
        src={`${process.env.PUBLIC_URL}/assets/Julian_About.png`}
        alt="Julian with a family member"
      />
    </div>
  );
};

export default DesktopAbout;
