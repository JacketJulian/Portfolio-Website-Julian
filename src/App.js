import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from './components/Navbar/Navbar';
import About from './pages/About/About';
import Projects from './pages/Projects/Projects';
import Experience from './pages/Experience/Experience';
import Education from './pages/Education/Education';
import AnalyticsAlert from './components/AnalyticsAlert/AnalyticsAlert';
import Footer from './components/Footer/Footer';
import TgtHeader from './components/TGT_Header/TGT_Header';
import TgtSubheader from './components/TGT_Subheader/TGT_Subheader';
import TgtMobileSubheader from './components/TGT_Subheader/TGT_MobileSubheader';
import TgtAbout from './pages/TGT_About/TGT_About';
import TgtProjects from './pages/TGT_Projects/TGT_Projects';
import TgtFooter from './pages/TGT_Footer/TGT_Footer';
import TgtExperience from './pages/TGT_Experience/TGT_Experience';
import TgtEducation from './pages/TGT_Education/TGT_Education';
import TgtProjectFull from './pages/TGT_Project_Full/TGT_Project_Full';
import DeveloperMode, { CmsDropTarget } from './components/DeveloperMode/DeveloperMode';
import CmsEditingContext from './components/DeveloperMode/CmsEditingContext';
import { portfolioData } from './data';
import './App.css';
import trackEvent from './utils/analytics';
import useCmsDrafts from './hooks/useCmsDrafts';
import usePortfolioCms from './hooks/usePortfolioCms';
import { collectionForType, createCmsDraft, isLocalHost, mergeCmsItems, sanitizeDrafts } from './utils/cmsDrafts';
import { getAboutContent } from './utils/cmsAbout';

