import React from 'react';
import './TGT_About.css';
import TgtButton from '../../components/tgt_button/tgt_button';
import useCmsEditable from '../../hooks/useCmsEditable';
import getAboutContent from '../../utils/cmsAbout';
import { safeUrl } from '../../utils/cmsDrafts';

const TGT_About = ({ content = getAboutContent('target') }) => {
  const { className, props } = useCmsEditable({
    type: 'about',
    theme: 'target',
    item: content,
    label: 'About section',
  });
  const image = safeUrl(content.image);
  const mobileImage = safeUrl(content.mobileImage) || image;
  const resumeLink = safeUrl(content.resumeLink);
  const backgroundStyles = {
    ...(image && { '--tgt-about-bg-desktop': `url(${JSON.stringify(image)})` }),
    ...(mobileImage && { '--tgt-about-bg-mobile': `url(${JSON.stringify(mobileImage)})` }),
  };

  const openResume = () => {
    if (resumeLink) window.open(resumeLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="tgt-about" id="about" data-testid="tgt-about">
      <div
        {...props}
        className={['tgt-about-inner', className].filter(Boolean).join(' ')}
        style={backgroundStyles}
        data-cms-field="image"
      >
        <h1 className="tgt-about-title" data-cms-field="name">{content.name}</h1>
        <p className="tgt-about-text" data-cms-field="description">{content.description}</p>
        <TgtButton
          variant="secondary"
          onClick={openResume}
          data-cms-field="resumeLink"
        >
          {content.downloadText}
        </TgtButton>
      </div>
    </section>
  );
};

export default TGT_About;
