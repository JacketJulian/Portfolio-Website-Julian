import React from 'react';
import './TGT_Projects.css';
import { portfolioData } from '../../data';
import PortfolioItem from '../../components/PortfolioItem/PortfolioItem';
import { mergeCmsItems } from '../../utils/cmsDrafts';

const TGT_Projects = ({ onViewProject, additionalProjects = [], cmsPreview = null }) => {
  const projects = mergeCmsItems('project', portfolioData.projects.projects, additionalProjects);

  return (
    <section className="tgt-projects" id="projects" data-testid="tgt-projects">
      <div className="tgt-projects-inner">
        <h2 className="tgt-projects-title">Some of my Projects</h2>
        <div className="tgt-projects-list" role="region" aria-label="Scrollable projects" tabIndex={0}>
          {cmsPreview && <PortfolioItem type="project" theme="target" item={cmsPreview} className="cms-item-placeholder" data-cms-placeholder="project" aria-hidden="true" inert={true} />}
          {projects.map((project) => (
            <PortfolioItem
              key={project.sourceId || project.id}
              type="project"
              theme="target"
              item={project}
              onViewProject={() => onViewProject && onViewProject(project.title, project)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TGT_Projects;
