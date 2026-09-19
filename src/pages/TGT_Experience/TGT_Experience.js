import React from 'react';
import './TGT_Experience.css';
import { portfolioData } from '../../data';
import PortfolioItem from '../../components/PortfolioItem/PortfolioItem';
import { mergeCmsItems } from '../../utils/cmsDrafts';

const TGT_Experience = ({ additionalJobs = [], cmsPreview = null }) => {
  const jobs = mergeCmsItems('experience', portfolioData.experience.jobs, additionalJobs);

  return (
    <section className="tgt-experience" id="experience" data-testid="tgt-experience">
      <div className="tgt-experience-inner">
        <h2 className="tgt-experience-title">Places I've worked at</h2>
        <div className="tgt-experience-row">
          {cmsPreview && <PortfolioItem type="experience" theme="target" item={cmsPreview} className="cms-item-placeholder" data-cms-placeholder="experience" aria-hidden="true" inert={true} />}
          {jobs.map((job) => (
            <PortfolioItem type="experience" theme="target" item={job} key={job.sourceId || job.id} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TGT_Experience;
