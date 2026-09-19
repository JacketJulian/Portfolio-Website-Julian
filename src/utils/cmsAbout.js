import { portfolioData } from '../data';
import { sanitizeDrafts } from './cmsDrafts';

// Keep the current designs as the reset source, with independent theme overrides.
export const getAboutContent = (theme, drafts = []) => {
  const target = theme === 'target';
  const assets = `${process.env.PUBLIC_URL || ''}/assets`;
  const defaults = {
    sourceId: `source-about-${target ? 'target' : 'apple'}-0`,
    name: portfolioData.name,
    description: target ? 'Software Engineer | Data | Infrastructure' : portfolioData.about.description,
    image: `${assets}/${target ? 'TGT_Banner.png' : 'Julian_About.png'}`,
    mobileImage: target ? `${assets}/TGT_About_Mobile.png` : '',
    imageAlt: target ? 'About banner' : 'Julian with a family member',
    resumeLink: portfolioData.about.resumeLink,
    downloadText: portfolioData.about.downloadText,
  };
  const override = sanitizeDrafts({ about: drafts }).about.find((item) => item.sourceId === defaults.sourceId);
  return { ...defaults, ...override, _cmsOriginal: defaults };
};

export default getAboutContent;