function App() {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [theme, setTheme] = useState('apple');
  const [showTgtHeader, setShowTgtHeader] = useState(true);
  const [isWiping, setIsWiping] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [targetProjectParam, setTargetProjectParam] = useState(() => new URLSearchParams(window.location.search).get('project') || '');
  const [cmsOpen, setCmsOpen] = useState(false);
  const [cmsDraggingType, setCmsDraggingType] = useState('');
  const [cmsHoverZone, setCmsHoverZone] = useState('');
  const [cmsEditRequest, setCmsEditRequest] = useState(null);
  const isLocalDevelopment = isLocalHost(window.location.hostname) && process.env.NODE_ENV !== 'production';
  const isAdminPath = /^\/admin\/?$/.test(window.location.pathname);
  const productionCms = usePortfolioCms({ enabled: !isLocalDevelopment, isAdmin: isAdminPath });
  const cmsEnabled = isLocalDevelopment || productionCms.editorEnabled;
  const {
    drafts: cmsDrafts, saveStatus, addDraft, beginEdit, updateDraft, deleteDraft, replaceDrafts,
  } = useCmsDrafts(cmsEnabled, { persist: isLocalDevelopment });
  const [cmsHydrated, setCmsHydrated] = useState(isLocalDevelopment);
  const didHydrateProductionEditor = useRef(false);
  // The editor retains in-progress URL text; only safe values reach page components.
  const pageDrafts = useMemo(() => sanitizeDrafts(cmsDrafts), [cmsDrafts]);
  const publishedDrafts = useMemo(() => sanitizeDrafts(productionCms.publishedContent), [productionCms.publishedContent]);
  const contentDrafts = isLocalDevelopment || (productionCms.editorEnabled && cmsHydrated) ? pageDrafts : publishedDrafts;
  const cmsCanEdit = isLocalDevelopment || (productionCms.editorEnabled && cmsHydrated);
  const cmsDirty = !isLocalDevelopment && cmsCanEdit
    && JSON.stringify(pageDrafts) !== JSON.stringify(publishedDrafts);
  const aboutContent = getAboutContent(theme, contentDrafts.about);
  const previews = useMemo(() => ({
    project: createCmsDraft('project'),
    experience: createCmsDraft('experience'),
    education: createCmsDraft('education'),
  }), []);
  const previewFor = (type, zone) => cmsDraggingType === type && cmsHoverZone === zone ? previews[type] : null;
  const isFirstThemeChange = useRef(true);

  const toProjectParam = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const setProjectQueryParam = (titleOrProject, projectRecord) => {
    const record = projectRecord || (typeof titleOrProject === 'object' ? titleOrProject : null);
    const title = typeof titleOrProject === 'string' ? titleOrProject : record?.title;
    if (typeof title !== 'string') return;
    const localId = record?.id && contentDrafts.projects.some((draft) => draft.id === record.id)
      ? record.id : null;
    const params = new URLSearchParams(window.location.search);
    params.set('project', localId || toProjectParam(title));
    const queryString = params.toString();
    window.history.pushState({}, '', queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname);
    setTargetProjectParam(params.get('project') || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearProjectQueryParam = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('project');
    const queryString = params.toString();
    window.history.pushState({}, '', queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname);
    setTargetProjectParam('');
  };

  const targetProjects = mergeCmsItems('project', portfolioData.projects.projects, contentDrafts.projects);
  const selectedTargetProject = targetProjects.find((project) => (
    (project.id === targetProjectParam)
    || toProjectParam(project._cmsOriginal?.title || project.title) === targetProjectParam
  ));

  const handleCmsDrop = (type, zone) => {
    const created = addDraft(type, zone);
    if (created) {
      setCmsDraggingType('');
      setCmsHoverZone('');
    }
    return created;
  };

  const handleNavigateToSection = (typeOrZone, itemId, field) => {
    const zone = collectionForType(typeOrZone) || (['projects', 'experience', 'education'].includes(typeOrZone) ? typeOrZone : null);
    if (!zone) return;
    if (targetProjectParam) clearProjectQueryParam();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const section = document.getElementById(zone);
      if (!section) return;
      const targetListClasses = { projects: 'tgt-projects-list', experience: 'tgt-experience-row', education: 'tgt-education-row' };
      const appleListClasses = { projects: 'projects-grid-container', experience: 'experience-list', education: 'education-list' };
      const list = zone === 'about' ? section : section.querySelector(`.${theme === 'target' ? targetListClasses[zone] : appleListClasses[zone]}`);
      const aboutImage = zone === 'about' && (field === 'image' || field === 'mobileImage');
      const item = aboutImage ? section.querySelector('[data-cms-field="image"]') : itemId
        ? [section, ...section.querySelectorAll('[data-cms-id]')].find((element) => element.dataset.cmsId === itemId)
        : null;

      if (zone === 'projects' && item && list) {
        const listRect = list.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const left = list.scrollLeft + itemRect.left - listRect.left - ((listRect.width - itemRect.width) / 2);
        const previousScrollBehavior = list.style.scrollBehavior;
        list.style.scrollBehavior = 'auto';
        list.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
        requestAnimationFrame(() => { list.style.scrollBehavior = previousScrollBehavior; });
      }

      const target = item || list || section;
      let top = target.getBoundingClientRect().top + window.scrollY - 110;
      if (item && (zone !== 'about' || aboutImage)) {
        const trayTop = document.querySelector('[data-cms-tray]')?.getBoundingClientRect().top ?? window.innerHeight;
        const navSelectors = theme === 'target'
          ? ['.tgt-subheader', '.tgt-mobile-subheader']
          : ['.navbar', '.mobile-navbar'];
        const navBottom = navSelectors.reduce((bottom, selector) => {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          return rect && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
            ? Math.max(bottom, rect.bottom)
            : bottom;
        }, 0);
        const liveTop = Math.max(110, navBottom + 16);
        const liveBottom = trayTop - 16;
        const itemRect = item.getBoundingClientRect();
        top = itemRect.height > liveBottom - liveTop
          ? window.scrollY + itemRect.bottom - liveBottom
          : window.scrollY + itemRect.top - liveTop;
      }
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }));
  };

  const handleCmsModify = (type, item, options = {}) => {
    if (!cmsCanEdit || !cmsOpen || cmsDraggingType) return;
    const draft = beginEdit(type, item);
    if (!draft) return;
    setCmsEditRequest({ type, id: draft.id, field: options.field });
    setCmsOpen(true);
    // About spans a full viewport; leave the clicked image/text in place.
    if (type !== 'about') handleNavigateToSection(collectionForType(type), draft.id);
  };

  const handleCmsDraftChange = (type, id, key, value) => {
    if (!cmsCanEdit || !cmsOpen) return;
    const draftId = type === 'about' && !id ? beginEdit('about', aboutContent)?.id : id;
    if (draftId) updateDraft(type, draftId, key, value);
  };

  useEffect(() => {
    document.body.style.background = '#f5f5f7';
    trackEvent('Page View', { page: window.location.pathname });
  }, []);

  useEffect(() => {
    if (isLocalDevelopment || !productionCms.editorEnabled || didHydrateProductionEditor.current) return;
    if (replaceDrafts(productionCms.publishedContent)) {
      didHydrateProductionEditor.current = true;
      setCmsHydrated(true);
    }
  }, [isLocalDevelopment, productionCms.editorEnabled, productionCms.publishedContent, replaceDrafts]);

  useEffect(() => {
    if (isLocalDevelopment || !cmsDirty) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isLocalDevelopment, cmsDirty]);

  const handlePublish = async () => {
    const submitted = sanitizeDrafts(cmsDrafts);
    const result = await productionCms.publish(submitted);
    if (result) replaceDrafts(result.content, result.submittedContent);
  };

  useEffect(() => {
    if (theme !== 'target') return undefined;

    const handleScroll = () => {
      setShowTgtHeader(window.scrollY < 80);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [theme]);

  useEffect(() => {
    if (isFirstThemeChange.current) {
      isFirstThemeChange.current = false;
      return;
    }

    setIsWiping(true);
    const timeoutId = setTimeout(() => setIsWiping(false), 450);
    return () => clearTimeout(timeoutId);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setTargetProjectParam(params.get('project') || '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <CmsEditingContext.Provider value={cmsCanEdit && cmsOpen ? { onModify: handleCmsModify, dragging: Boolean(cmsDraggingType) } : null}>
    <MotionConfig reducedMotion={animationsEnabled ? 'never' : 'always'}>
      <div className={`App app-fade-in ${isWiping ? 'theme-wipe-active' : ''} ${cmsOpen && cmsCanEdit ? 'cms-open' : ''}`} data-cms-theme={theme}>
        {isWiping && <div className="theme-wipe" aria-hidden="true" />}
        {theme === 'apple' && (
          <Navbar
            animationsEnabled={animationsEnabled}
            onToggleAnimations={() => setAnimationsEnabled((prev) => !prev)}
            theme={theme}
            onThemeChange={setTheme}
          />
        )}
        {theme === 'apple' && (
          <>
            <About animationsEnabled={animationsEnabled} content={aboutContent} />
            {cmsCanEdit ? (
              <CmsDropTarget theme={theme} zone="experience" accepts={['experience']}>
                <Experience additionalJobs={contentDrafts.experience} cmsPreview={previewFor('experience', 'experience')} />
              </CmsDropTarget>
            ) : <Experience additionalJobs={contentDrafts.experience} />}
            {cmsCanEdit ? (
              <CmsDropTarget theme={theme} zone="education" accepts={['education']}>
                <Education additionalDegrees={contentDrafts.education} cmsPreview={previewFor('education', 'education')} />
              </CmsDropTarget>
            ) : <Education additionalDegrees={contentDrafts.education} />}
            <AnalyticsAlert />
            {cmsCanEdit ? (
              <CmsDropTarget theme={theme} zone="projects" accepts={['project']}>
                <Projects additionalProjects={contentDrafts.projects} cmsPreview={previewFor('project', 'projects')} />
              </CmsDropTarget>
            ) : <Projects additionalProjects={contentDrafts.projects} />}
            <Footer />
          </>
        )}
        {theme === 'target' && (
          <>
            {showTgtHeader && <TgtHeader />}
            {isMobileView ? (
              <TgtMobileSubheader onLogoClick={() => setTheme('apple')} />
            ) : (
              <TgtSubheader onLogoClick={() => setTheme('apple')} />
            )}
            {selectedTargetProject ? (
              <>
                <TgtProjectFull project={selectedTargetProject} onBack={clearProjectQueryParam} />
                <TgtFooter />
              </>
            ) : (
              <>
                <TgtAbout content={aboutContent} />
                {cmsCanEdit ? (
                  <CmsDropTarget theme={theme} zone="projects" accepts={['project']}>
                    <TgtProjects onViewProject={setProjectQueryParam} additionalProjects={contentDrafts.projects} cmsPreview={previewFor('project', 'projects')} />
                  </CmsDropTarget>
                ) : <TgtProjects onViewProject={setProjectQueryParam} additionalProjects={contentDrafts.projects} />}
                {cmsCanEdit ? (
                  <CmsDropTarget theme={theme} zone="experience" accepts={['experience']}>
                    <TgtExperience additionalJobs={contentDrafts.experience} cmsPreview={previewFor('experience', 'experience')} />
                  </CmsDropTarget>
                ) : <TgtExperience additionalJobs={contentDrafts.experience} />}
                {cmsCanEdit ? (
                  <CmsDropTarget theme={theme} zone="education" accepts={['education']}>
                    <TgtEducation additionalDegrees={contentDrafts.education} cmsPreview={previewFor('education', 'education')} />
                  </CmsDropTarget>
                ) : <TgtEducation additionalDegrees={contentDrafts.education} />}
                <TgtFooter />
              </>
            )}
          </>
        )}
        {(cmsCanEdit || (!isLocalDevelopment && isAdminPath && !productionCms.loading && productionCms.loadError)) && (
          <DeveloperMode
            theme={theme}
            drafts={cmsDrafts}
            isOpen={cmsOpen}
            onOpenChange={setCmsOpen}
            saveStatus={saveStatus}
            editRequest={cmsEditRequest}
            aboutContent={aboutContent}
            onDraftChange={handleCmsDraftChange}
            onDeleteDraft={deleteDraft}
            onDragStateChange={setCmsDraggingType}
            onHoverZoneChange={setCmsHoverZone}
            onPlace={handleCmsDrop}
            onNavigateToSection={handleNavigateToSection}
            mode={isLocalDevelopment ? 'local' : 'production'}
            isDirty={cmsDirty}
            publishStatus={productionCms.publishStatus}
            publishError={productionCms.publishError}
            logoutError={productionCms.logoutError}
            version={productionCms.version}
            onPublish={handlePublish}
            onLogout={productionCms.logout}
            sessionEmail={productionCms.session?.email}
            accessError={!cmsCanEdit ? productionCms.loadError : null}
          />
        )}
      </div>
    </MotionConfig>
    </CmsEditingContext.Provider>
  );
}

export default App;
