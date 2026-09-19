import React from 'react';

const ProjectImage = ({ src, alt, onClick }) => {
  return (
    <div className="project-image-container" onClick={onClick}>
      {src ? <img src={src} alt={alt} className="project-image" loading="lazy" /> : <div className="project-image-empty" aria-label={`${alt} image placeholder`}>Add project image</div>}
    </div>
  );
};

export default ProjectImage;
