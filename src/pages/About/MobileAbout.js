import React from 'react';
import { portfolioData } from '../../data';
import './MobileAbout.css';
import AboutTextContent from '../../components/About/AboutTextContent';
import ResumeButton from '../../components/About/ResumeButton';
import FloatingInterviewBadges from '../../components/About/FloatingInterviewBadges';

const MobileAbout = ({ animationsEnabled }) => {
  return (
    <div className="about-container about-layout-mobile" id="about" data-testid="about-section">
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
          <div className="about-mobile-actions">
            <ResumeButton 
              href={portfolioData.about.resumeLink}
              text={portfolioData.about.downloadText}
            />
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

export default MobileAbout;
