import React, { forwardRef } from 'react';
import ProjectImage from '../Projects/ProjectImage';
import ProjectName from '../Projects/ProjectName';
import Button from '../Button/Button';
import TgtProject from '../TGT_Project/TGT_Project';
import SectionIcon from '../SectionIcon/SectionIcon';
import SectionDescription from '../SectionDescription/SectionDescription';
import ExperienceSkills from '../Experience/ExperienceSkills';
import useCmsEditable from '../../hooks/useCmsEditable';

const targetExperienceLogos = {
  'Target Corporation': '/assets/TGT_Experience.svg',
  'The Dev Effect': '/assets/TDE_Experience.svg',
  'Southern Connecticut State University': '/assets/SCSU_Experience.svg',
};

const PortfolioItem = forwardRef(({ type, theme, item, className = '', onViewProject, editable = true, ...rootProps }, ref) => {
  const editing = useCmsEditable({ type, theme, item, editable, inert: rootProps.inert });
  if (!item) return null;

  const rootClass = (base) => [base, className, editing.className].filter(Boolean).join(' ');
  const itemRootProps = { ...rootProps, ...editing.props };
  const useOriginalLogo = !item.id || (item.sourceId && item.logo === item._cmsOriginal?.logo);
  const logo = type === 'experience' && theme === 'target'
    ? (useOriginalLogo && targetExperienceLogos[item._cmsOriginal?.companyName || item.companyName]) || item.logo
    : item.logo;

  if (theme === 'target') {
    if (type === 'project') {
      return (
        <TgtProject
          ref={ref}
          {...itemRootProps}
          className={rootClass('')}
          title={item.title}
          description={item.description}
          imageUrl={item.image}
          onViewProject={onViewProject ? (event) => onViewProject(item, 'button', event) : undefined}
        />
      );
    }

    if (type === 'experience') {
      return (
        <div {...itemRootProps} ref={ref} className={rootClass('tgt-experience-item')}>
          {logo ? <img src={logo} alt={item.companyName} className="tgt-experience-logo" /> : <div className="tgt-experience-logo portfolio-logo-placeholder" aria-hidden="true">Add logo</div>}
          <span className="tgt-experience-name">{item.companyName}</span>
        </div>
      );
    }

    if (type === 'education') {
      return (
        <div {...itemRootProps} ref={ref} className={rootClass('tgt-education-item')}>
          <div className="tgt-education-content">
            <span className="tgt-education-name">{item.institutionName}</span>
            <span className="tgt-education-degree">{item.degree}</span>
            <span className="tgt-education-date">{item.date}</span>
            <span className="tgt-education-location">{item.location}</span>
          </div>
          <div className="tgt-education-logo-wrapper">
            {logo ? <img src={logo} alt={item.institutionName} className="tgt-education-logo" /> : <div className="tgt-education-logo portfolio-logo-placeholder" aria-hidden="true">Add logo</div>}
          </div>
        </div>
      );
    }
  }

  if (theme === 'apple') {
    if (type === 'project') {
      return (
        <div {...itemRootProps} ref={ref} className={rootClass('project-card')}>
          <ProjectImage src={item.image} alt={item.title} onClick={onViewProject ? (event) => onViewProject(item, 'card', event) : undefined} />
          <div className="project-card-action">
            <Button
              variant="secondary"
              className="project-learn-more"
              onClick={onViewProject ? (event) => onViewProject(item, 'button', event) : undefined}
            >
              Learn more
            </Button>
          </div>
          <ProjectName
            title={item.title}
            style={{ fontWeight: 'bold' }}
            onClick={onViewProject ? (event) => onViewProject(item, 'card', event) : undefined}
          />
        </div>
      );
    }

    if (type === 'experience' || type === 'education') {
      const isExperience = type === 'experience';
      const name = isExperience ? item.companyName : item.institutionName;
      return (
        <div {...itemRootProps} ref={ref} className={rootClass(isExperience ? 'experience-item' : 'education-item')}>
          <div className={isExperience ? 'experience-header' : 'education-header'}>
            {logo ? <SectionIcon src={logo} alt={name} className={isExperience ? 'experience-logo' : 'education-logo'} /> : <div className={`${isExperience ? 'experience-logo' : 'education-logo'} portfolio-logo-placeholder`} aria-hidden="true">Add logo</div>}
            <SectionDescription
              title={name}
              subtitle={isExperience ? item.jobTitle : item.degree}
              date={item.date}
              location={item.location}
              className={isExperience ? 'experience-details' : 'education-details'}
              dateClassName={isExperience ? 'experience-date' : 'education-date'}
              locationClassName={isExperience ? 'experience-location' : 'education-location'}
            />
          </div>
          {isExperience && <ExperienceSkills techStack={item.techStack || []} />}
        </div>
      );
    }
  }

  return null;
});

export default PortfolioItem;
