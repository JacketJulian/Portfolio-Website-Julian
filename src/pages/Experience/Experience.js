import React from 'react';
import { portfolioData } from '../../data';
import './Experience.css';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import PortfolioItem from '../../components/PortfolioItem/PortfolioItem';
import { mergeCmsItems } from '../../utils/cmsDrafts';

const Experience = ({ additionalJobs = [], cmsPreview = null }) => {

  // Sort jobs by date in descending order (most recent first)
  const sortedJobs = [...portfolioData.experience.jobs].sort((a, b) => {
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
  const jobs = mergeCmsItems('experience', sortedJobs, additionalJobs);

  return (
    <div className="experience-container" id="experience" data-testid="experience-section">
      <SectionTitle className="experience-heading">{portfolioData.headings.experience}</SectionTitle>
      <div className="experience-list">
        {cmsPreview && <PortfolioItem type="experience" theme="apple" item={cmsPreview} className="cms-item-placeholder" data-cms-placeholder="experience" aria-hidden="true" inert={true} />}
        {jobs.map((job) => (
          <PortfolioItem type="experience" theme="apple" item={job} key={job.sourceId || job.id} />
        ))}
      </div>
    </div>
  );
};

export default Experience;
