import React from 'react';
import './TGT_Education.css';
import { portfolioData } from '../../data';
import PortfolioItem from '../../components/PortfolioItem/PortfolioItem';
import { mergeCmsItems } from '../../utils/cmsDrafts';

const TGT_Education = ({ additionalDegrees = [], cmsPreview = null }) => {
  const degrees = mergeCmsItems('education', portfolioData.education.degrees, additionalDegrees);

  return (
    <section className="tgt-education" id="education" data-testid="tgt-education">
      <div className="tgt-education-inner">
        <div className="tgt-education-row">
          {cmsPreview && <PortfolioItem type="education" theme="target" item={cmsPreview} className="cms-item-placeholder" data-cms-placeholder="education" aria-hidden="true" inert={true} />}
          {degrees.map((degree) => (
            <PortfolioItem type="education" theme="target" item={degree} key={degree.sourceId || degree.id} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TGT_Education;
