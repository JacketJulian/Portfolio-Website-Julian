import React from 'react';
import './TGT_Project.css';
import TgtButton from '../tgt_button/tgt_button';

const TGT_Project = React.forwardRef(({
  title = 'Target Project',
  description = 'Placeholder project description.',
  imageUrl = '',
  onViewProject,
  children,
  className = '',
  ...rootProps
}, ref) => {
  return (
    <div data-testid="tgt-project" {...rootProps} ref={ref} className={`tgt-project${className ? ` ${className}` : ''}`}>
        <div className="tgt-project-container">
      {imageUrl ? (
        <img className="tgt-project-image" src={imageUrl} alt={title} loading="lazy" />
      ) : (
        <div className="tgt-project-image" aria-hidden="true" />
      )}
      <div className="tgt-project-body">
        <div className="tgt-project-text">
          <h3 className="tgt-project-title">{title}</h3>
          <p className="tgt-project-description">{description}</p>
        </div>
        <TgtButton className="tgt-project-button" onClick={onViewProject}>View Project</TgtButton>
        </div>
      </div>
      {children}
    </div>
  );
});

export default TGT_Project;
