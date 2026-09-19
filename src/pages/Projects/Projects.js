import React from 'react';
import ProjectsPage from './ProjectsPage';

const Projects = ({ additionalProjects = [], cmsPreview = null }) => {
  return <ProjectsPage additionalProjects={additionalProjects} cmsPreview={cmsPreview} />;
};

export default Projects;
