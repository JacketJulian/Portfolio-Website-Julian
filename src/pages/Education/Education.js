import React from 'react';
import { portfolioData } from '../../data';
import './Education.css';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import PortfolioItem from '../../components/PortfolioItem/PortfolioItem';
import RelevantCoursework from '../../components/Education/RelevantCoursework';
import { mergeCmsItems } from '../../utils/cmsDrafts';

const Education = ({ additionalDegrees = [], cmsPreview = null }) => {

  // Sort degrees by date in descending order (most recent first)
  const sortedDegrees = [...portfolioData.education.degrees].sort((a, b) => {
    // Assuming date format is "YYYY - YYYY" or "YYYY"
    // Extract the end year for comparison
    const getEndYear = (dateString) => {
      const parts = dateString.split(' - ');
      const endYear = parts[parts.length - 1];
      return endYear.toLowerCase() === 'present' ? Number.MAX_SAFE_INTEGER : parseInt(endYear, 10);
    };

    const yearA = getEndYear(a.date);
    const yearB = getEndYear(b.date);

    return yearB - yearA; // Descending order
  });
  const degrees = mergeCmsItems('education', sortedDegrees, additionalDegrees);

  return (
    <div className="education-container" id="education" data-testid="education-section">
      <SectionTitle className="education-heading section-title-bubble">{portfolioData.education.title}</SectionTitle>
      <RelevantCoursework
        title={portfolioData.education.coursesTitle}
        courses={portfolioData.education.courses}
      />
      <div className="education-list">
        {cmsPreview && <PortfolioItem type="education" theme="apple" item={cmsPreview} className="cms-item-placeholder" data-cms-placeholder="education" aria-hidden="true" inert={true} />}
        {degrees.map((edu) => (
          <PortfolioItem type="education" theme="apple" item={edu} key={edu.sourceId || edu.id} />
        ))}
      </div>
    </div>
  );
};

export default Education;
